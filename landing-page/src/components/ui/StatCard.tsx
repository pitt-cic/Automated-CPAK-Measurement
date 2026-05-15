import { motion } from 'motion/react';

interface StatCardProps {
  value: string;
  label: string;
  sublabel?: string;
  delay?: number;
}

export function StatCard({ value, label, sublabel, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="stat-box"
    >
      <div className="text-3xl md:text-4xl font-bold text-gradient-teal mb-1 angle-display">
        {value}
      </div>
      <div className="text-[var(--color-text-primary)] font-medium text-sm">
        {label}
      </div>
      {sublabel && (
        <div className="text-[var(--color-text-tertiary)] text-xs mt-1">
          {sublabel}
        </div>
      )}
    </motion.div>
  );
}
