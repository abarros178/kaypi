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
  KIOSCO_QR_FALTANTE: 'kiosco_qr_faltante',
  KIOSCO_QR_INVALIDO: 'kiosco_qr_invalido',
  KIOSCO_QR_TIPO_MISMATCH: 'kiosco_qr_tipo_mismatch',
  KIOSCO_QR_EMPLEADO_DESCONOCIDO: 'kiosco_qr_empleado_desconocido',
  KIOSCO_QR_OFICINA_AJENA: 'kiosco_qr_oficina_ajena',
  KIOSCO_QR_EXPIRADO: 'kiosco_qr_expirado',
  KIOSCO_QR_FIRMA_INVALIDA: 'kiosco_qr_firma_invalida',
  KIOSCO_QR_REPLAY: 'kiosco_qr_replay',
  KIOSCO_NO_CONFIGURADO: 'kiosco_no_configurado',
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
