import { motion } from 'motion/react';

const inferenceStack = [
  { name: 'React', category: 'Frontend' },
  { name: 'Vite', category: 'Frontend' },
  { name: 'Tailwind CSS', category: 'Frontend' },
  { name: 'ONNX Runtime', category: 'Backend' },
  { name: 'Python', category: 'Backend' },
  { name: 'Lambda', category: 'AWS' },
  { name: 'API Gateway', category: 'AWS' },
  { name: 'Cognito', category: 'AWS' },
  { name: 'Amplify', category: 'AWS' },
  { name: 'AWS CDK', category: 'IaC' },
];

const trainingStack = [
  { name: 'PyTorch', category: 'ML' },
  { name: 'SageMaker', category: 'AWS' },
  { name: 'S3', category: 'AWS' },
  { name: 'Lambda', category: 'AWS' },
  { name: 'Amplify', category: 'AWS' },
];

export function TechStack() {
  return (
    <section id="tech-stack" className="section">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-semibold tracking-widest uppercase text-[var(--color-accent-teal)] mb-4 block">
            Built With
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Modern Tech Stack
          </h2>
          <p className="text-[var(--color-text-secondary)] max-w-2xl mx-auto">
            Serverless architecture that scales automatically and costs pennies
            per inference.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="card-clinical p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-accent-teal)] to-[var(--color-accent-cyan)] flex items-center justify-center">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                >
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--color-text-primary)]">
                  Training Pipeline
                </h3>
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  Model development & evaluation
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {trainingStack.map((tech) => (
                <span
                  key={tech.name}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-bg-secondary)] text-sm text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      tech.category === 'AWS'
                        ? 'bg-orange-400'
                        : 'bg-red-400'
                    }`}
                  />
                  {tech.name}
                </span>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-[var(--color-border-subtle)]">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-[var(--color-text-primary)]">
                    ~$2.50
                  </div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">
                    Per training run
                  </div>
                </div>
                <div>
                  <div className="text-lg font-bold text-[var(--color-text-primary)]">
                    15 min
                  </div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">
                    GPU training time
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="card-clinical p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-accent-teal)] to-[var(--color-accent-cyan)] flex items-center justify-center">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                >
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--color-text-primary)]">
                  Inference Application
                </h3>
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  User-facing measurement tool
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {inferenceStack.map((tech) => (
                <span
                  key={tech.name}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-bg-secondary)] text-sm text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      tech.category === 'AWS'
                        ? 'bg-orange-400'
                        : tech.category === 'Frontend'
                        ? 'bg-blue-400'
                        : tech.category === 'Backend'
                        ? 'bg-green-400'
                        : 'bg-purple-400'
                    }`}
                  />
                  {tech.name}
                </span>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-[var(--color-border-subtle)]">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-[var(--color-text-primary)]">
                    ~$0
                  </div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">
                    Monthly (free tier)
                  </div>
                </div>
                <div>
                  <div className="text-lg font-bold text-[var(--color-text-primary)]">
                    &lt;$0.001
                  </div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">
                    Per inference
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
