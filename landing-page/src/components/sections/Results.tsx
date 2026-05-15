import { motion } from 'motion/react';
import { StatCard } from '../ui/StatCard';

const metrics = [
  {
    value: '<1°',
    label: 'Mean Angle Error',
    sublabel: 'For LDFA and MPTA measurements',
  },
  {
    value: '~1.8mm',
    label: 'Mean Keypoint Error',
    sublabel: 'Landmark detection accuracy',
  },
  {
    value: '300+',
    label: 'Training Images',
    sublabel: 'NIH Osteoarthritis Initiative data',
  },
  {
    value: '15min→10s',
    label: 'Time Reduction',
    sublabel: 'Per-patient measurement time',
  },
];

export function Results() {
  return (
    <section id="results" className="section bg-[var(--color-bg-secondary)]">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-semibold tracking-widest uppercase text-[var(--color-accent-teal)] mb-4 block">
            Validation
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Proven Accuracy
          </h2>
          <p className="text-[var(--color-text-secondary)] max-w-2xl mx-auto">
            Validated against expert measurements with results that meet clinical
            requirements.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {metrics.map((metric, index) => (
            <StatCard
              key={metric.label}
              value={metric.value}
              label={metric.label}
              sublabel={metric.sublabel}
              delay={index * 0.1}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-2xl border border-[var(--color-border-subtle)] overflow-hidden shadow-lg"
        >
          <div className="grid md:grid-cols-2">
            <div className="p-8 md:p-12">
              <h3 className="text-2xl text-[var(--color-text-primary)] mb-4">
                Training & Evaluation Pipeline
              </h3>
              <p className="text-[var(--color-text-secondary)] mb-6 leading-relaxed">
                The model was trained using AWS SageMaker, reducing training time
                from 1 hour to 15 minutes per run. Every training job produces a
                shareable evaluation report.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[rgba(13,148,136,0.1)] flex items-center justify-center text-[var(--color-accent-teal)]">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    Mean OKS, RMSE, PCK metrics
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[rgba(13,148,136,0.1)] flex items-center justify-center text-[var(--color-accent-teal)]">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    Per-keypoint breakdown analysis
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[rgba(13,148,136,0.1)] flex items-center justify-center text-[var(--color-accent-teal)]">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    Full hyperparameter logging
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[var(--color-bg-dark)] p-8 md:p-12 text-white">
              <div className="space-y-6">
                <div>
                  <div className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide mb-2">
                    Target Accuracy
                  </div>
                  <div className="text-3xl font-bold text-gradient-teal">
                    ≤1° error
                  </div>
                  <div className="text-sm text-[var(--color-text-tertiary)] mt-1">
                    Replicating experienced user measurements
                  </div>
                </div>

                <div className="h-px bg-white/10" />

                <div>
                  <div className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide mb-2">
                    Achieved
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-[var(--color-accent-teal)]">
                      ✓
                    </span>
                    <span className="text-lg">
                      Target met on test dataset
                    </span>
                  </div>
                </div>

                <div className="h-px bg-white/10" />

                <blockquote className="text-sm text-[var(--color-text-tertiary)]">
                  "Being able to kick off a 15-minute training run and have a
                  full evaluation report waiting at a URL when it finishes
                  completely changed how we worked."
                  <cite className="block text-[var(--color-accent-teal)] mt-2 text-xs">
                    — Matthew Lu, CIC Developer
                  </cite>
                </blockquote>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
