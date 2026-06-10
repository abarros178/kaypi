'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { buttonVariants } from '@kaypi/ui';
import { cn } from '@kaypi/ui/cn';
import { eliminarOficina } from '../actions';

export function EliminarOficina({ id, nombre }: { id: string; nombre: string }) {
  const [pending, start] = useTransition();

  function onClick() {
    if (!confirm(`¿Eliminar la oficina "${nombre}"? Esta acción no se puede deshacer.`)) return;
    start(async () => {
      const r = await eliminarOficina(id);
      if (r.ok) toast.success('Oficina eliminada');
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
