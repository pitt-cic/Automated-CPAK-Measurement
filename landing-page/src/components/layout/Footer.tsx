import { motion } from 'motion/react';

export function Footer() {
  return (
    <footer className="bg-[var(--color-bg-dark)] text-[var(--color-text-inverse)] py-16">
      <div className="container px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12"
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-8 h-8">
                <svg viewBox="0 0 36 36" className="w-full h-full">
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="var(--color-accent-teal)"
                    strokeWidth="2"
                    opacity="0.3"
                  />
                  <path
                    d="M 18 6 L 18 18 L 28 24"
                    fill="none"
                    stroke="var(--color-accent-teal)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="18" cy="18" r="3" fill="var(--color-accent-teal)" />
                </svg>
              </div>
              <span className="font-semibold">Automated CPAK Measurement</span>
            </div>
            <p className="text-sm text-[var(--color-text-tertiary)] mb-6">
              An open-source AI tool for automated knee alignment measurement,
              developed by the University of Pittsburgh Cloud Innovation Center.
            </p>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--color-text-tertiary)]">
                Powered by AWS
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4 text-[var(--color-accent-teal)]">
              Development Team
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://www.linkedin.com/in/gary-farrell/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-teal-light)] transition-colors"
                >
                  Gary Farrell
                </a>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/in/matthewlu2/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-teal-light)] transition-colors"
                >
                  Matthew Lu
                </a>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/in/eric-poplavsky/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-teal-light)] transition-colors"
                >
                  Eric Poplavsky
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4 text-[var(--color-accent-teal)]">
              Project Leadership
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://www.linkedin.com/in/maciejzukowski/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-teal-light)] transition-colors"
                >
                  Maciej Zukowski
                </a>
                <span className="text-xs text-[var(--color-text-tertiary)] block">
                  Technical Lead, AWS
                </span>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/in/kate-ulreich-0a8902134/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-teal-light)] transition-colors"
                >
                  Kate Ulreich
                </a>
                <span className="text-xs text-[var(--color-text-tertiary)] block">
                  Program Manager, Pitt CIC
                </span>
              </li>
              <li>
                <a
                  href="https://www.orthonet.pitt.edu/people/william-j-anderst-phd"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-teal-light)] transition-colors"
                >
                  Dr. William Anderst
                </a>
                <span className="text-xs text-[var(--color-text-tertiary)] block">
                  Project Sponsor, Pitt Orthopaedics
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4 text-[var(--color-accent-teal)]">
              Resources
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com/pitt-cic/Automated-CPAK-Measurement"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-teal-light)] transition-colors"
                >
                  GitHub Repository
                </a>
              </li>
              <li>
                <a
                  href="https://digital.pitt.edu/cic"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-teal-light)] transition-colors"
                >
                  Pitt CIC
                </a>
              </li>
              <li>
                <a
                  href="https://nda.nih.gov/oai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-teal-light)] transition-colors"
                >
                  NIH OAI Dataset
                </a>
              </li>
            </ul>
          </div>
        </motion.div>

        <div className="pt-8 border-t border-white/10">
          <p className="text-xs text-[var(--color-text-tertiary)] text-center">
            © {new Date().getFullYear()} University of Pittsburgh Health Sciences
            and Sports Analytics Cloud Innovation Center. Open source under MIT
            License.
          </p>
        </div>
      </div>
    </footer>
  );
}
