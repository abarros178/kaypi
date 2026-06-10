import Link from 'next/link';
import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { CalendarDays, List, Search } from 'lucide-react';
import { checkInEvent, db, empleado, oficina } from '@kaypi/db';
import { Badge, Button, Card } from '@kaypi/ui';
import { cn } from '@kaypi/ui/cn';
import {
  gridSemanal,
  rangoPorDefecto,
  resumenTA,
  type EmpleadoTA,
  type EventoTA,
} from '@/lib/reportes';
import { BotonesExport } from '../_components/botones-export';
import { CalendarioReportes } from './_components/calendario';

function Metric({ value, tone }: { value: number; tone: 'faltas' | 'retrasos' | 'extra' }) {
  if (value === 0) return <span className="tabular-nums text-muted-foreground">0</span>;
  const variant = tone === 'faltas' ? 'destructive' : tone === 'retrasos' ? 'warning' : 'success';
  return (
    <Badge variant={variant} className="tabular-nums">
      {tone === 'extra' ? `${value} h` : value}
    </Badge>
  );
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ oficinaId?: string; desde?: string; hasta?: string; vista?: string }>;
}) {
  const sp = await searchParams;
  const vista = sp.vista === 'calendario' ? 'calendario' : 'lista';
  const def = rangoPorDefecto(new Date().toISOString());
  const desde = sp.desde || def.desde;
  const hasta = sp.hasta || def.hasta;
  const oficinaId = sp.oficinaId || '';

  const desdeUTC = `${desde}T00:00:00.000Z`;
  const hastaUTC = new Date(new Date(`${hasta}T12:00:00Z`).getTime() + 1.5 * 86_400_000).toISOString();

  const [oficinas, empleados, eventos] = await Promise.all([
    db.query.oficina.findMany({ orderBy: [asc(oficina.nombre)] }),
    db.query.empleado.findMany({
      where: oficinaId ? eq(empleado.oficinaId, oficinaId) : undefined,
      orderBy: [asc(empleado.nombre)],
      with: {
        oficina: { columns: { nombre: true, timezone: true } },
        jornada: { columns: { tipo: true, horaEntrada: true, toleranciaRetrasoMin: true, maxHorasDiarias: true } },
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

  const resumenes = resumenTA(empleadosTA, eventos as EventoTA[], { desde, hasta });
  const grid = vista === 'calendario' ? gridSemanal(empleadosTA, eventos as EventoTA[], { desde, hasta }) : null;
  const totales = resumenes.reduce(
    (acc, r) => ({
      faltas: acc.faltas + r.faltas,
      retrasos: acc.retrasos + r.retrasos,
      horasExtra: acc.horasExtra + r.horasExtra,
    }),
    { faltas: 0, retrasos: 0, horasExtra: 0 },
  );

  const selectClass =
    'h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60';
  const qs = (v: string) => `?oficinaId=${oficinaId}&desde=${desde}&hasta=${hasta}&vista=${v}`;
  const tab = 'flex items-center gap-1.5 rounded px-3 py-1.5 text-sm transition-colors';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
          <p className="text-muted-foreground">Asistencia por empleado: faltas, retrasos y horas extra en el rango.</p>
        </div>
        <div className="flex shrink-0 rounded-md border p-0.5">
          <Link href={qs('lista')} className={cn(tab, vista === 'lista' ? 'bg-secondary font-medium' : 'text-muted-foreground hover:text-foreground')}>
            <List className="size-4" /> Lista
          </Link>
          <Link href={qs('calendario')} className={cn(tab, vista === 'calendario' ? 'bg-secondary font-medium' : 'text-muted-foreground hover:text-foreground')}>
            <CalendarDays className="size-4" /> Calendario
          </Link>
        </div>
      </div>

      <Card className="p-4">
        <form className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="vista" value={vista} />
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
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Desde</span>
            <input type="date" name="desde" defaultValue={desde} className={selectClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Hasta</span>
            <input type="date" name="hasta" defaultValue={hasta} className={selectClass} />
          </label>
          <Button type="submit">
            <Search /> Aplicar
          </Button>
        </form>
      </Card>

      <div className="flex justify-end">
        <BotonesExport
          csvHref={`/api/export/reportes?formato=csv&oficinaId=${oficinaId}&desde=${desde}&hasta=${hasta}`}
          pdfHref={`/api/export/reportes?formato=pdf&oficinaId=${oficinaId}&desde=${desde}&hasta=${hasta}`}
        />
      </div>

      {vista === 'lista' ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Faltas (total)</div>
              <div className="text-2xl font-semibold tabular-nums">{totales.faltas}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Retrasos (total)</div>
              <div className="text-2xl font-semibold tabular-nums">{totales.retrasos}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Horas extra (total)</div>
              <div className="text-2xl font-semibold tabular-nums">{Math.round(totales.horasExtra * 10) / 10}</div>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="grid grid-cols-[1.5fr_1fr_repeat(4,0.7fr)] items-center gap-2 border-b bg-secondary/40 px-4 py-2.5 text-xs font-medium text-muted-foreground">
              <div>Empleado</div>
              <div>Oficina</div>
              <div className="text-center">Días</div>
              <div className="text-center">Faltas</div>
              <div className="text-center">Retrasos</div>
              <div className="text-center">Extra</div>
            </div>
            {resumenes.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Sin empleados para el filtro.</div>
            ) : (
              resumenes.map((r) => (
                <div
                  key={r.empleadoId}
                  className="grid grid-cols-[1.5fr_1fr_repeat(4,0.7fr)] items-center gap-2 border-b px-4 py-3 text-sm last:border-0"
                >
                  <div className="truncate font-medium">{r.nombre}</div>
                  <div className="truncate text-muted-foreground">{r.oficina}</div>
                  <div className="text-center tabular-nums text-muted-foreground">{r.diasConMarcaje}</div>
                  <div className="flex justify-center">
                    <Metric value={r.faltas} tone="faltas" />
                  </div>
                  <div className="flex justify-center">
                    <Metric value={r.retrasos} tone="retrasos" />
                  </div>
                  <div className="flex justify-center">
                    <Metric value={r.horasExtra} tone="extra" />
                  </div>
                </div>
              ))
            )}
          </Card>
        </>
      ) : (
        <Card className="overflow-hidden">
          <CalendarioReportes data={grid!} />
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Faltas y retrasos aplican a jornada fija (días hábiles lun–vie). Horas extra = excedente sobre el máximo diario.
      </p>
    </div>
  );
}
