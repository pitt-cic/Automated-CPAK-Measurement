import { motion } from 'motion/react';

const steps = [
  {
    number: '01',
    title: 'Image Upload',
    description:
      'Upload a long-leg radiograph (PNG, JPG, or DICOM). The system processes both legs simultaneously.',
  },
  {
    number: '02',
    title: 'Landmark Detection',
    description:
      'U-Net model analyzes the image and predicts 8 anatomical landmarks per leg with heatmap outputs.',
  },
  {
    number: '03',
    title: 'Angle Calculation',
    description:
      'System draws measurement lines along the femoral and tibial mechanical axes and computes LDFA, MPTA.',
  },
  {
    number: '04',
    title: 'Visual Verification',
    description:
      'Landmarks and lines overlay on the X-ray. Surgeons verify accuracy with a glance before accepting.',
  },
  {
    number: '05',
    title: 'Optional Refinement',
    description:
      'Drag any landmark to adjust. Angles recalculate automatically. Export annotated results.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="section">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-semibold tracking-widest uppercase text-[var(--color-accent-teal)] mb-4 block">
            The Process
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How It Works
          </h2>
        </motion.div>

        <div className="relative max-w-3xl mx-auto">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--color-accent-teal)] via-[var(--color-accent-cyan)] to-transparent hidden md:block" />

          <div className="space-y-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative flex gap-6"
              >
                <div className="hidden md:flex shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-accent-teal)] to-[var(--color-accent-cyan)] items-center justify-center text-white font-bold text-lg shadow-lg z-10">
                  {step.number}
                </div>

                <div className="flex-1 card-clinical p-6">
                  <div className="flex items-center gap-3 mb-2 md:hidden">
                    <span className="text-[var(--color-accent-teal)] font-bold">
                      {step.number}
                    </span>
                    <h3 className="font-semibold text-[var(--color-text-primary)]">
                      {step.title}
                    </h3>
                  </div>
                  <h3 className="font-semibold text-[var(--color-text-primary)] mb-2 hidden md:block">
                    {step.title}
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-4 px-6 py-4 rounded-2xl bg-[rgba(13,148,136,0.06)] border border-[var(--color-border-accent)]">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-accent-teal)"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <div className="text-left">
              <div className="text-sm font-medium text-[var(--color-text-primary)]">
                Total time: ~10 seconds
              </div>
              <div className="text-xs text-[var(--color-text-tertiary)]">
                vs. 15 minutes manual measurement
              </div>
            </div>
            <div className="text-3xl font-bold text-gradient-teal">90x</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
