import { relations } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Schema Drizzle sobre libSQL/Turso (SQLite distribuido) — PRD §4.
 * Los literales de enum coinciden con los de @kaypi/shared (el contrato canónico).
 * Las fechas se guardan como texto ISO 8601 (UTC para lo canónico).
 */

export const empresa = sqliteTable('empresa', {
  id: text('id').primaryKey(),
  nombre: text('nombre').notNull(),
});

export const oficina = sqliteTable('oficina', {
  id: text('id').primaryKey(),
  empresaId: text('empresa_id').notNull().references(() => empresa.id),
  nombre: text('nombre').notNull(),
  direccion: text('direccion'),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  geofenceRadiusM: integer('geofence_radius_m').notNull().default(150),
  timezone: text('timezone').notNull().default('America/Mexico_City'),
});

export const jornada = sqliteTable('jornada', {
  id: text('id').primaryKey(),
  oficinaId: text('oficina_id').notNull().references(() => oficina.id),
  nombre: text('nombre').notNull(),
  tipo: text('tipo', { enum: ['FIJA', 'FLEXIBLE'] }).notNull(),
  maxHorasDiarias: real('max_horas_diarias').notNull().default(8),
  maxHorasSemanales: real('max_horas_semanales').notNull().default(40),
  /** "HH:MM" o null si la jornada es FLEXIBLE. */
  horaEntrada: text('hora_entrada'),
  horaSalida: text('hora_salida'),
  descansoInicio: text('descanso_inicio'),
  descansoFin: text('descanso_fin'),
  descansoMin: integer('descanso_min'),
  toleranciaRetrasoMin: integer('tolerancia_retraso_min').notNull().default(5),
  timezone: text('timezone'),
});

export const politicaCheckIn = sqliteTable('politica_checkin', {
  id: text('id').primaryKey(),
  oficinaId: text('oficina_id').notNull().references(() => oficina.id),
  canales: text('canales', { mode: 'json' }).$type<Array<'WEB' | 'MOVIL' | 'KIOSCO'>>().notNull(),
  nivel: text('nivel', { enum: ['SOLO_LOGIN', 'LOGIN_GEO', 'LOGIN_FACIAL'] }).notNull(),
  enforcement: text('enforcement', { enum: ['BLOCK', 'FLAG'] }).notNull().default('FLAG'),
  fallbackHabilitado: integer('fallback_habilitado', { mode: 'boolean' }).notNull().default(true),
});

export const empleado = sqliteTable('empleado', {
  id: text('id').primaryKey(),
  empresaId: text('empresa_id').notNull().references(() => empresa.id),
  oficinaId: text('oficina_id').notNull().references(() => oficina.id),
  jornadaId: text('jornada_id').references(() => jornada.id),
  nombre: text('nombre').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  rol: text('rol', { enum: ['ADMIN', 'MANAGER', 'EMPLEADO'] }).notNull().default('EMPLEADO'),
  /** Foto de perfil opcional como referencia visual (no es plantilla biométrica). */
  fotoRefPerfil: text('foto_ref_perfil'),
  /** Secreto HMAC-SHA256 (32 bytes base64) usado por el celular para firmar el QR del kiosco. */
  qrSecret: text('qr_secret').notNull(),
});

/** Compensación del empleado (1:1) — insumo para la pre-nómina. */
export const compensacion = sqliteTable('compensacion', {
  id: text('id').primaryKey(),
  empleadoId: text('empleado_id').notNull().unique().references(() => empleado.id),
  tipoSalario: text('tipo_salario', { enum: ['POR_HORA', 'MENSUAL'] }).notNull(),
  monto: real('monto').notNull(),
  moneda: text('moneda').notNull().default('COP'),
  periodoPago: text('periodo_pago', { enum: ['DIARIO', 'QUINCENAL', 'MENSUAL'] }).notNull().default('QUINCENAL'),
  /** Multiplicador de la hora extra (ej. 1.25 = +25%). */
  multiplicadorExtra: real('multiplicador_extra').notNull().default(1.25),
  /** Horas/mes para derivar la tarifa por hora desde un salario mensual. */
  horasMesBase: real('horas_mes_base').notNull().default(240),
});

export const checkInEvent = sqliteTable('checkin_event', {
  /** = eventId del cliente (uuid) → idempotencia al sincronizar colas offline. */
  id: text('id').primaryKey(),
  empleadoId: text('empleado_id').notNull().references(() => empleado.id),
  oficinaId: text('oficina_id').notNull().references(() => oficina.id),
  tipo: text('tipo', { enum: ['IN', 'OUT', 'BREAK_START', 'BREAK_END'] }).notNull(),
  /** Hora canónica sellada por el SERVIDOR en UTC. Verdad para nómina. */
  tsServidorUTC: text('ts_servidor_utc').notNull(),
  tz: text('tz').notNull(),
  /** Hora local del dispositivo (referencia). */
  clienteLocal: text('cliente_local'),
  canal: text('canal', { enum: ['WEB', 'MOVIL', 'KIOSCO'] }).notNull(),
  nivelAplicado: text('nivel_aplicado', { enum: ['SOLO_LOGIN', 'LOGIN_GEO', 'LOGIN_FACIAL'] }).notNull(),
  lat: real('lat'),
  lng: real('lng'),
  accuracyM: real('accuracy_m'),
  geofenceOk: integer('geofence_ok', { mode: 'boolean' }),
  facialOk: integer('facial_ok', { mode: 'boolean' }),
  fotoRef: text('foto_ref'),
  flags: text('flags', { mode: 'json' }).$type<string[]>().notNull().$defaultFn(() => []),
  fuente: text('fuente', { enum: ['NORMAL', 'MANUAL', 'FALLBACK_CODE', 'KIOSCO_OFFLINE'] })
    .notNull()
    .default('NORMAL'),
  creadoPor: text('creado_por'),
  creadoEn: text('creado_en').notNull().$defaultFn(() => new Date().toISOString()),
  /** Revisión/aprobación de marcajes con flag (gobernanza). */
  revisado: integer('revisado', { mode: 'boolean' }).notNull().default(false),
  revisadoPor: text('revisado_por'),
  revisadoEn: text('revisado_en'),
});

