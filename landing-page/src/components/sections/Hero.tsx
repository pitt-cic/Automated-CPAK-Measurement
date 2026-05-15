import { motion } from 'motion/react';
import { MeasurementVisual } from '../ui/MeasurementVisual';

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1400px] h-[800px] bg-gradient-to-b from-[rgba(13,148,136,0.06)] to-transparent rounded-full blur-3xl" />

      <div className="container relative z-10 px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-6"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(13,148,136,0.08)] border border-[var(--color-border-accent)] text-sm text-[var(--color-accent-teal)] font-medium">
                <span className="w-2 h-2 rounded-full bg-[var(--color-accent-teal)] animate-pulse" />
                Open Source · MIT License
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1]"
            >
              Precision{' '}
              Knee Alignment
              <br />
              <span className="text-gradient-teal">in Seconds</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-[var(--color-text-secondary)] max-w-lg mb-8 leading-relaxed"
            >
              AI-powered CPAK measurement from long-leg radiographs. Reduce a
              15-minute manual task to seconds with{' '}
              <span className="text-[var(--color-accent-teal)] font-semibold">
                &lt;1° error
              </span>
              .
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-start gap-4 mb-12"
            >
              <a href="#demo" className="btn-primary">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Watch Demo
              </a>
              <a href="#solution" className="btn-secondary">
                How It Works
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-3 gap-6"
            >
              <div>
                <div className="text-2xl md:text-3xl font-bold text-[var(--color-text-primary)] angle-display">
                  &lt;1°
                </div>
                <div className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide">
                  Mean Error
                </div>
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-bold text-[var(--color-text-primary)] angle-display">
                  ~10s
                </div>
                <div className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide">
                  Analysis Time
                </div>
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-bold text-[var(--color-text-primary)] angle-display">
                  700K+
                </div>
                <div className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide">
                  Annual Procedures
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-accent-teal)]/10 to-[var(--color-accent-cyan)]/5 rounded-3xl blur-2xl" />
            <div className="relative bg-white/50 backdrop-blur-sm rounded-2xl p-8 border border-[var(--color-border-subtle)] shadow-lg">
              <MeasurementVisual />
              <div className="mt-6 pt-6 border-t border-[var(--color-border-subtle)]">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-text-tertiary)]">
                    8 landmarks detected
                  </span>
                  <span className="flex items-center gap-2 text-[var(--color-accent-teal)] font-medium">
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
                    Analysis Complete
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <a
          href="#problem"
          className="flex flex-col items-center gap-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-teal)] transition-colors"
        >
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <motion.svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            animate={{ y: [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </motion.svg>
        </a>
      </motion.div>
    </section>
  );
}
