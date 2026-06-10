import { z } from 'zod';
import { Canal, Fuente, Nivel, TipoMarcaje } from './enums';

/**
 * Validaciones de formato definidas con regex para no atarnos a APIs específicas
 * de zod entre versiones. Suficientes para el contrato; se pueden endurecer luego.
 */
const Uuid = z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, 'uuid inválido');
const IsoDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'debe ser ISO 8601');

export const UbicacionInput = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyM: z.number().nonnegative().optional(),
});
export type UbicacionInput = z.infer<typeof UbicacionInput>;

export const IdentidadInput = z.object({
  facialOk: z.boolean().optional(),
  /** URL/clave de la foto del marcaje (evidencia). NO es una plantilla biométrica. */
  fotoRef: z.string().optional(),
});
export type IdentidadInput = z.infer<typeof IdentidadInput>;

/**
 * CONTRATO DE ENTRADA — lo que un canal (web/móvil/kiosco) ENVÍA al servidor.
 *
 * No incluye `servidorUTC`, `geofenceOk` ni `flags`: eso lo calcula y lo SELLA
 * el servidor (la hora del dispositivo no se confía para nómina).
 * `eventId` lo genera el cliente (uuid) → idempotencia al sincronizar colas offline.
 */
export const CheckInInputSchema = z.object({
  eventId: Uuid,
  empleadoId: z.string().min(1),
  oficinaId: z.string().min(1),
  tipo: TipoMarcaje,
  canal: Canal,
  nivelAplicado: Nivel,
  ubicacion: UbicacionInput.optional(),
  identidad: IdentidadInput.optional(),
  /** Hora local del dispositivo (ISO con offset). Solo referencia; NO se usa para nómina. */
  clienteLocal: IsoDateTime,
  fuente: Fuente.default('NORMAL'),
  /**
   * String del QR escaneado del celular del empleado. Requerido cuando `canal === 'KIOSCO'`.
   * No se propaga al CheckInEvent; lo consume el servidor para validar firma/replay.
   */
  qrEmpleadoScan: z.string().optional(),
});
export type CheckInInput = z.infer<typeof CheckInInputSchema>;

export const TimestampCanonico = z.object({
  /** Sellado por el SERVIDOR en UTC. Verdad para el cálculo de horas/nómina. */
  servidorUTC: IsoDateTime,
  /** Zona horaria IANA de la oficina, p.ej. "America/Mexico_City". */
  tz: z.string().min(1),
  /** Hora local del dispositivo (referencia). */
  clienteLocal: IsoDateTime,
});
export type TimestampCanonico = z.infer<typeof TimestampCanonico>;

export const UbicacionCanonica = UbicacionInput.extend({
  /** Resultado de la validación de geofence. `null` si el nivel no requiere geo. */
  geofenceOk: z.boolean().nullable(),
});
export type UbicacionCanonica = z.infer<typeof UbicacionCanonica>;

/**
 * EVENTO CANÓNICO — el único objeto que producen TODOS los canales (PRD §7).
 * De él viven el dashboard, el cálculo de horas y los reportes. Congelado el día 0.
 */
export const CheckInEventSchema = z.object({
  eventId: z.string(),
  empleadoId: z.string(),
  oficinaId: z.string(),
  tipo: TipoMarcaje,
  timestamp: TimestampCanonico,
  canal: Canal,
  nivelAplicado: Nivel,
  ubicacion: UbicacionCanonica.nullable(),
  identidad: IdentidadInput.nullable(),
  fuente: Fuente,
  flags: z.array(z.string()).default([]),
  creadoPor: z.string().nullable().default(null),
});
export type CheckInEvent = z.infer<typeof CheckInEventSchema>;
