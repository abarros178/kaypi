import Image from 'next/image';
import { cn } from '@kaypi/ui/cn';

/** Logo de Kaypi (lockup oficial). Producto de Runa. */
export function KaypiMark({ className }: { className?: string }) {
  return (
    <Image
      src="/kaypi-logo.png"
      alt="Kaypi"
      width={1961}
      height={802}
      priority
      className={cn('h-7 w-auto select-none', className)}
    />
  );
}
