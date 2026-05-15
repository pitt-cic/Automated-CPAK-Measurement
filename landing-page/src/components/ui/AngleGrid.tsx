export function AngleGrid() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-30">
      <svg
        className="absolute top-0 left-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id="precision-grid"
            width="64"
            height="64"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 64 0 L 0 0 0 64"
              fill="none"
              stroke="rgba(13, 148, 136, 0.06)"
              strokeWidth="1"
            />
          </pattern>
          <pattern
            id="precision-grid-large"
            width="256"
            height="256"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 256 0 L 0 0 0 256"
              fill="none"
              stroke="rgba(13, 148, 136, 0.1)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#precision-grid)" />
        <rect width="100%" height="100%" fill="url(#precision-grid-large)" />
      </svg>

      <div
        className="absolute top-1/4 right-1/4 w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(13, 148, 136, 0.04) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.03) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}
