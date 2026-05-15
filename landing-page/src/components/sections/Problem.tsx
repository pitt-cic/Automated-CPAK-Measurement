import { motion } from 'motion/react';

export function Problem() {
  return (
    <section id="problem" className="section bg-[var(--color-bg-secondary)]">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-semibold tracking-widest uppercase text-[var(--color-accent-teal)] mb-4 block">
            The Challenge
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Manual Measurements,{' '}
            <span className="text-gradient-teal">High Stakes</span>
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="space-y-6">
              <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed">
                Before every knee replacement surgery, surgeons must take a
                long-leg radiograph and manually place markers to measure
                critical alignment angles.
              </p>

              <div className="card-clinical p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-accent-teal)] to-[var(--color-accent-cyan)] flex items-center justify-center shrink-0">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">
                      15 Minutes Per Patient
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      With over 700,000 knee replacements performed annually in
                      the US and 10+ surgeons at UPMC alone, this represents a
                      significant amount of expensive clinical time spent on
                      repetitive measurement tasks.
                    </p>
                  </div>
                </div>
              </div>

              <div className="card-clinical p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-accent-teal)] to-[var(--color-accent-cyan)] flex items-center justify-center shrink-0">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="M12 8v4M12 16h.01" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">
                      Inter-Observer Variability
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Different surgeons place markers at slightly different
                      positions, introducing measurement inconsistency across
                      patients and institutions.
                    </p>
                  </div>
                </div>
              </div>

              <blockquote className="border-l-4 border-[var(--color-accent-teal)] pl-6 py-2">
                <p className="text-[var(--color-text-secondary)] mb-2">
                  "I thought, my goodness, this is something that should easily
                  be done by a computer. You're finding the center of a circle
                  and drawing a line tangent to two bones."
                </p>
                <cite className="text-sm text-[var(--color-text-tertiary)]">
                  — Dr. William Anderst, University of Pittsburgh
                </cite>
              </blockquote>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="bg-[var(--color-bg-dark)] rounded-2xl p-8 text-white">
              <h3 className="text-2xl mb-8 text-center">
                CPAK Measurements
              </h3>

              <div className="space-y-8">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[var(--color-text-tertiary)]">
                      LDFA
                    </span>
                    <span className="text-xs text-[var(--color-accent-teal)]">
                      Lateral Distal Femoral Angle
                    </span>
                  </div>
                  <div className="h-12 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
                    <span className="text-3xl font-bold angle-display">
                      87.2°
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[var(--color-text-tertiary)]">
                      MPTA
                    </span>
                    <span className="text-xs text-[var(--color-accent-cyan)]">
                      Medial Proximal Tibial Angle
                    </span>
                  </div>
                  <div className="h-12 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
                    <span className="text-3xl font-bold angle-display">
                      86.8°
                    </span>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10">
                  <p className="text-xs text-center text-[var(--color-text-tertiary)]">
                    These angles determine knee alignment classification and
                    guide surgical decisions for prosthetic joint placement.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
