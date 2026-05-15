import { motion } from 'motion/react';

export function CallToAction() {
  return (
    <section
      id="cta"
      className="section bg-gradient-to-br from-[var(--color-bg-dark)] to-[#0a1628] text-white overflow-hidden relative"
    >
      <div className="absolute inset-0 opacity-30">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="cta-grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="rgba(13, 148, 136, 0.15)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cta-grid)" />
        </svg>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[var(--color-accent-teal)] opacity-[0.03] blur-[100px]" />

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-[var(--color-accent-teal)] font-medium mb-8">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            Open Source · Ready to Deploy
          </span>

          <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
            Start Measuring{' '}
            <span className="text-gradient-teal">Today</span>
          </h2>

          <p className="text-lg text-[var(--color-text-tertiary)] mb-10 leading-relaxed">
            Deploy to your own AWS account in minutes. Full source code,
            documentation, and deployment scripts included under MIT license.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <a
              href="https://github.com/pitt-cic/Automated-CPAK-Measurement"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
              View on GitHub
            </a>
            <a
              href="https://digital.pitt.edu/cic"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-white border-white/20 hover:border-[var(--color-accent-teal)] hover:bg-white/5"
            >
              Learn About Pitt CIC
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-white/10">
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--color-accent-teal)] mb-1">
                MIT License
              </div>
              <div className="text-sm text-[var(--color-text-tertiary)]">
                Use, modify, distribute freely
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--color-accent-teal)] mb-1">
                Full Docs
              </div>
              <div className="text-sm text-[var(--color-text-tertiary)]">
                User guide & API reference
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--color-accent-teal)] mb-1">
                AWS CDK
              </div>
              <div className="text-sm text-[var(--color-text-tertiary)]">
                One-command deployment
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-16 p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-semibold text-lg mb-1">
                Have your own project idea?
              </h3>
              <p className="text-sm text-[var(--color-text-tertiary)]">
                The Pitt Cloud Innovation Center accepts project proposals from
                University of Pittsburgh staff and faculty.
              </p>
            </div>
            <a
              href="https://digital.pitt.edu/cic"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 px-6 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
            >
              Submit Your Idea →
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
