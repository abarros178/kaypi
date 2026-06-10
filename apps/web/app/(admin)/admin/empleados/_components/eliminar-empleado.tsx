'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { buttonVariants } from '@kaypi/ui';
import { cn } from '@kaypi/ui/cn';
import { eliminarEmpleado } from '../actions';

export function EliminarEmpleado({ id, nombre }: { id: string; nombre: string }) {
  const [pending, start] = useTransition();

  function onClick() {
    if (!confirm(`¿Eliminar a "${nombre}"?`)) return;
    start(async () => {
      const r = await eliminarEmpleado(id);
      if (r.ok) toast.success('Empleado eliminado');
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
