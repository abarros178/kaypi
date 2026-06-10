import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { checkInEvent, db, oficina, politicaCheckIn } from '@kaypi/db';
import {
  CheckInInputSchema,
  dentroDeGeofence,
  FLAGS,
  type CheckInEvent,
} from '@kaypi/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function rechazo(motivo: string) {
  return NextResponse.json({ error: motivo, rechazado: true }, { status: 422 });
}

/**
 * API de marcaje. Recibe el CONTRATO de entrada, valida la política de la oficina,
 * SELLA la hora del servidor en UTC, calcula geofence/flags y persiste el evento canónico.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = CheckInInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Input inválido', issues: parsed.error.issues }, { status: 400 });
    }
    const input = parsed.data;

    const ofi = await db.query.oficina.findFirst({ where: eq(oficina.id, input.oficinaId) });
    if (!ofi) return NextResponse.json({ error: 'Oficina no encontrada' }, { status: 404 });

    const pol = await db.query.politicaCheckIn.findFirst({
      where: eq(politicaCheckIn.oficinaId, input.oficinaId),
    });
    const enforcement = pol?.enforcement ?? 'FLAG';

    if (pol && !pol.canales.includes(input.canal)) {
      return rechazo(`Canal ${input.canal} no habilitado para esta oficina`);
    }

    const flags: string[] = [];
    let geofenceOk: boolean | null = null;

    // Geofence: se valida si el nivel lo exige; si no, se evalúa solo de forma informativa.
    if (input.nivelAplicado === 'LOGIN_GEO') {
      if (!input.ubicacion) {
        flags.push(FLAGS.FALTA_UBICACION);
        if (enforcement === 'BLOCK') return rechazo('Falta ubicación para validar el geofence');
      } else {
        geofenceOk = dentroDeGeofence(input.ubicacion, {
          lat: ofi.lat,
          lng: ofi.lng,
          geofenceRadiusM: ofi.geofenceRadiusM,
        });
        if (!geofenceOk) {
          flags.push(FLAGS.FUERA_GEOFENCE);
          if (enforcement === 'BLOCK') return rechazo('Estás fuera del área permitida');
        }
      }
    } else if (input.ubicacion) {
      geofenceOk = dentroDeGeofence(input.ubicacion, {
        lat: ofi.lat,
        lng: ofi.lng,
        geofenceRadiusM: ofi.geofenceRadiusM,
      });
    }

    // Facial (móvil nativo): solo evaluamos la señal que reporta el cliente.
    if (input.nivelAplicado === 'LOGIN_FACIAL') {
      if (input.identidad?.facialOk === false) {
        flags.push(FLAGS.FACIAL_FALLO);
        if (enforcement === 'BLOCK') return rechazo('La verificación facial no pasó');
      } else if (input.identidad?.facialOk == null) {
        flags.push(FLAGS.FALTA_FACIAL);
      }
    }

    // El servidor SELLA la hora canónica en UTC. La del cliente queda solo como referencia.
    const servidorUTC = new Date().toISOString();
    const tz = ofi.timezone;

    await db
      .insert(checkInEvent)
      .values({
        id: input.eventId,
        empleadoId: input.empleadoId,
        oficinaId: input.oficinaId,
        tipo: input.tipo,
        tsServidorUTC: servidorUTC,
        tz,
        clienteLocal: input.clienteLocal,
        canal: input.canal,
        nivelAplicado: input.nivelAplicado,
        lat: input.ubicacion?.lat ?? null,
        lng: input.ubicacion?.lng ?? null,
        accuracyM: input.ubicacion?.accuracyM ?? null,
        geofenceOk,
        facialOk: input.identidad?.facialOk ?? null,
        fotoRef: input.identidad?.fotoRef ?? null,
        flags,
        fuente: input.fuente,
        creadoPor: null,
      })
      .onConflictDoNothing({ target: checkInEvent.id }); // idempotencia para la cola offline

    const event: CheckInEvent = {
      eventId: input.eventId,
      empleadoId: input.empleadoId,
      oficinaId: input.oficinaId,
      tipo: input.tipo,
      timestamp: { servidorUTC, tz, clienteLocal: input.clienteLocal },
      canal: input.canal,
      nivelAplicado: input.nivelAplicado,
      ubicacion: input.ubicacion ? { ...input.ubicacion, geofenceOk } : null,
      identidad: input.identidad ?? null,
      fuente: input.fuente,
      flags,
      creadoPor: null,
    };

    return NextResponse.json({ event }, { status: 201 });
  } catch (e) {
    console.error('POST /api/checkin', e);
    return NextResponse.json({ error: 'Error interno al registrar el marcaje' }, { status: 500 });
  }
}

/** Lista de marcajes para el dashboard / la vitrina. Filtros opcionales por query. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const empleadoId = searchParams.get('empleadoId');
  const oficinaId = searchParams.get('oficinaId');
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);

  const conds = [];
  if (empleadoId) conds.push(eq(checkInEvent.empleadoId, empleadoId));
  if (oficinaId) conds.push(eq(checkInEvent.oficinaId, oficinaId));

  const eventos = await db.query.checkInEvent.findMany({
    where: conds.length ? and(...conds) : undefined,
    orderBy: [desc(checkInEvent.tsServidorUTC)],
    limit,
    with: {
      empleado: { columns: { nombre: true } },
      oficina: { columns: { nombre: true } },
    },
  });

  return NextResponse.json({ eventos });
}
