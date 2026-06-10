'use client';
import { motion } from 'motion/react';

/** Punto con halo pulsante: señal de presencia ("aquí / en línea"). */
export function PresencePulse({
  className,
  color = 'var(--success)',
  size = 10,
}: {
  className?: string;
  color?: string;
  size?: number;
}) {
  return (
    <span className={className} style={{ position: 'relative', display: 'inline-flex' }}>
      <motion.span
        style={{ position: 'absolute', inset: 0, borderRadius: 9999, background: color }}
        animate={{ scale: [1, 2.4], opacity: [0.45, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
      />
      <span style={{ width: size, height: size, borderRadius: 9999, background: color }} />
    </span>
  );
}
