import { motion } from 'motion/react';
import { useState, useEffect } from 'react';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[var(--color-bg-primary)]/95 backdrop-blur-md border-b border-[var(--color-border-subtle)] shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="container flex items-center justify-between h-16 px-6">
        <a href="#" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9">
            <svg viewBox="0 0 36 36" className="w-full h-full">
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="var(--color-accent-teal)"
                strokeWidth="2"
                opacity="0.2"
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
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-teal)] transition-colors leading-tight">
              CPAK Measurement
            </span>
            <span className="text-[10px] text-[var(--color-text-tertiary)] tracking-wide uppercase">
              Automated
            </span>
          </div>
        </a>

        <div className="hidden md:flex items-center gap-8">
          <a
            href="#problem"
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent-teal)] transition-colors"
          >
            The Problem
          </a>
          <a
            href="#solution"
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent-teal)] transition-colors"
          >
            Solution
          </a>
          <a
            href="#demo"
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent-teal)] transition-colors"
          >
            Demo
          </a>
          <a
            href="#results"
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent-teal)] transition-colors"
          >
            Results
          </a>
        </div>

        <a href="#cta" className="btn-primary text-sm py-2.5 px-5">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
          View on GitHub
        </a>
      </div>
    </motion.nav>
  );
}
