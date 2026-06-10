'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { buttonVariants } from '@kaypi/ui';
import { cn } from '@kaypi/ui/cn';
import { eliminarPolitica } from '../actions';

export function EliminarPolitica({ id, oficina }: { id: string; oficina: string }) {
  const [pending, start] = useTransition();

  function onClick() {
    if (!confirm(`¿Eliminar la política de "${oficina}"?`)) return;
    start(async () => {
      const r = await eliminarPolitica(id);
      if (r.ok) toast.success('Política eliminada');
      else toast.error(r.error ?? 'No se pudo eliminar');
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'text-muted-foreground hover:text-destructive')}
      aria-label={`Eliminar política de ${oficina}`}
      title="Eliminar"
    >
      <Trash2 className="size-4" />
    </button>
  );
}
