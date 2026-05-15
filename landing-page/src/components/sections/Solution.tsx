import { motion } from 'motion/react';

const features = [
  {
    title: 'Automated Landmark Detection',
    description:
      'U-Net neural network identifies 8 anatomical landmarks per leg: femoral head, knee centers, ankle, and joint line endpoints.',
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        <path d="M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    ),
  },
  {
    title: 'Instant Angle Calculation',
    description:
      'Computes LDFA, MPTA, and CPAK classification in seconds. What took 15 minutes now happens automatically.',
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    title: 'Human-in-the-Loop Verification',
    description:
      'Overlays landmarks directly on the X-ray. Surgeons visually confirm predictions before accepting results.',
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    title: 'Drag-to-Adjust Interface',
    description:
      'If any landmark needs refinement, drag it to the correct position. Angles recalculate automatically.',
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
      </svg>
    ),
  },
];

export function Solution() {
  return (
    <section id="solution" className="section">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-semibold tracking-widest uppercase text-[var(--color-accent-teal)] mb-4 block">
            Our Solution
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Computer Vision That Reads X-Rays
          </h2>
          <p className="text-[var(--color-text-secondary)] max-w-2xl mx-auto">
            A U-Net convolutional neural network trained on 300+ annotated
            radiographs from the NIH Osteoarthritis Initiative.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="card-clinical p-6 group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[rgba(13,148,136,0.08)] border border-[var(--color-border-accent)] flex items-center justify-center text-[var(--color-accent-teal)] group-hover:bg-[var(--color-accent-teal)] group-hover:text-white transition-all duration-300 shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--color-text-primary)] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-br from-[var(--color-bg-dark)] to-[#1a2744] rounded-2xl p-8 md:p-12 text-white"
        >
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl md:text-3xl mb-6">
                Built for Surgeons, Not Just Researchers
              </h3>
              <p className="text-[var(--color-text-tertiary)] mb-6 leading-relaxed">
                A key design principle: surgeons never have to take the output
                on faith. The solution overlays predicted landmarks and
                measurement lines directly onto the X-ray for instant visual
                verification.
              </p>
              <blockquote className="border-l-2 border-[var(--color-accent-teal)] pl-4">
                <p className="text-sm text-[var(--color-text-tertiary)]">
                  "They would see the image, say 'oh yeah, that's about the hip
                  center, that's about the knee center — looks right,' and move
                  on."
                </p>
                <cite className="text-xs text-[var(--color-accent-teal)] mt-2 block">
                  — Dr. William Anderst
                </cite>
              </blockquote>
            </div>

            <div className="relative">
              <div className="aspect-square bg-white/5 rounded-xl border border-white/10 flex items-center justify-center p-4">
                <svg
                  viewBox="0 0 200 280"
                  className="w-full h-full"
                  fill="none"
                >
                  <defs>
                    <linearGradient id="bone-gradient-small" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgba(220, 230, 240, 0.95)" />
                      <stop offset="50%" stopColor="rgba(180, 195, 210, 0.9)" />
                      <stop offset="100%" stopColor="rgba(140, 160, 180, 0.85)" />
                    </linearGradient>
                  </defs>

                  {/* Pelvis / Hip bone */}
                  <ellipse
                    cx="55"
                    cy="30"
                    rx="26"
                    ry="22"
                    fill="url(#bone-gradient-small)"
                    opacity="0.9"
                  />
                  <ellipse
                    cx="55"
                    cy="30"
                    rx="12"
                    ry="10"
                    fill="#1a1a2e"
                    opacity="0.3"
                  />

                  {/* Femur */}
                  <path
                    d="M 48 50
                       Q 60 60, 72 85
                       Q 88 110, 100 125
                       L 96 132
                       Q 108 138, 124 136
                       L 127 128
                       Q 112 105, 98 80
                       Q 82 55, 64 46
                       Z"
                    fill="url(#bone-gradient-small)"
                    opacity="0.9"
                  />

                  {/* Patella */}
                  <ellipse
                    cx="108"
                    cy="134"
                    rx="15"
                    ry="12"
                    fill="url(#bone-gradient-small)"
                    opacity="0.85"
                  />

                  {/* Tibia */}
                  <path
                    d="M 94 144
                       Q 104 152, 124 148
                       L 122 160
                       Q 120 200, 112 230
                       L 106 252
                       Q 98 260, 82 256
                       L 78 248
                       Q 84 220, 88 180
                       Q 92 155, 94 144
                       Z"
                    fill="url(#bone-gradient-small)"
                    opacity="0.9"
                  />

                  {/* Fibula */}
                  <path
                    d="M 122 152
                       Q 128 180, 126 215
                       L 122 245
                       Q 120 252, 116 250
                       L 114 242
                       Q 118 215, 120 175
                       Q 121 158, 122 152
                       Z"
                    fill="url(#bone-gradient-small)"
                    opacity="0.7"
                  />

                  {/* Ankle */}
                  <ellipse
                    cx="92"
                    cy="258"
                    rx="20"
                    ry="8"
                    fill="url(#bone-gradient-small)"
                    opacity="0.85"
                  />

                  {/* Measurement lines */}
                  <line
                    x1="55"
                    y1="30"
                    x2="108"
                    y2="130"
                    stroke="var(--color-accent-teal)"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                  <line
                    x1="108"
                    y1="140"
                    x2="92"
                    y2="255"
                    stroke="var(--color-accent-teal)"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                  <line
                    x1="65"
                    y1="135"
                    x2="145"
                    y2="135"
                    stroke="var(--color-accent-cyan)"
                    strokeWidth="1"
                    opacity="0.5"
                  />

                  {/* Landmark points */}
                  <circle cx="55" cy="30" r="5" fill="var(--color-accent-teal)" />
                  <circle cx="55" cy="30" r="2.5" fill="white" />
                  <circle cx="108" cy="130" r="5" fill="var(--color-accent-cyan)" />
                  <circle cx="108" cy="130" r="2.5" fill="white" />
                  <circle cx="108" cy="140" r="5" fill="var(--color-accent-cyan)" />
                  <circle cx="108" cy="140" r="2.5" fill="white" />
                  <circle cx="92" cy="255" r="5" fill="var(--color-accent-teal)" />
                  <circle cx="92" cy="255" r="2.5" fill="white" />

                  {/* Angle labels */}
                  <text
                    x="155"
                    y="85"
                    fill="var(--color-accent-teal)"
                    fontSize="11"
                    fontWeight="bold"
                  >
                    87.2°
                  </text>
                  <text
                    x="155"
                    y="190"
                    fill="var(--color-accent-cyan)"
                    fontSize="11"
                    fontWeight="bold"
                  >
                    86.8°
                  </text>
                </svg>
              </div>

              <div className="absolute -bottom-4 -left-4 bg-[var(--color-accent-teal)] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
                Visual verification built-in
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
