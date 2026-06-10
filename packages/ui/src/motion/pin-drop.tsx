'use client';
import { MapPin } from 'lucide-react';
import { motion } from 'motion/react';

/** Pin que "aterriza" con rebote: ubicación / geofence confirmada. */
export function PinDrop({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <motion.span
      className={className}
      style={{ display: 'inline-flex' }}
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 18 }}
    >
      <MapPin size={size} className="text-primary" />
    </motion.span>
  );
}
