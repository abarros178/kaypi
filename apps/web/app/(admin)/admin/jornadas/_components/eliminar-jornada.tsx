'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { buttonVariants } from '@kaypi/ui';
import { cn } from '@kaypi/ui/cn';
import { eliminarJornada } from '../actions';

export function EliminarJornada({ id, nombre }: { id: string; nombre: string }) {
  const [pending, start] = useTransition();

  function onClick() {
    if (!confirm(`¿Eliminar la jornada "${nombre}"?`)) return;
    start(async () => {
      const r = await eliminarJornada(id);
      if (r.ok) toast.success('Jornada eliminada');
      else toast.error(r.error ?? 'No se pudo eliminar');
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'text-muted-foreground hover:text-destructive')}
      aria-label={`Eliminar ${nombre}`}
      title="Eliminar"
    >
      <Trash2 className="size-4" />
    </button>
  );
}
