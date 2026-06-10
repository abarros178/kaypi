'use client';
import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { tokens } from '../tokens';

/** Entrada sutil de página (fade + rise). Una transición con propósito, no decorativa. */
export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: tokens.motion.duracion.base, ease: tokens.motion.easing }}
    >
      {children}
    </motion.div>
  );
}
