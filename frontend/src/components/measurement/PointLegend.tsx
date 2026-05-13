export const POINT_COLORS: Record<string, string> = {
  fhc: '#FF0000', // Femoral Head - Red
  kcf: '#00FF00', // Knee (Femoral) - Green
  kct: '#32CD32', // Knee (Tibial) - Lime
  ac: '#0000FF',  // Ankle - Blue
  iu: '#FFFF00',  // Medial Upper - Yellow
  ou: '#00FFFF',  // Lateral Upper - Cyan
  il: '#FF00FF',  // Medial Lower - Magenta
  ol: '#FFA500',  // Lateral Lower - Orange
};

export const POINT_LABELS: Record<string, string> = {
  fhc: 'Femoral Head Center',
  kcf: 'Knee Center (Femoral)',
  kct: 'Knee Center (Tibial)',
  ac: 'Ankle Center',
  iu: 'Medial (Inner) Upper',
  ou: 'Lateral (Outer) Upper',
  il: 'Medial (Inner) Lower',
  ol: 'Lateral (Outer) Lower',
};

const POINT_ORDER = ['fhc', 'kcf', 'kct', 'ac', 'iu', 'ou', 'il', 'ol'];

export function PointLegend({ overlay = false }: { overlay?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${overlay ? 'bg-gray-900/50 backdrop-blur-sm' : 'bg-gray-800'}`}>
      <h3 className="text-white font-semibold text-sm mb-2">Point Legend</h3>
      <div className="space-y-1">
        {POINT_ORDER.map((key) => (
          <div key={key} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full border-2 flex-shrink-0"
              style={{
                borderColor: POINT_COLORS[key],
                backgroundColor: 'transparent',
              }}
            >
              <div
                className="w-1 h-1 rounded-full mx-auto mt-0.5"
                style={{ backgroundColor: POINT_COLORS[key] }}
              />
            </div>
            <span className="text-gray-300 text-xs">{POINT_LABELS[key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
