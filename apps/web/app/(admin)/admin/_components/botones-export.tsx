import { Download } from 'lucide-react';
import { buttonVariants } from '@kaypi/ui';
import { cn } from '@kaypi/ui/cn';

/** Botones de descarga (CSV/PDF) que apuntan a un route handler de export. */
export function BotonesExport({ csvHref, pdfHref }: { csvHref: string; pdfHref: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1 text-sm text-muted-foreground">
        <Download className="size-3.5" /> Exportar
      </span>
      <a href={csvHref} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
        CSV
      </a>
      <a href={pdfHref} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
        PDF
      </a>
    </div>
  );
}
