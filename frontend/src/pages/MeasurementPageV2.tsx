import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { PointLegend, POINT_COLORS } from '../components/measurement/PointLegend';
import { AngleDisplay } from '../components/measurement/AngleDisplay';
import { ImageControls } from '../components/measurement/ImageControls';
import { LegPoints, calculateLDFA, calculateMPTA } from '../utils/angles';
import { extendLine, distance } from '../utils/geometry';

interface MarkerVisibility {
  leftPoints: boolean;
  leftLines: boolean;
  rightPoints: boolean;
  rightLines: boolean;
}

interface KeypointData {
  x: number;
  y: number;
  label: string;
  leg: 'left' | 'right';
}

interface AllPoints {
  left: LegPoints;
  right: LegPoints;
}

interface InferenceResponse {
  points: KeypointData[];
  metadata: {
    originalWidth: number;
    originalHeight: number;
  };
}

const POINT_KEYS = ['fhc', 'kcf', 'kct', 'ac', 'iu', 'ou', 'il', 'ol'] as const;
const HIT_RADIUS = 18;
const RING_RADIUS = 10;
const CENTER_DOT_RADIUS = 3;
const LINE_EXTENSION = 50;

const LABEL_TO_KEY: Record<string, keyof LegPoints> = {
  femoral_head_center: 'fhc',
  knee_center_femoral: 'kcf',
  knee_center_tibial: 'kct',
  ankle_center: 'ac',
  inner_upper: 'iu',
  outer_upper: 'ou',
  inner_lower: 'il',
  outer_lower: 'ol',
};

function parsePoints(rawPoints: KeypointData[]): AllPoints | null {
  const left: Partial<LegPoints> = {};
  const right: Partial<LegPoints> = {};

  for (const point of rawPoints) {
    const target = point.leg === 'left' ? left : right;
    const key = LABEL_TO_KEY[point.label];
    if (key) {
      target[key] = { x: point.x, y: point.y };
    }
  }

  const hasAllPoints = (p: Partial<LegPoints>): p is LegPoints =>
    POINT_KEYS.every((k) => p[k] !== undefined);

  if (hasAllPoints(left) && hasAllPoints(right)) {
    return { left, right };
  }
  return null;
}


