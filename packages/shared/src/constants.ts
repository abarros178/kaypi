/**
 * Catálogo de `flags` que la API puede adjuntar a un marcaje cuando un factor
 * falla pero el enforcement es FLAG (se acepta el marcaje y se marca la anomalía).
 * Nunca se descarta un marcaje en silencio.
 */
export const FLAGS = {
  FUERA_GEOFENCE: 'fuera_geofence',
  FACIAL_FALLO: 'facial_fallo',
  SIN_RED_ENCOLADO: 'sin_red_encolado',
  FUERA_HORARIO: 'fuera_horario',
  RETRASO: 'retraso',
  FALTA_UBICACION: 'falta_ubicacion',
  FALTA_FACIAL: 'falta_facial',
  CONFLICTO_SYNC: 'conflicto_sync',
} as const;

export type FlagConocido = (typeof FLAGS)[keyof typeof FLAGS];

/** Valores por defecto del V1 (ver §6 y §13 del PRD). */
export const DEFAULTS = {
  /** Radio de geofence por oficina si no se configura otro. */
  GEOFENCE_RADIO_M: 150,
  /** Tolerancia de retraso sobre la hora de entrada. */
  TOLERANCIA_RETRASO_MIN: 5,
  /** Ventana de validez del código rotativo de fallback. */
  CODIGO_FALLBACK_VENTANA_MIN: 5,
} as const;
