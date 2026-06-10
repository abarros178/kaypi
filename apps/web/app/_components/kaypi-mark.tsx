import { PresencePulse } from '@kaypi/ui';
import { cn } from '@kaypi/ui/cn';

/** Wordmark de Kaypi: el nombre + un punto de presencia vivo. */
export function KaypiMark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold tracking-tight', className)}>
      <PresencePulse size={9} />
      Kaypi
    </span>
  );
}
