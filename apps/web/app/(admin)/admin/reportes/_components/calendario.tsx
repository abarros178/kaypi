import { cn } from '@kaypi/ui/cn';
import type { Calendario, EstadoDia } from '@/lib/reportes';

const ESTILO: Record<EstadoDia, { cls: string; label: string }> = {
  TRABAJADO: { cls: 'bg-success/15 text-success', label: '✓' },
  RETRASO: { cls: 'bg-warning/15 text-warning', label: 'R' },
  FALTA: { cls: 'bg-destructive/15 text-destructive', label: 'F' },
  EXTRA: { cls: 'bg-primary/15 text-primary', label: '+' },
  LIBRE: { cls: 'text-muted-foreground/30', label: '·' },
};

const DOW = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
function encabezado(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  return `${DOW[d.getUTCDay()]}${fecha.slice(8)}`;
}

const LEYENDA: Array<[EstadoDia, string]> = [
  ['TRABAJADO', 'Trabajado'],
  ['RETRASO', 'Retraso'],
  ['FALTA', 'Falta'],
  ['EXTRA', 'Horas extra'],
];

export function CalendarioReportes({ data }: { data: Calendario }) {
  if (data.filas.length === 0) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Sin empleados para el filtro.</div>;
  }
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="px-4 py-2.5 text-left font-medium">Empleado</th>
              {data.dias.map((d) => (
                <th key={d} className="px-2 py-2.5 text-center font-mono font-medium">
                  {encabezado(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.filas.map((f) => (
              <tr key={f.empleadoId} className="border-b last:border-0">
                <td className="px-4 py-2">
                  <div className="font-medium">{f.nombre}</div>
                  <div className="text-xs text-muted-foreground">{f.oficina}</div>
                </td>
                {data.dias.map((d) => {
                  const e = ESTILO[f.dias[d] ?? 'LIBRE'];
                  return (
                    <td key={d} className="px-2 py-2 text-center">
                      <span className={cn('inline-flex size-7 items-center justify-center rounded-md text-xs font-medium', e.cls)}>
                        {e.label}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-4 border-t p-4 text-xs text-muted-foreground">
        {LEYENDA.map(([estado, txt]) => (
          <span key={estado} className="flex items-center gap-1.5">
            <span className={cn('inline-flex size-5 items-center justify-center rounded text-[10px] font-medium', ESTILO[estado].cls)}>
              {ESTILO[estado].label}
            </span>
            {txt}
          </span>
        ))}
      </div>
    </div>
  );
}
