import { motion } from 'motion/react';

interface Point {
  x: number;
  y: number;
  label: string;
}

interface MeasurementVisualProps {
  showAnimation?: boolean;
}

export function MeasurementVisual({ showAnimation = true }: MeasurementVisualProps) {
  const landmarks: Point[] = [
    { x: 80, y: 45, label: 'Hip Center' },
    { x: 150, y: 185, label: 'Knee (Femoral)' },
    { x: 150, y: 200, label: 'Knee (Tibial)' },
    { x: 130, y: 355, label: 'Ankle Center' },
  ];

  const ldfa = 87.2;
  const mpta = 86.8;

  return (
    <div className="relative w-full max-w-[320px] mx-auto">
      <svg
        viewBox="0 0 300 400"
        className="w-full h-auto"
        style={{ filter: 'drop-shadow(0 4px 20px rgba(13, 148, 136, 0.15))' }}
      >
        <defs>
          <linearGradient id="bone-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(220, 230, 240, 0.95)" />
            <stop offset="50%" stopColor="rgba(180, 195, 210, 0.9)" />
            <stop offset="100%" stopColor="rgba(140, 160, 180, 0.85)" />
          </linearGradient>
          <filter id="bone-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.2" />
          </filter>
          <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-accent-teal)" />
            <stop offset="100%" stopColor="var(--color-accent-cyan)" />
          </linearGradient>
        </defs>

        <rect
          x="0"
          y="0"
          width="300"
          height="400"
          rx="16"
          fill="#1a1a2e"
        />
        <rect
          x="0"
          y="0"
          width="300"
          height="400"
          rx="16"
          fill="url(#precision-grid)"
          opacity="0.3"
        />

        {/* Pelvis / Hip bone */}
        <ellipse
          cx="80"
          cy="50"
          rx="38"
          ry="32"
          fill="url(#bone-gradient)"
          filter="url(#bone-shadow)"
          opacity="0.9"
        />
        <ellipse
          cx="80"
          cy="50"
          rx="18"
          ry="15"
          fill="#1a1a2e"
          opacity="0.4"
        />

        {/* Femur (thigh bone) - angled inward toward knee */}
        <path
          d="M 68 78
             Q 85 90, 100 120
             Q 120 150, 135 170
             L 130 180
             Q 145 188, 168 185
             L 172 175
             Q 155 150, 140 120
             Q 120 85, 95 72
             Z"
          fill="url(#bone-gradient)"
          filter="url(#bone-shadow)"
          opacity="0.9"
        />

        {/* Knee cap (patella) */}
        <ellipse
          cx="150"
          cy="192"
          rx="22"
          ry="18"
          fill="url(#bone-gradient)"
          filter="url(#bone-shadow)"
          opacity="0.85"
        />

        {/* Tibia (shin bone) - slight angle outward */}
        <path
          d="M 132 205
             Q 145 215, 170 210
             L 168 225
             Q 165 280, 155 320
             L 148 350
             Q 138 360, 118 355
             L 112 345
             Q 120 310, 125 260
             Q 130 220, 132 205
             Z"
          fill="url(#bone-gradient)"
          filter="url(#bone-shadow)"
          opacity="0.9"
        />

        {/* Fibula (smaller bone alongside tibia) */}
        <path
          d="M 168 218
             Q 175 250, 172 300
             L 168 340
             Q 165 350, 160 348
             L 158 338
             Q 162 300, 165 250
             Q 166 225, 168 218
             Z"
          fill="url(#bone-gradient)"
          filter="url(#bone-shadow)"
          opacity="0.7"
        />

        {/* Ankle bones */}
        <ellipse
          cx="130"
          cy="360"
          rx="28"
          ry="12"
          fill="url(#bone-gradient)"
          filter="url(#bone-shadow)"
          opacity="0.85"
        />

        {showAnimation && (
          <>
            <motion.line
              x1={landmarks[0].x}
              y1={landmarks[0].y}
              x2={landmarks[1].x}
              y2={landmarks[1].y}
              stroke="url(#line-gradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
            />

            <motion.line
              x1={landmarks[2].x}
              y1={landmarks[2].y}
              x2={landmarks[3].x}
              y2={landmarks[3].y}
              stroke="url(#line-gradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
            />

            <motion.line
              x1="95"
              y1="192"
              x2="205"
              y2="192"
              stroke="rgba(6, 182, 212, 0.6)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 1.2 }}
            />

            {landmarks.map((point, index) => (
              <motion.g key={point.label}>
                <motion.circle
                  cx={point.x}
                  cy={point.y}
                  r="6"
                  fill="var(--color-accent-teal)"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.3 + index * 0.15 }}
                />
                <motion.circle
                  cx={point.x}
                  cy={point.y}
                  r="10"
                  fill="none"
                  stroke="var(--color-accent-teal)"
                  strokeWidth="1.5"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0, 0.8] }}
                  transition={{
                    duration: 2,
                    delay: 1.5 + index * 0.1,
                    repeat: Infinity,
                    repeatDelay: 1,
                  }}
                />
                <motion.circle
                  cx={point.x}
                  cy={point.y}
                  r="3"
                  fill="white"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2, delay: 0.4 + index * 0.15 }}
                />
              </motion.g>
            ))}

            <motion.g
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 1.5 }}
            >
              <rect
                x="200"
                y="110"
                width="85"
                height="36"
                rx="6"
                fill="rgba(13, 148, 136, 0.15)"
                stroke="var(--color-accent-teal)"
                strokeWidth="1"
              />
              <text
                x="242"
                y="123"
                textAnchor="middle"
                fill="var(--color-accent-cyan)"
                fontSize="9"
                fontWeight="500"
              >
                LDFA
              </text>
              <text
                x="242"
                y="139"
                textAnchor="middle"
                fill="white"
                fontSize="14"
                fontWeight="700"
                className="angle-display"
              >
                {ldfa}°
              </text>
            </motion.g>

            <motion.g
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 1.7 }}
            >
              <rect
                x="200"
                y="260"
                width="85"
                height="36"
                rx="6"
                fill="rgba(6, 182, 212, 0.15)"
                stroke="var(--color-accent-cyan)"
                strokeWidth="1"
              />
              <text
                x="242"
                y="273"
                textAnchor="middle"
                fill="var(--color-accent-cyan)"
                fontSize="9"
                fontWeight="500"
              >
                MPTA
              </text>
              <text
                x="242"
                y="289"
                textAnchor="middle"
                fill="white"
                fontSize="14"
                fontWeight="700"
                className="angle-display"
              >
                {mpta}°
              </text>
            </motion.g>
          </>
        )}
      </svg>
    </div>
  );
}
