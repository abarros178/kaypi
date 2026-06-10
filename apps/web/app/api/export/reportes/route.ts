import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { checkInEvent, db, empleado } from '@kaypi/db';
import { csvResponse, pdfResponse, toCSV } from '@/lib/export';
import { renderTablaPDF } from '@/lib/pdf/tabla-pdf';
import { rangoPorDefecto, resumenTA, type EmpleadoTA, type EventoTA } from '@/lib/reportes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const formato = searchParams.get('formato') === 'pdf' ? 'pdf' : 'csv';
  const oficinaId = searchParams.get('oficinaId') || '';
  const def = rangoPorDefecto(new Date().toISOString());
  const desde = searchParams.get('desde') || def.desde;
  const hasta = searchParams.get('hasta') || def.hasta;

  const desdeUTC = `${desde}T00:00:00.000Z`;
  const hastaUTC = new Date(new Date(`${hasta}T12:00:00Z`).getTime() + 1.5 * 86_400_000).toISOString();

  const [empleados, eventos] = await Promise.all([
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

  const headers = ['Empleado', 'Oficina', 'Días', 'Faltas', 'Retrasos', 'Horas', 'Horas extra'];
  const rows: Array<Array<string | number>> = resumenes.map((r) => [
    r.nombre,
    r.oficina,
    r.diasConMarcaje,
    r.faltas,
    r.retrasos,
    r.horas,
    r.horasExtra,
  ]);
  const fname = `reporte_${desde}_${hasta}`;

  if (formato === 'csv') return csvResponse(toCSV(headers, rows), `${fname}.csv`);

  const buffer = await renderTablaPDF({
    titulo: 'Reporte de asistencia',
    subtitulo: `Período ${desde} a ${hasta}`,
    headers,
    rows: rows.map((r) => r.map(String)),
    alinearDerecha: [2, 3, 4, 5, 6],
  });
  return pdfResponse(buffer, `${fname}.pdf`);
}
