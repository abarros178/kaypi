import { NextResponse } from 'next/server';
import { and, desc, eq, gt, like, lt } from 'drizzle-orm';
import {
  checkInEvent,
  db,
  empleado,
  kiosco,
  kioscoQrReplay,
  oficina,
  politicaCheckIn,
} from '@kaypi/db';
import {
  CheckInInputSchema,
  dentroDeGeofence,
  FLAGS,
  parsearQR,
  verificarHMAC,
  type CheckInEvent,
  type CheckInInput,
} from '@kaypi/shared';

/** Ventana de tolerancia del timestamp del QR contra el reloj del servidor. */
const QR_VENTANA_MS = 60_000;
/** Cutoff para considerar un nonce "visto recientemente" (anti-replay). */
const QR_REPLAY_MS = 60_000;
/** Cutoff de limpieza del replay cache: borra entradas más viejas que esto. */
const QR_REPLAY_GC_MS = 90_000;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function rechazo(motivo: string) {
  return NextResponse.json({ error: motivo, rechazado: true }, { status: 422 });
}

interface ResultadoQR {
  /** Si presente, el handler debe responder con `rechazo(rechazoMotivo)`. */
  rechazoMotivo?: string;
  /** Id del empleado resuelto del QR (sobrescribe el del input si vino como prefijo). */
  empleadoIdReal?: string;
  /** Id del kiosco activo que verá el evento (para auditoría / replay cache). */
  kioscoIdSeen?: string;
  /** Nonce a persistir si la validación fue limpia (para anti-replay). */
  nonceParaReplay?: string;
}

/**
 * Validación específica del canal KIOSCO. Mantiene la semántica del enforcement
 * de la política de la oficina: con BLOCK rechaza, con FLAG sigue y deja flags.
 */
async function validarQRKiosco(
  input: CheckInInput,
  enforcement: 'BLOCK' | 'FLAG',
  flags: string[],
): Promise<ResultadoQR> {
  const kioscoEnvId = process.env.KIOSCO_ID;
  if (!kioscoEnvId) {
    flags.push(FLAGS.KIOSCO_NO_CONFIGURADO);
    return enforcement === 'BLOCK'
      ? { rechazoMotivo: 'KIOSCO_ID no configurado en el servidor' }
      : {};
  }

  const kio = await db.query.kiosco.findFirst({
    where: and(eq(kiosco.id, kioscoEnvId), eq(kiosco.status, 'active')),
  });
  if (!kio) {
    flags.push(FLAGS.KIOSCO_NO_CONFIGURADO);
    return enforcement === 'BLOCK'
      ? { rechazoMotivo: 'Kiosco no encontrado o inactivo' }
      : {};
  }

  // El kiosco solo registra eventos de SU oficina. Esto es invariante de cliente, no de política.
  if (kio.oficinaId !== input.oficinaId) {
    return { rechazoMotivo: 'La oficina del input no corresponde a este kiosco' };
  }

  const out: ResultadoQR = { kioscoIdSeen: kio.id };

  // Hard rejects: si falta el QR, está malformado, o no podemos identificar al
  // empleado, no hay forma sensata de aceptar el marcaje. El enforcement BLOCK/FLAG
  // se reserva para "factor falla pero el evento todavía tiene sentido".
  if (!input.qrEmpleadoScan) {
    flags.push(FLAGS.KIOSCO_QR_FALTANTE);
    return { ...out, rechazoMotivo: 'Falta el QR del empleado' };
  }

  const parsed = parsearQR(input.qrEmpleadoScan);
  if (!parsed) {
    flags.push(FLAGS.KIOSCO_QR_INVALIDO);
    return { ...out, rechazoMotivo: 'QR malformado' };
  }

  const candidatos = await db.query.empleado.findMany({
    where: like(empleado.id, `${parsed.empIdPrefix}%`),
  });
  if (candidatos.length !== 1) {
    flags.push(FLAGS.KIOSCO_QR_EMPLEADO_DESCONOCIDO);
    return { ...out, rechazoMotivo: 'Empleado del QR no encontrado' };
  }
  const emp = candidatos[0]!;
  out.empleadoIdReal = emp.id;

  // Firma y replay también son rechazos duros: aceptar un QR no firmado o
  // re-usado defectaría el modelo de amenaza, FLAG o no.
  const firmaOK = await verificarHMAC(input.qrEmpleadoScan, emp.qrSecret);
  if (!firmaOK) {
    flags.push(FLAGS.KIOSCO_QR_FIRMA_INVALIDA);
    return { ...out, rechazoMotivo: 'La firma del QR no es válida' };
  }

  const cutoffReplay = Date.now() - QR_REPLAY_MS;
  const visto = await db.query.kioscoQrReplay.findFirst({
    where: and(eq(kioscoQrReplay.nonce, parsed.nonce), gt(kioscoQrReplay.seenAt, cutoffReplay)),
  });
  if (visto) {
    flags.push(FLAGS.KIOSCO_QR_REPLAY);
    return { ...out, rechazoMotivo: 'Este QR ya fue usado' };
  }

  // De aquí en adelante respetamos enforcement: son señales accionables que el
  // manager puede revisar (oficina ajena, expirado, tipo desincronizado).
  if (parsed.tipo !== input.tipo) {
    flags.push(FLAGS.KIOSCO_QR_TIPO_MISMATCH);
    if (enforcement === 'BLOCK')
      return { ...out, rechazoMotivo: 'El tipo del QR no coincide con el del marcaje' };
  }

  if (emp.oficinaId !== kio.oficinaId) {
    flags.push(FLAGS.KIOSCO_QR_OFICINA_AJENA);
    if (enforcement === 'BLOCK')
      return { ...out, rechazoMotivo: 'El empleado pertenece a otra oficina' };
  }

  if (Math.abs(Date.now() - parsed.ts) > QR_VENTANA_MS) {
    flags.push(FLAGS.KIOSCO_QR_EXPIRADO);
    if (enforcement === 'BLOCK') return { ...out, rechazoMotivo: 'El QR está expirado' };
  }

  out.nonceParaReplay = parsed.nonce;
  return out;
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
    let empleadoIdReal = input.empleadoId;
    let kioscoIdSeen: string | null = null;
    let nonceParaReplay: string | null = null;

    // Validación específica del canal KIOSCO: QR firmado HMAC + anti-replay.
    if (input.canal === 'KIOSCO') {
      const r = await validarQRKiosco(input, enforcement, flags);
      if (r.rechazoMotivo) return rechazo(r.rechazoMotivo);
      if (r.empleadoIdReal) empleadoIdReal = r.empleadoIdReal;
      if (r.kioscoIdSeen) kioscoIdSeen = r.kioscoIdSeen;
      if (r.nonceParaReplay) nonceParaReplay = r.nonceParaReplay;
    }

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
        empleadoId: empleadoIdReal,
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

    // Persistir el nonce del QR para anti-replay y limpiar entradas viejas.
    if (nonceParaReplay && kioscoIdSeen) {
      await db.delete(kioscoQrReplay).where(lt(kioscoQrReplay.seenAt, Date.now() - QR_REPLAY_GC_MS));
      await db
        .insert(kioscoQrReplay)
        .values({
          nonce: nonceParaReplay,
          kioscoId: kioscoIdSeen,
          empleadoId: empleadoIdReal,
          seenAt: Date.now(),
        })
        .onConflictDoNothing({ target: kioscoQrReplay.nonce });
    }

    const event: CheckInEvent = {
      eventId: input.eventId,
      empleadoId: empleadoIdReal,
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