/** Kiosco físico: identidad y oficina a la que pertenece. */
export const kiosco = sqliteTable('kiosco', {
  id: text('id').primaryKey(),
  oficinaId: text('oficina_id').notNull().references(() => oficina.id),
  nombre: text('nombre').notNull(),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

/** Anti-replay del QR del empleado: cada nonce válido por 60 s. */
export const kioscoQrReplay = sqliteTable('kiosco_qr_replay', {
  nonce: text('nonce').primaryKey(),
  kioscoId: text('kiosco_id').notNull().references(() => kiosco.id),
  empleadoId: text('empleado_id').notNull().references(() => empleado.id),
  seenAt: integer('seen_at').notNull(),
});

export const codigoFallback = sqliteTable('codigo_fallback', {
  id: text('id').primaryKey(),
  oficinaId: text('oficina_id').notNull().references(() => oficina.id),
  codigo: text('codigo').notNull(),
  generadoEn: text('generado_en').notNull(),
  validoHasta: text('valido_hasta').notNull(),
  usadoPor: text('usado_por'),
  usadoEn: text('usado_en'),
});

/** Append-only: toda corrección/manual/override se registra, nunca se sobreescribe. */
export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey(),
  entidad: text('entidad').notNull(),
  entidadId: text('entidad_id').notNull(),
  accion: text('accion').notNull(),
  actorId: text('actor_id'),
  ts: text('ts').notNull().$defaultFn(() => new Date().toISOString()),
  detalle: text('detalle', { mode: 'json' }).$type<Record<string, unknown>>(),
});

// --- Relaciones (para las queries del dashboard/reportes) ---

export const empresaRelations = relations(empresa, ({ many }) => ({
  oficinas: many(oficina),
  empleados: many(empleado),
}));

export const oficinaRelations = relations(oficina, ({ one, many }) => ({
  empresa: one(empresa, { fields: [oficina.empresaId], references: [empresa.id] }),
  jornadas: many(jornada),
  politicas: many(politicaCheckIn),
  empleados: many(empleado),
  eventos: many(checkInEvent),
}));

export const jornadaRelations = relations(jornada, ({ one, many }) => ({
  oficina: one(oficina, { fields: [jornada.oficinaId], references: [oficina.id] }),
  empleados: many(empleado),
}));

export const empleadoRelations = relations(empleado, ({ one, many }) => ({
  empresa: one(empresa, { fields: [empleado.empresaId], references: [empresa.id] }),
  oficina: one(oficina, { fields: [empleado.oficinaId], references: [oficina.id] }),
  jornada: one(jornada, { fields: [empleado.jornadaId], references: [jornada.id] }),
  eventos: many(checkInEvent),
  compensacion: one(compensacion),
}));

export const checkInEventRelations = relations(checkInEvent, ({ one }) => ({
  empleado: one(empleado, { fields: [checkInEvent.empleadoId], references: [empleado.id] }),
  oficina: one(oficina, { fields: [checkInEvent.oficinaId], references: [oficina.id] }),
}));

export const politicaCheckInRelations = relations(politicaCheckIn, ({ one }) => ({
  oficina: one(oficina, { fields: [politicaCheckIn.oficinaId], references: [oficina.id] }),
}));

export const compensacionRelations = relations(compensacion, ({ one }) => ({
  empleado: one(empleado, { fields: [compensacion.empleadoId], references: [empleado.id] }),
}));

export const kioscoRelations = relations(kiosco, ({ one, many }) => ({
  oficina: one(oficina, { fields: [kiosco.oficinaId], references: [oficina.id] }),
  replays: many(kioscoQrReplay),
}));

export const kioscoQrReplayRelations = relations(kioscoQrReplay, ({ one }) => ({
  kiosco: one(kiosco, { fields: [kioscoQrReplay.kioscoId], references: [kiosco.id] }),
  empleado: one(empleado, { fields: [kioscoQrReplay.empleadoId], references: [empleado.id] }),
}));

// --- Tipos inferidos (para usar en la API y los reportes) ---

export type Empresa = typeof empresa.$inferSelect;
export type Oficina = typeof oficina.$inferSelect;
export type Jornada = typeof jornada.$inferSelect;
export type PoliticaCheckIn = typeof politicaCheckIn.$inferSelect;
export type Empleado = typeof empleado.$inferSelect;
export type CheckInEventRow = typeof checkInEvent.$inferSelect;
export type NuevoCheckInEvent = typeof checkInEvent.$inferInsert;
export type CodigoFallback = typeof codigoFallback.$inferSelect;
export type AuditLogRow = typeof auditLog.$inferSelect;
export type Compensacion = typeof compensacion.$inferSelect;
export type NuevaCompensacion = typeof compensacion.$inferInsert;
export type Kiosco = typeof kiosco.$inferSelect;
export type NuevoKiosco = typeof kiosco.$inferInsert;
export type KioscoQrReplay = typeof kioscoQrReplay.$inferSelect;
