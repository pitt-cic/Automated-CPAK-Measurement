import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';

interface Point {
  x: number;
  y: number;
  label: string;
  leg: 'left' | 'right';
}

interface InferenceResponse {
  points: Point[];
  metadata: {
    originalWidth: number;
    originalHeight: number;
  };
}

export default function MeasurementPage() {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayedSize, setDisplayedSize] = useState({ width: 0, height: 0 });
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setPoints([]);
    setImageFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImageDataUrl(dataUrl);

      const img = new Image();
      img.onload = () => {
        setOriginalSize({ width: img.width, height: img.height });
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64 }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error: ${response.status}`);
      }

      const data: InferenceResponse = await response.json();
      setPoints(data.points);
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

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setDisplayedSize({ width: img.clientWidth, height: img.clientHeight });
  };

  const handleLogout = () => {
    logout();
    navigate('/logout');
  };

  const scaleX = displayedSize.width / originalSize.width || 1;
  const scaleY = displayedSize.height / originalSize.height || 1;

  return (
    <div className="min-h-screen bg-offwhite">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">CPAK Measurement</h1>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-sm text-gray-600 hover:text-primary-600"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-primary-600"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Card>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                Select Image
              </Button>
              {imageFile && (
                <span className="text-sm text-gray-600">{imageFile.name}</span>
              )}
              {imageDataUrl && (
                <Button
                  variant="primary"
                  onClick={handleAnalyze}
                  isLoading={isAnalyzing}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                </Button>
              )}
            </div>

            {error && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">Error: {error}</p>
              </div>
            )}

            {imageDataUrl && (
              <div
                ref={containerRef}
                className="relative inline-block"
              >
                <img
                  src={imageDataUrl}
                  alt="Uploaded radiograph"
                  className="max-w-full max-h-[70vh] object-contain"
                  onLoad={handleImageLoad}
                />
                {points.map((point, index) => (
                  <div
                    key={`${point.label}-${point.leg}-${index}`}
                    className="absolute w-3 h-3 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                    style={{
                      left: point.x * scaleX,
                      top: point.y * scaleY,
                      backgroundColor: point.leg === 'right' ? '#3b82f6' : '#ef4444',
                    }}
                    title={`${point.label} (${point.leg})`}
                  />
                ))}
              </div>
            )}

            {points.length > 0 && (
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-2">Detected {points.length} keypoints:</p>
                <div className="flex gap-4">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-blue-500" />
                    Right leg
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    Left leg
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
