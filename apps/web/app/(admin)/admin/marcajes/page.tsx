import { and, asc, desc, eq } from 'drizzle-orm';
import { Check, MapPin, Minus, ScanFace, X } from 'lucide-react';
import { checkInEvent, db, oficina } from '@kaypi/db';
import { Badge, Card, EstadoMarcaje } from '@kaypi/ui';
import type { TipoMarcaje } from '@kaypi/shared';

const CANALES = ['WEB', 'MOVIL', 'KIOSCO'] as const;

function canalVariant(canal: string): 'neutral' | 'success' | 'warning' {
  return canal === 'MOVIL' ? 'success' : canal === 'KIOSCO' ? 'warning' : 'neutral';
}

function formatoHora(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short', timeZone: tz }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function Señal({ value }: { value: boolean | null }) {
  if (value === null) return <Minus className="mx-auto size-4 text-muted-foreground/40" />;
  return value ? (
    <Check className="mx-auto size-4 text-success" />
  ) : (
    <X className="mx-auto size-4 text-destructive" />
  );
}

export default async function MarcajesPage({
  searchParams,
}: {
  searchParams: Promise<{ canal?: string; oficinaId?: string }>;
}) {
  const sp = await searchParams;
  const canal = (CANALES as readonly string[]).includes(sp.canal ?? '') ? (sp.canal as (typeof CANALES)[number]) : '';
  const oficinaId = sp.oficinaId || '';

  const conds = [];
  if (canal) conds.push(eq(checkInEvent.canal, canal));
  if (oficinaId) conds.push(eq(checkInEvent.oficinaId, oficinaId));

  const [oficinas, marcajes] = await Promise.all([
    db.query.oficina.findMany({ orderBy: [asc(oficina.nombre)] }),
    db.query.checkInEvent.findMany({
      where: conds.length ? and(...conds) : undefined,
      orderBy: [desc(checkInEvent.tsServidorUTC)],
      limit: 100,
      with: { empleado: { columns: { nombre: true } }, oficina: { columns: { nombre: true } } },
    }),
  ]);

  const selectClass =
    'h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Marcajes</h1>
        <p className="text-muted-foreground">Actividad de marcaje de todos los canales (web · móvil · kiosco), en vivo.</p>
      </div>

      <Card className="p-4">
        <form className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Canal</span>
            <select name="canal" defaultValue={canal} className={selectClass}>
              <option value="">Todos</option>
              {CANALES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Oficina</span>
            <select name="oficinaId" defaultValue={oficinaId} className={selectClass}>
              <option value="">Todas</option>
              {oficinas.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={selectClass + ' cursor-pointer bg-primary px-4 font-medium text-primary-foreground'}>
            Filtrar
          </button>
          <span className="ml-auto self-center text-sm text-muted-foreground">{marcajes.length} marcajes</span>
        </form>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b bg-secondary/40 text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Empleado</th>
              <th className="px-4 py-2.5 font-medium">Canal</th>
              <th className="px-4 py-2.5 font-medium">Tipo</th>
              <th className="px-4 py-2.5 font-medium">Hora (servidor)</th>
              <th className="px-3 py-2.5 text-center font-medium">Geo</th>
              <th className="px-3 py-2.5 text-center font-medium">Facial</th>
              <th className="px-4 py-2.5 font-medium">Flags</th>
              <th className="px-3 py-2.5 text-center font-medium">Rev.</th>
            </tr>
          </thead>
          <tbody>
            {marcajes.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  Sin marcajes para el filtro.
                </td>
              </tr>
            ) : (
              marcajes.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{m.empleado?.nombre ?? m.empleadoId}</div>
                    <div className="text-xs text-muted-foreground">{m.oficina?.nombre}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={canalVariant(m.canal)}>{m.canal}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <EstadoMarcaje tipo={m.tipo as TipoMarcaje} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{formatoHora(m.tsServidorUTC, m.tz)}</td>
                  <td className="px-3 py-3">
                    <Señal value={m.geofenceOk} />
                  </td>
                  <td className="px-3 py-3">
                    <Señal value={m.facialOk} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {m.flags.length === 0 ? (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      ) : (
                        m.flags.map((f) => (
                          <Badge key={f} variant="warning">
                            {f}
                          </Badge>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {m.revisado ? <Check className="mx-auto size-4 text-success" /> : <Minus className="mx-auto size-4 text-muted-foreground/40" />}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <p className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><MapPin className="size-3" /> Geo / <ScanFace className="size-3" /> Facial: ✓ válido · ✗ falló · — no aplica.</span>
        Los marcajes de móvil y kiosco entran por el mismo <code className="font-mono">/api/checkin</code> y aparecen aquí.
      </p>
    </div>
  );
}