export default function MeasurementPageV2() {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [allPoints, setAllPoints] = useState<AllPoints | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });

  const [visibility, setVisibility] = useState<MarkerVisibility>({
    leftPoints: true,
    leftLines: true,
    rightPoints: true,
    rightLines: true,
  });
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [zoom, setZoom] = useState(100);

  const [dragging, setDragging] = useState<{ leg: 'left' | 'right'; key: keyof LegPoints } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 });

  const toggleVisibility = (key: keyof MarkerVisibility) => {
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setAllVisibility = (visible: boolean) => {
    setVisibility({
      leftPoints: visible,
      leftLines: visible,
      rightPoints: visible,
      rightLines: visible,
    });
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setAllPoints(null);
    setImageFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImageDataUrl(dataUrl);

      const img = new Image();
      img.onload = () => {
        setOriginalSize({ width: img.width, height: img.height });
        imageRef.current = img;
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageDataUrl) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const base64 = imageDataUrl.split(',')[1];
      const apiUrl = import.meta.env.VITE_API_URL;

      const response = await fetch(`${apiUrl}inference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error: ${response.status}`);
      }

      const data: InferenceResponse = await response.json();
      const parsed = parsePoints(data.points);
      if (!parsed) {
        throw new Error('Inference returned incomplete point data');
      }
      setAllPoints(parsed);
      setOriginalSize({
        width: data.metadata.originalWidth,
        height: data.metadata.originalHeight,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/logout');
  };

  const getCanvasScale = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || originalSize.width === 0) return { scaleX: 1, scaleY: 1 };
    return {
      scaleX: canvas.width / originalSize.width,
      scaleY: canvas.height / originalSize.height,
    };
  }, [originalSize]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;
    if (!canvas || !ctx || !img) return;

    const aspectRatio = img.width / img.height;
    const baseWidth = 300;
    const baseHeight = baseWidth / aspectRatio;

    const displayWidth = baseWidth * (zoom / 100);
    const displayHeight = baseHeight * (zoom / 100);

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
    ctx.filter = 'none';

    if (!allPoints) return;

    const { scaleX, scaleY } = getCanvasScale();

    const drawLeg = (_leg: 'left' | 'right', points: LegPoints, showLines: boolean, showPoints: boolean) => {
      if (showLines) {
        // Femur axis (yellow)
        ctx.strokeStyle = 'rgba(255, 255, 0, 1)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(points.fhc.x * scaleX, points.fhc.y * scaleY);
        ctx.lineTo(points.kcf.x * scaleX, points.kcf.y * scaleY);
        ctx.stroke();

        // Tibia axis (yellow)
        ctx.beginPath();
        ctx.moveTo(points.kct.x * scaleX, points.kct.y * scaleY);
        ctx.lineTo(points.ac.x * scaleX, points.ac.y * scaleY);
        ctx.stroke();

        // Upper joint line (magenta, extended)
        const upperExt = extendLine(points.iu, points.ou, LINE_EXTENSION);
        ctx.strokeStyle = 'rgba(255, 0, 255, 1)';
        ctx.beginPath();
        ctx.moveTo(upperExt.start.x * scaleX, upperExt.start.y * scaleY);
        ctx.lineTo(upperExt.end.x * scaleX, upperExt.end.y * scaleY);
        ctx.stroke();

        // Lower joint line (orange, extended)
        const lowerExt = extendLine(points.il, points.ol, LINE_EXTENSION);
        ctx.strokeStyle = 'rgba(255, 165, 0, 1)';
        ctx.beginPath();
        ctx.moveTo(lowerExt.start.x * scaleX, lowerExt.start.y * scaleY);
        ctx.lineTo(lowerExt.end.x * scaleX, lowerExt.end.y * scaleY);
        ctx.stroke();
      }

      if (showPoints) {
        // Draw points as ring + center dot
        for (const key of POINT_KEYS) {
          const pt = points[key];
          const color = POINT_COLORS[key];
          const x = pt.x * scaleX;
          const y = pt.y * scaleY;

          // Outer ring
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, RING_RADIUS, 0, Math.PI * 2);
          ctx.stroke();

          // Center dot
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, CENTER_DOT_RADIUS, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    drawLeg('left', allPoints.left, visibility.leftLines, visibility.leftPoints);
    drawLeg('right', allPoints.right, visibility.rightLines, visibility.rightPoints);
  }, [allPoints, brightness, contrast, zoom, visibility, getCanvasScale]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  const findPointAtPosition = (canvasX: number, canvasY: number) => {
    if (!allPoints) return null;
    const { scaleX, scaleY } = getCanvasScale();

    const checkLeg = (leg: 'left' | 'right', points: LegPoints, visible: boolean) => {
      if (!visible) return null;
      for (const key of POINT_KEYS) {
        const pt = points[key];
        const screenX = pt.x * scaleX;
        const screenY = pt.y * scaleY;
        if (distance({ x: canvasX, y: canvasY }, { x: screenX, y: screenY }) < HIT_RADIUS) {
          return { leg, key };
        }
      }
      return null;
    };

    return checkLeg('left', allPoints.left, visibility.leftPoints) || checkLeg('right', allPoints.right, visibility.rightPoints);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on a point first
    if (allPoints) {
      const hit = findPointAtPosition(x, y);
      if (hit) {
        setDragging(hit);
        canvas.style.cursor = 'grabbing';
        return;
      }
    }

    // Otherwise start panning if zoomed in
    if (viewport) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setScrollStart({ x: viewport.scrollLeft, y: viewport.scrollTop });
      canvas.style.cursor = 'move';
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (dragging && allPoints) {
      const { scaleX, scaleY } = getCanvasScale();
      const newX = x / scaleX;
      const newY = y / scaleY;

      setAllPoints((prev) => {
        if (!prev) return prev;
        const updated = { ...prev };
        updated[dragging.leg] = {
          ...updated[dragging.leg],
          [dragging.key]: { x: newX, y: newY },
        };
        return updated;
      });
    } else if (isPanning && viewport) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      viewport.scrollLeft = scrollStart.x - dx;
      viewport.scrollTop = scrollStart.y - dy;
    } else if (allPoints) {
      const hit = findPointAtPosition(x, y);
      canvas.style.cursor = hit ? 'grab' : 'move';
    } else {
      canvas.style.cursor = 'move';
    }
  };

  const handleMouseUp = () => {
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = allPoints ? 'default' : 'move';
    setDragging(null);
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = 'default';
    setDragging(null);
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const viewport = viewportRef.current;
    if (!viewport) return;

    const delta = e.deltaY > 0 ? -10 : 10;
    const oldZoom = zoom;
    const newZoom = Math.max(50, Math.min(2000, oldZoom + delta));

    if (newZoom === oldZoom) return;

    // Get cursor position relative to viewport
    const rect = viewport.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    // Get the point on the canvas under the cursor
    const pointX = viewport.scrollLeft + cursorX;
    const pointY = viewport.scrollTop + cursorY;

    // Calculate where that point will be after zoom
    const scale = newZoom / oldZoom;
    const newPointX = pointX * scale;
    const newPointY = pointY * scale;

    setZoom(newZoom);

    // Adjust scroll to keep cursor position over the same point
    requestAnimationFrame(() => {
      viewport.scrollLeft = newPointX - cursorX;
      viewport.scrollTop = newPointY - cursorY;
    });
  };

  const ldfaLeft = allPoints ? calculateLDFA(allPoints.left) : null;
  const ldfaRight = allPoints ? calculateLDFA(allPoints.right) : null;
  const mptaLeft = allPoints ? calculateMPTA(allPoints.left) : null;
  const mptaRight = allPoints ? calculateMPTA(allPoints.right) : null;

  const getCpakType = (aHKA: number, jlo: number): number => {
    // Columns: Varus (<-2), Neutral (-2 to +2), Valgus (>+2)
    let col: number;
    if (aHKA < -2) col = 0;
    else if (aHKA > 2) col = 2;
    else col = 1;

    // Rows: Apex Distal (<177), Neutral (177-183), Apex Proximal (>183)
    let row: number;
    if (jlo < 177) row = 0;
    else if (jlo > 183) row = 2;
    else row = 1;

    return row * 3 + col + 1; // Types 1-9
  };

  const handleExport = () => {
    const img = imageRef.current;
    if (!img || !allPoints) return;

    // Create a new canvas at original image resolution
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = img.width;
    exportCanvas.height = img.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // Draw the image with current brightness/contrast
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    ctx.drawImage(img, 0, 0);
    ctx.filter = 'none';

    const scaleX = img.width / originalSize.width;
    const scaleY = img.height / originalSize.height;

    // Scale ring/dot sizes for export resolution
    const exportRingRadius = RING_RADIUS * (img.width / 300) * 0.5;
    const exportDotRadius = CENTER_DOT_RADIUS * (img.width / 300) * 0.5;
    const exportLineWidth = 2 * (img.width / 300);

    const drawLegExport = (points: LegPoints, showLines: boolean, showPoints: boolean) => {
      if (showLines) {
        ctx.strokeStyle = 'rgba(255, 255, 0, 1)';
        ctx.lineWidth = exportLineWidth;
        ctx.beginPath();
        ctx.moveTo(points.fhc.x * scaleX, points.fhc.y * scaleY);
        ctx.lineTo(points.kcf.x * scaleX, points.kcf.y * scaleY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(points.kct.x * scaleX, points.kct.y * scaleY);
        ctx.lineTo(points.ac.x * scaleX, points.ac.y * scaleY);
        ctx.stroke();

        const upperExt = extendLine(points.iu, points.ou, LINE_EXTENSION);
        ctx.strokeStyle = 'rgba(255, 0, 255, 1)';
        ctx.beginPath();
        ctx.moveTo(upperExt.start.x * scaleX, upperExt.start.y * scaleY);
        ctx.lineTo(upperExt.end.x * scaleX, upperExt.end.y * scaleY);
        ctx.stroke();

        const lowerExt = extendLine(points.il, points.ol, LINE_EXTENSION);
        ctx.strokeStyle = 'rgba(255, 165, 0, 1)';
        ctx.beginPath();
        ctx.moveTo(lowerExt.start.x * scaleX, lowerExt.start.y * scaleY);
        ctx.lineTo(lowerExt.end.x * scaleX, lowerExt.end.y * scaleY);
        ctx.stroke();
      }

      if (showPoints) {
        for (const key of POINT_KEYS) {
          const pt = points[key];
          const color = POINT_COLORS[key];
          const x = pt.x * scaleX;
          const y = pt.y * scaleY;

          ctx.strokeStyle = color;
          ctx.lineWidth = exportLineWidth;
          ctx.beginPath();
          ctx.arc(x, y, exportRingRadius, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, exportDotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    drawLegExport(allPoints.left, visibility.leftLines, visibility.leftPoints);
    drawLegExport(allPoints.right, visibility.rightLines, visibility.rightPoints);

    // Calculate measurements
    const leftLDFA = calculateLDFA(allPoints.left);
    const leftMPTA = calculateMPTA(allPoints.left);
    const leftAHKA = leftMPTA - leftLDFA;
    const leftJLO = leftMPTA + leftLDFA;
    const leftCPAK = getCpakType(leftAHKA, leftJLO);

    const rightLDFA = calculateLDFA(allPoints.right);
    const rightMPTA = calculateMPTA(allPoints.right);
    const rightAHKA = rightMPTA - rightLDFA;
    const rightJLO = rightMPTA + rightLDFA;
    const rightCPAK = getCpakType(rightAHKA, rightJLO);

    // Draw info box at bottom center
    // Size based on smaller dimension to handle tall/narrow images
    const fontSize = Math.max(10, Math.min(img.width * 0.025, img.height * 0.008));
    const boxWidth = img.width * 0.95;
    const boxHeight = fontSize * 5.5;
    const boxX = (img.width - boxWidth) / 2;
    const boxY = img.height - boxHeight - 10;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

    ctx.fillStyle = 'white';
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';

    const colWidth = boxWidth / 2;
    const leftCenterX = boxX + colWidth / 2;
    const rightCenterX = boxX + colWidth + colWidth / 2;
    const lineHeight = fontSize * 1.2;
    let textY = boxY + fontSize + 3;

    // Right leg info (patient's right leg appears on LEFT side of screen)
    ctx.fillText('RIGHT LEG', leftCenterX, textY);
    ctx.font = `${fontSize}px sans-serif`;
    textY += lineHeight;
    ctx.fillText(`LDFA: ${rightLDFA.toFixed(1)}°  MPTA: ${rightMPTA.toFixed(1)}°`, leftCenterX, textY);
    textY += lineHeight;
    ctx.fillText(`aHKA: ${rightAHKA.toFixed(1)}°  JLO: ${rightJLO.toFixed(1)}°`, leftCenterX, textY);
    textY += lineHeight;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillText(`CPAK Type ${rightCPAK}`, leftCenterX, textY);

    // Left leg info (patient's left leg appears on RIGHT side of screen)
    textY = boxY + fontSize + 3;
    ctx.fillText('LEFT LEG', rightCenterX, textY);
    ctx.font = `${fontSize}px sans-serif`;
    textY += lineHeight;
    ctx.fillText(`LDFA: ${leftLDFA.toFixed(1)}°  MPTA: ${leftMPTA.toFixed(1)}°`, rightCenterX, textY);
    textY += lineHeight;
    ctx.fillText(`aHKA: ${leftAHKA.toFixed(1)}°  JLO: ${leftJLO.toFixed(1)}°`, rightCenterX, textY);
    textY += lineHeight;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillText(`CPAK Type ${leftCPAK}`, rightCenterX, textY);

    // Download
    const link = document.createElement('a');
    const baseName = imageFile?.name?.replace(/\.[^/.]+$/, '') || 'image';
    link.download = `${baseName}_annotated.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) => (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-gray-300 text-sm">{label}</span>
      <button
        type="button"
        onClick={onChange}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-600'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </button>
    </label>
  );

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 py-2 flex items-center justify-between">
          <h1 className="text-base font-semibold text-white">CPAK Measurement</h1>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-xs text-gray-300 hover:text-white"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs text-gray-300 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-2">
        {error && (
          <div className="p-3 rounded-lg bg-red-900/50 border border-red-700 mb-2">
            <p className="text-sm text-red-300">Error: {error}</p>
          </div>
        )}

        <div className="flex gap-4">
          <div className="flex-1 min-w-0 overflow-hidden relative">
            {imageDataUrl ? (
              <>
                <div
                  ref={viewportRef}
                  className="bg-gray-800 rounded-lg overflow-auto"
                  style={{ height: 'calc(100vh - 70px)', maxWidth: '100%' }}
                  onWheel={handleWheel}
                >
                  <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    style={{ cursor: 'move' }}
                  />
                </div>
                <div className="absolute top-2 right-2 pointer-events-none">
                  <PointLegend overlay />
                </div>
              </>
            ) : (
              <div className="bg-gray-800 rounded-lg p-8 flex items-center justify-center" style={{ height: 'calc(100vh - 70px)' }}>
                <p className="text-gray-500">Select an image to begin</p>
              </div>
            )}
          </div>

          <div className="w-64 space-y-3 flex-shrink-0">
            <div className="bg-gray-800 rounded-lg p-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button variant="secondary" className="w-full mb-2" onClick={() => fileInputRef.current?.click()}>
                Select Image
              </Button>
              {imageFile && <p className="text-xs text-gray-400 mb-2 truncate">{imageFile.name}</p>}
              {imageDataUrl && (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleAnalyze}
                  isLoading={isAnalyzing}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                </Button>
              )}
            </div>

            <div className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold text-sm">Marker Visibility</h3>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setAllVisibility(true)}
                    className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllVisibility(false)}
                    className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
                  >
                    None
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 uppercase">Left Leg</p>
                  <Toggle checked={visibility.leftPoints} onChange={() => toggleVisibility('leftPoints')} label="Points" />
                  <Toggle checked={visibility.leftLines} onChange={() => toggleVisibility('leftLines')} label="Lines" />
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 uppercase">Right Leg</p>
                  <Toggle checked={visibility.rightPoints} onChange={() => toggleVisibility('rightPoints')} label="Points" />
                  <Toggle checked={visibility.rightLines} onChange={() => toggleVisibility('rightLines')} label="Lines" />
                </div>
              </div>
            </div>

            <AngleDisplay
              ldfaLeft={ldfaLeft}
              ldfaRight={ldfaRight}
              mptaLeft={mptaLeft}
              mptaRight={mptaRight}
            />

            <ImageControls
              brightness={brightness}
              contrast={contrast}
              onBrightnessChange={setBrightness}
              onContrastChange={setContrast}
            />

            {allPoints && (
              <div className="bg-gray-800 rounded-lg p-3">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleExport}
                >
                  Export Annotated Image
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
