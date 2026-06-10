import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { checkInEvent, db, empleado } from '@kaypi/db';
import { csvResponse, pdfResponse, toCSV } from '@/lib/export';
import { calcularDevengado, formatoMoneda, rangoPeriodo } from '@/lib/nomina';
import { renderTablaPDF } from '@/lib/pdf/tabla-pdf';
import { resumenTA, type EmpleadoTA, type EventoTA } from '@/lib/reportes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const formato = searchParams.get('formato') === 'pdf' ? 'pdf' : 'csv';
  const oficinaId = searchParams.get('oficinaId') || '';
  const periodoParam = searchParams.get('periodo');
  const periodo: 'DIARIO' | 'QUINCENAL' | 'MENSUAL' =
    periodoParam === 'DIARIO' || periodoParam === 'MENSUAL' ? periodoParam : 'QUINCENAL';
  const fecha = searchParams.get('fecha') || new Date().toISOString().slice(0, 10);
  const rango = rangoPeriodo(periodo, fecha);

  const desdeUTC = `${rango.desde}T00:00:00.000Z`;
  const hastaUTC = new Date(new Date(`${rango.hasta}T12:00:00Z`).getTime() + 1.5 * 86_400_000).toISOString();

  const [empleados, eventos] = await Promise.all([
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

  const filas = empleados
    .filter((e) => e.compensacion)
    .map((e) => {
      const r = byId.get(e.id);
      const horas = r?.horas ?? 0;
      const extra = r?.horasExtra ?? 0;
      const dev = calcularDevengado({ horas, horasExtra: extra }, e.compensacion!);
      return { nombre: e.nombre, oficina: e.oficina.nombre, horas, extra, dev };
    });

  const headers = ['Empleado', 'Oficina', 'Moneda', 'Horas', 'Extra', 'Tarifa/h', 'Ordinario', 'Extra $', 'Total'];
  const fname = `prenomina_${rango.desde}_${rango.hasta}`;

  if (formato === 'csv') {
    const rows: Array<Array<string | number>> = filas.map((f) => [
      f.nombre,
      f.oficina,
      f.dev.moneda,
      f.horas,
      f.extra,
      f.dev.tarifa,
      f.dev.ordinario,
      f.dev.extra,
      f.dev.total,
    ]);
    return csvResponse(toCSV(headers, rows), `${fname}.csv`);
  }

  const rows = filas.map((f) => [
    f.nombre,
    f.oficina,
    f.dev.moneda,
    f.horas.toFixed(1),
    f.extra.toFixed(1),
    formatoMoneda(f.dev.tarifa, f.dev.moneda),
    formatoMoneda(f.dev.ordinario, f.dev.moneda),
    formatoMoneda(f.dev.extra, f.dev.moneda),
    formatoMoneda(f.dev.total, f.dev.moneda),
  ]);
  const buffer = await renderTablaPDF({
    titulo: 'Pre-nómina (devengado bruto)',
    subtitulo: `${rango.etiqueta} · ${rango.desde} a ${rango.hasta}`,
    headers,
    rows,
    alinearDerecha: [3, 4, 5, 6, 7, 8],
  });
  return pdfResponse(buffer, `${fname}.pdf`);
}
