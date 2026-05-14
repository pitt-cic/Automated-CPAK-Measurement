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

function getCpakType(ldfa: number | null, mpta: number | null): number | null {
  if (ldfa === null || mpta === null) return null;

  const aHKA = mpta - ldfa;
  const jlo = mpta + ldfa;

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

  return row * 3 + col + 1;
}

export function AngleDisplay({ ldfaLeft, ldfaRight, mptaLeft, mptaRight }: AngleDisplayProps) {
  const cpakLeft = getCpakType(ldfaLeft, mptaLeft);
  const cpakRight = getCpakType(ldfaRight, mptaRight);

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
            <div className="flex justify-between mt-1 pt-1 border-t border-gray-700">
              <span className="text-gray-300 text-sm">CPAK:</span>
              <span className="text-white font-mono font-bold">{cpakLeft !== null ? `Type ${cpakLeft}` : '—'}</span>
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
            <div className="flex justify-between mt-1 pt-1 border-t border-gray-700">
              <span className="text-gray-300 text-sm">CPAK:</span>
              <span className="text-white font-mono font-bold">{cpakRight !== null ? `Type ${cpakRight}` : '—'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
