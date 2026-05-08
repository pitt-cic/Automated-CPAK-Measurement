interface AngleDisplayProps {
  ldfaLeft: number | null;
  ldfaRight: number | null;
  mptaLeft: number | null;
  mptaRight: number | null;
}

function formatAngle(value: number | null): string {
  if (value === null) return '—';
  return `${value.toFixed(1)}°`;
}

export function AngleDisplay({ ldfaLeft, ldfaRight, mptaLeft, mptaRight }: AngleDisplayProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-white font-semibold mb-3">Angles</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-gray-400 text-xs uppercase mb-2">Left Leg</h4>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-300 text-sm">LDFA:</span>
              <span className="text-white font-mono">{formatAngle(ldfaLeft)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300 text-sm">MPTA:</span>
              <span className="text-white font-mono">{formatAngle(mptaLeft)}</span>
            </div>
          </div>
        </div>
        <div>
          <h4 className="text-gray-400 text-xs uppercase mb-2">Right Leg</h4>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-300 text-sm">LDFA:</span>
              <span className="text-white font-mono">{formatAngle(ldfaRight)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300 text-sm">MPTA:</span>
              <span className="text-white font-mono">{formatAngle(mptaRight)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
