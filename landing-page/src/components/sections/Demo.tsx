import { motion } from 'motion/react';

const DEMO_VIDEO_URL = 'https://github.com/user-attachments/assets/1ece1945-87a5-4412-a676-07bc933ecec8';

export function Demo() {
  return (
    <section id="demo" className="section bg-[var(--color-bg-secondary)]">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="text-xs font-semibold tracking-widest uppercase text-[var(--color-accent-teal)] mb-4 block">
            See It In Action
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Watch the Demo
          </h2>
          <p className="text-[var(--color-text-secondary)] max-w-2xl mx-auto">
            From X-ray upload to verified measurements in under a minute.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="relative rounded-2xl overflow-hidden bg-[var(--color-bg-dark)] shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-3 bg-black/20 border-b border-white/5">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-xs text-white/40 ml-2">
                CPAK Measurement Tool
              </span>
            </div>

            <div className="relative aspect-video bg-black">
              <video
                controls
                className="w-full h-full"
                preload="metadata"
              >
                <source src={DEMO_VIDEO_URL} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-white border border-[var(--color-border-subtle)]"
            >
              <div className="w-10 h-10 rounded-lg bg-[rgba(13,148,136,0.1)] flex items-center justify-center text-[var(--color-accent-teal)]">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-[var(--color-text-primary)]">
                  Upload X-Ray
                </div>
                <div className="text-xs text-[var(--color-text-tertiary)]">
                  PNG, JPG, or DICOM
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-white border border-[var(--color-border-subtle)]"
            >
              <div className="w-10 h-10 rounded-lg bg-[rgba(13,148,136,0.1)] flex items-center justify-center text-[var(--color-accent-teal)]">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-[var(--color-text-primary)]">
                  AI Analysis
                </div>
                <div className="text-xs text-[var(--color-text-tertiary)]">
                  ~10 seconds
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-white border border-[var(--color-border-subtle)]"
            >
              <div className="w-10 h-10 rounded-lg bg-[rgba(13,148,136,0.1)] flex items-center justify-center text-[var(--color-accent-teal)]">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-[var(--color-text-primary)]">
                  Export Results
                </div>
                <div className="text-xs text-[var(--color-text-tertiary)]">
                  Annotated images
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
