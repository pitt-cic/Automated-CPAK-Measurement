interface ImageControlsProps {
  brightness: number;
  contrast: number;
  onBrightnessChange: (value: number) => void;
  onContrastChange: (value: number) => void;
}

export function ImageControls({
  brightness,
  contrast,
  onBrightnessChange,
  onContrastChange,
}: ImageControlsProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <h3 className="text-white font-semibold text-sm mb-3">Image Controls</h3>
      <div className="space-y-3">
        <div>
          <label className="flex justify-between text-gray-300 text-sm mb-1">
            <span>Brightness</span>
            <span className="text-gray-500">{brightness}%</span>
          </label>
          <input
            type="range"
            min="50"
            max="150"
            value={brightness}
            onChange={(e) => onBrightnessChange(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>
        <div>
          <label className="flex justify-between text-gray-300 text-sm mb-1">
            <span>Contrast</span>
            <span className="text-gray-500">{contrast}%</span>
          </label>
          <input
            type="range"
            min="50"
            max="150"
            value={contrast}
            onChange={(e) => onContrastChange(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>
        <p className="text-xs text-gray-500">Scroll to zoom, drag to pan</p>
      </div>
    </div>
  );
}
