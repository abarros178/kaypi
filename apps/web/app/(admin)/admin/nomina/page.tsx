import Link from 'next/link';
import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { Settings2 } from 'lucide-react';
import { checkInEvent, db, empleado, oficina } from '@kaypi/db';
import { Badge, buttonVariants, Card } from '@kaypi/ui';
import { cn } from '@kaypi/ui/cn';
import { calcularDevengado, formatoMoneda, rangoPeriodo } from '@/lib/nomina';
import { resumenTA, type EmpleadoTA, type EventoTA } from '@/lib/reportes';
import { BotonesExport } from '../_components/botones-export';

type Periodo = 'DIARIO' | 'QUINCENAL' | 'MENSUAL';
const PERIODOS: Periodo[] = ['DIARIO', 'QUINCENAL', 'MENSUAL'];
const ETIQUETA: Record<Periodo, string> = { DIARIO: 'Diario', QUINCENAL: 'Quincenal', MENSUAL: 'Mensual' };

export default async function NominaPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; fecha?: string; oficinaId?: string }>;
}) {
  const sp = await searchParams;
  const periodo: Periodo = (PERIODOS as string[]).includes(sp.periodo ?? '')
    ? (sp.periodo as Periodo)
    : 'QUINCENAL';
  const fecha = sp.fecha || new Date().toISOString().slice(0, 10);
  const oficinaId = sp.oficinaId || '';
  const rango = rangoPeriodo(periodo, fecha);

  const desdeUTC = `${rango.desde}T00:00:00.000Z`;
  const hastaUTC = new Date(new Date(`${rango.hasta}T12:00:00Z`).getTime() + 1.5 * 86_400_000).toISOString();

  const [oficinas, empleados, eventos] = await Promise.all([
    db.query.oficina.findMany({ orderBy: [asc(oficina.nombre)] }),
    db.query.empleado.findMany({
      where: oficinaId ? eq(empleado.oficinaId, oficinaId) : undefined,
      orderBy: [asc(empleado.nombre)],
      with: {
        oficina: { columns: { nombre: true, timezone: true } },
        jornada: { columns: { tipo: true, horaEntrada: true, toleranciaRetrasoMin: true, maxHorasDiarias: true } },
        compensacion: true,
      },
    }),
    db.query.checkInEvent.findMany({
      where: and(
        gte(checkInEvent.tsServidorUTC, desdeUTC),
        lte(checkInEvent.tsServidorUTC, hastaUTC),
        oficinaId ? eq(checkInEvent.oficinaId, oficinaId) : undefined,
      ),
      columns: { empleadoId: true, tipo: true, tsServidorUTC: true },
    }),
  ]);

  const empleadosTA: EmpleadoTA[] = empleados.map((e) => ({
    id: e.id,
    nombre: e.nombre,
    oficinaNombre: e.oficina.nombre,
    tz: e.oficina.timezone,
    jornadaTipo: e.jornada?.tipo ?? null,
    horaEntrada: e.jornada?.horaEntrada ?? null,
    toleranciaRetrasoMin: e.jornada?.toleranciaRetrasoMin ?? 5,
    maxHorasDiarias: e.jornada?.maxHorasDiarias ?? 8,
  }));
  const byId = new Map(resumenTA(empleadosTA, eventos as EventoTA[], rango).map((r) => [r.empleadoId, r]));

  const filas = empleados.map((e) => {
    const r = byId.get(e.id);
    const horas = r?.horas ?? 0;
    const extra = r?.horasExtra ?? 0;
    return {
      id: e.id,
      nombre: e.nombre,
      oficina: e.oficina.nombre,
      horas,
      extra,
      dev: e.compensacion ? calcularDevengado({ horas, horasExtra: extra }, e.compensacion) : null,
    };
  });

  const totales = new Map<string, number>();
  for (const f of filas) if (f.dev) totales.set(f.dev.moneda, (totales.get(f.dev.moneda) ?? 0) + f.dev.total);

  const selectClass =
    'h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pre-nómina</h1>
        <p className="text-muted-foreground">
          Devengado del período a partir de las horas verificadas. Insumo para tu motor de nómina (bruto, sin deducciones).
        </p>
      </div>

      <Card className="p-4">
        <form className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Período</span>
            <select name="periodo" defaultValue={periodo} className={selectClass}>
              {PERIODOS.map((p) => (
                <option key={p} value={p}>
                  {ETIQUETA[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Fecha de referencia</span>
            <input type="date" name="fecha" defaultValue={fecha} className={selectClass} />
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
          <button type="submit" className={cn(buttonVariants({ variant: 'primary' }))}>
            Calcular
          </button>
          <span className="ml-auto self-center text-sm text-muted-foreground">
            {rango.etiqueta} · {rango.desde} → {rango.hasta}
          </span>
        </form>
      </Card>

      <div className="flex justify-end">
        <BotonesExport
          csvHref={`/api/export/nomina?formato=csv&periodo=${periodo}&fecha=${fecha}&oficinaId=${oficinaId}`}
          pdfHref={`/api/export/nomina?formato=pdf&periodo=${periodo}&fecha=${fecha}&oficinaId=${oficinaId}`}
        />
      </div>

      {totales.size > 0 ? (
        <div className="flex flex-wrap gap-3">
          {[...totales.entries()].map(([moneda, total]) => (
            <Card key={moneda} className="px-4 py-3">
              <div className="text-xs text-muted-foreground">Total a pagar · {moneda}</div>
              <div className="text-xl font-semibold tabular-nums">{formatoMoneda(total, moneda)}</div>
            </Card>
          ))}
        </div>
      ) : null}

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-secondary/40 text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Empleado</th>
              <th className="px-4 py-2.5 text-right font-medium">Horas</th>
              <th className="px-4 py-2.5 text-right font-medium">Extra</th>
              <th className="px-4 py-2.5 text-right font-medium">Tarifa/h</th>
              <th className="px-4 py-2.5 text-right font-medium">Ordinario</th>
              <th className="px-4 py-2.5 text-right font-medium">Extra $</th>
              <th className="px-4 py-2.5 text-right font-medium">Total</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium">{f.nombre}</div>
                  <div className="text-xs text-muted-foreground">{f.oficina}</div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{f.horas.toFixed(1)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{f.extra.toFixed(1)}</td>
                {f.dev ? (
                  <>
                    <td className="px-4 py-3 text-right tabular-nums">{formatoMoneda(f.dev.tarifa, f.dev.moneda)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatoMoneda(f.dev.ordinario, f.dev.moneda)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-success">{formatoMoneda(f.dev.extra, f.dev.moneda)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatoMoneda(f.dev.total, f.dev.moneda)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/nomina/${f.id}`}
                        className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
                        aria-label={`Editar compensación de ${f.nombre}`}
                        title="Editar tarifa"
                      >
                        <Settings2 className="size-4" />
                      </Link>
                    </td>
                  </>
                ) : (
                  <td colSpan={5} className="px-4 py-3 text-right">
                    <Link href={`/admin/nomina/${f.id}`} className="inline-flex">
                      <Badge variant="warning">Configurar tarifa</Badge>
                    </Link>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-muted-foreground">
        Devengado = horas ordinarias × tarifa + horas extra × tarifa × multiplicador. La tarifa por hora se deriva del salario mensual con {`horasMesBase`}.
      </p>
    </div>
  );
}
