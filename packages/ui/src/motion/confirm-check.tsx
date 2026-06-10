'use client';
import { motion } from 'motion/react';
import { tokens } from '../tokens';

/**
 * Check que se "dibuja" con un trazo al confirmar un marcaje.
 * El gesto central de Kaypi: presencia confirmada. Úsalo una sola vez por confirmación.
 */
export function ConfirmCheck({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      className={className}
      initial="hidden"
      animate="visible"
      aria-hidden
    >
      <motion.circle
        cx="26"
        cy="26"
        r="24"
        fill="none"
        stroke="var(--success)"
        strokeWidth="3"
        variants={{ hidden: { pathLength: 0, opacity: 0 }, visible: { pathLength: 1, opacity: 1 } }}
        transition={{ duration: 0.5, ease: tokens.motion.easing }}
      />
      <motion.path
        d="M16 27 l7 7 l14 -15"
        fill="none"
        stroke="var(--success)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{ hidden: { pathLength: 0 }, visible: { pathLength: 1 } }}
        transition={{ delay: 0.25, duration: 0.35, ease: tokens.motion.easing }}
      />
    </motion.svg>
  );
}
