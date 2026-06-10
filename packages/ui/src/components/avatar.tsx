import { cn } from '../lib/cn';

/** Avatar de iniciales (sin imagen). Toma las 2 primeras palabras del nombre. */
export function Avatar({ nombre, className }: { nombre: string; className?: string }) {
  const iniciales = nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <div
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground',
        className,
      )}
      aria-hidden
    >
      {iniciales}
    </div>
  );
}
