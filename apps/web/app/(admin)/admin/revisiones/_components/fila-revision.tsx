'use client';

import { useTransition } from 'react';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, EstadoMarcaje } from '@kaypi/ui';
import type { TipoMarcaje } from '@kaypi/shared';
import { aprobarMarcaje, marcarCorreccion } from '../actions';

export function FilaRevision({
  id,
  tipo,
  empleado,
  oficina,
  hora,
  flags,
}: {
  id: string;
  tipo: TipoMarcaje;
  empleado: string;
  oficina: string;
  hora: string;
  flags: string[];
}) {
  const [pending, start] = useTransition();

  function aprobar() {
    start(async () => {
      const r = await aprobarMarcaje(id);
      if (r.ok) toast.success('Marcaje aprobado');
    });
  }

  function corregir() {
    const nota = window.prompt('Nota de corrección para la auditoría:');
    if (nota == null) return;
    start(async () => {
      await marcarCorreccion(id, nota);
      toast.success('Marcado para corrección');
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <EstadoMarcaje tipo={tipo} />
        <div className="min-w-0">
          <div className="truncate font-medium">{empleado}</div>
          <div className="truncate text-xs text-muted-foreground">
            {oficina} · <span className="font-mono">{hora}</span>
          </div>
        </div>
        {flags.map((f) => (
          <Badge key={f} variant="warning">
            {f}
          </Badge>
        ))}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="outline" size="sm" onClick={corregir} disabled={pending}>
          <X className="size-4" /> Corregir
        </Button>
        <Button size="sm" onClick={aprobar} disabled={pending}>
          <Check className="size-4" /> Aprobar
        </Button>
      </div>
    </div>
  );
}
