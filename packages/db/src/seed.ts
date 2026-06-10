import { randomBytes, randomUUID } from 'node:crypto';
import { hash } from 'bcryptjs';
import { db } from './client';
import {
  auditLog,
  checkInEvent,
  codigoFallback,
  empleado,
  empresa,
  jornada,
  kiosco,
  kioscoQrReplay,
  oficina,
  politicaCheckIn,
  type NuevoCheckInEvent,
} from './schema';

/** Genera un qrSecret HMAC (32 bytes random, base64). */
function nuevoQrSecret(): string {
  return randomBytes(32).toString('base64');
}

// Offsets fijos: CDMX no usa horario de verano desde 2022; Lima nunca lo usa.
const OFF_CDMX = -6;
const OFF_LIMA = -5;

const CDMX = { lat: 19.4326, lng: -99.1332 };
const LIMA = { lat: -12.0464, lng: -77.0428 };

function isoUTC(fecha: string, hhmm: string, offsetH: number): string {
  const [Y = 0, M = 1, D = 1] = fecha.split('-').map(Number);
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(Y, M - 1, D, h - offsetH, m)).toISOString();
}

function isoLocal(fecha: string, hhmm: string, offsetH: number): string {
  const sign = offsetH <= 0 ? '-' : '+';
  const abs = String(Math.abs(offsetH)).padStart(2, '0');
  return `${fecha}T${hhmm}:00${sign}${abs}:00`;
}

interface EvOpts {
  empleadoId: string;
  oficinaId: string;
  tipo: 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END';
  fecha: string;
  hhmm: string;
  offset: number;
  tz: string;
  canal: 'WEB' | 'MOVIL' | 'KIOSCO';
  nivel: 'SOLO_LOGIN' | 'LOGIN_GEO' | 'LOGIN_FACIAL';
  lat?: number;
  lng?: number;
  geofenceOk?: boolean | null;
  facialOk?: boolean | null;
  flags?: string[];
}

function ev(p: EvOpts): NuevoCheckInEvent {
  return {
    id: randomUUID(),
    empleadoId: p.empleadoId,
    oficinaId: p.oficinaId,
    tipo: p.tipo,
    tsServidorUTC: isoUTC(p.fecha, p.hhmm, p.offset),
    clienteLocal: isoLocal(p.fecha, p.hhmm, p.offset),
    tz: p.tz,
    canal: p.canal,
    nivelAplicado: p.nivel,
    lat: p.lat ?? null,
    lng: p.lng ?? null,
    accuracyM: p.lat != null ? 12 : null,
    geofenceOk: p.geofenceOk ?? null,
    facialOk: p.facialOk ?? null,
    fotoRef: null,
    flags: p.flags ?? [],
    fuente: 'NORMAL',
    creadoPor: null,
  };
}

/** Un día de marcajes para un empleado de CDMX (jornada fija, facial). */
function diaCDMX(
  empleadoId: string,
  fecha: string,
  o: { in: string; out: string; conBreak?: boolean; flags?: string[]; geofenceOk?: boolean },
): NuevoCheckInEvent[] {
  const common = {
    empleadoId,
    oficinaId: 'ofi_cdmx',
    fecha,
    offset: OFF_CDMX,
    tz: 'America/Mexico_City',
    canal: 'MOVIL' as const,
    nivel: 'LOGIN_FACIAL' as const,
    lat: o.geofenceOk === false ? 19.46 : CDMX.lat,
    lng: o.geofenceOk === false ? -99.18 : CDMX.lng,
    geofenceOk: o.geofenceOk ?? true,
    facialOk: true,
  };
  const evs: NuevoCheckInEvent[] = [ev({ ...common, tipo: 'IN', hhmm: o.in, flags: o.flags })];
  if (o.conBreak) {
    evs.push(ev({ ...common, tipo: 'BREAK_START', hhmm: '13:00' }));
    evs.push(ev({ ...common, tipo: 'BREAK_END', hhmm: '14:00' }));
  }
  evs.push(ev({ ...common, tipo: 'OUT', hhmm: o.out }));
  return evs;
}

/** Un día de marcajes para un empleado de Lima (jornada flexible, geo, web). */
function diaLima(
  empleadoId: string,
  fecha: string,
  o: { in: string; out: string; conBreak?: boolean },
): NuevoCheckInEvent[] {
  const common = {
    empleadoId,
    oficinaId: 'ofi_lima',
    fecha,
    offset: OFF_LIMA,
    tz: 'America/Lima',
    canal: 'WEB' as const,
    nivel: 'LOGIN_GEO' as const,
    lat: LIMA.lat,
    lng: LIMA.lng,
    geofenceOk: true,
    facialOk: null,
  };
  const evs: NuevoCheckInEvent[] = [ev({ ...common, tipo: 'IN', hhmm: o.in })];
  if (o.conBreak) {
    evs.push(ev({ ...common, tipo: 'BREAK_START', hhmm: '13:30' }));
    evs.push(ev({ ...common, tipo: 'BREAK_END', hhmm: '14:15' }));
  }
  evs.push(ev({ ...common, tipo: 'OUT', hhmm: o.out }));
  return evs;
}

async function main(): Promise<void> {
  // Borrado en orden hijo→padre (idempotente: re-correr deja estado limpio).
  await db.delete(auditLog);
  await db.delete(codigoFallback);
  await db.delete(kioscoQrReplay);
  await db.delete(kiosco);
  await db.delete(checkInEvent);
  await db.delete(empleado);
  await db.delete(politicaCheckIn);
  await db.delete(jornada);
  await db.delete(oficina);
  await db.delete(empresa);

  await db.insert(empresa).values({ id: 'empresa_kaypi', nombre: 'Kaypi Demo S.A.' });

  await db.insert(oficina).values([
    {
      id: 'ofi_cdmx',
      empresaId: 'empresa_kaypi',
      nombre: 'Oficina CDMX',
      direccion: 'Av. Paseo de la Reforma 222, CDMX',
      lat: CDMX.lat,
      lng: CDMX.lng,
      geofenceRadiusM: 150,
      timezone: 'America/Mexico_City',
    },
    {
      id: 'ofi_lima',
      empresaId: 'empresa_kaypi',
      nombre: 'Oficina Lima',
      direccion: 'Av. Javier Prado Este 492, San Isidro, Lima',
      lat: LIMA.lat,
      lng: LIMA.lng,
      geofenceRadiusM: 200,
      timezone: 'America/Lima',
    },
  ]);

  await db.insert(jornada).values([
    {
      id: 'jor_fija_cdmx',
      oficinaId: 'ofi_cdmx',
      nombre: 'Jornada fija 09–18',
      tipo: 'FIJA',
      maxHorasDiarias: 8,
      maxHorasSemanales: 40,
      horaEntrada: '09:00',
      horaSalida: '18:00',
      descansoInicio: '13:00',
      descansoFin: '14:00',
      descansoMin: 60,
      toleranciaRetrasoMin: 5,
      timezone: 'America/Mexico_City',
    },
    {
      id: 'jor_flex_lima',
      oficinaId: 'ofi_lima',
      nombre: 'Jornada flexible',
      tipo: 'FLEXIBLE',
      maxHorasDiarias: 8,
      maxHorasSemanales: 40,
      horaEntrada: null,
      horaSalida: null,
      descansoInicio: null,
      descansoFin: null,
      descansoMin: 45,
      toleranciaRetrasoMin: 5,
      timezone: 'America/Lima',
    },
  ]);

  await db.insert(politicaCheckIn).values([
    {
      id: 'pol_cdmx',
      oficinaId: 'ofi_cdmx',
      canales: ['WEB', 'MOVIL', 'KIOSCO'],
      nivel: 'LOGIN_FACIAL',
      enforcement: 'FLAG',
      fallbackHabilitado: true,
    },
    {
      id: 'pol_lima',
      oficinaId: 'ofi_lima',
      canales: ['WEB', 'MOVIL'],
      nivel: 'LOGIN_GEO',
      enforcement: 'FLAG',
      fallbackHabilitado: true,
    },
  ]);

  // Todos los empleados de demostración comparten la contraseña "demo1234".
  const DEMO_HASH = await hash('demo1234', 10);

  await db.insert(empleado).values([
    { id: 'emp_andres', empresaId: 'empresa_kaypi', oficinaId: 'ofi_cdmx', jornadaId: 'jor_fija_cdmx', nombre: 'Andrés Barros', email: 'andres@kaypi.demo', passwordHash: DEMO_HASH, rol: 'ADMIN', qrSecret: nuevoQrSecret() },
    { id: 'emp_julian', empresaId: 'empresa_kaypi', oficinaId: 'ofi_cdmx', jornadaId: 'jor_fija_cdmx', nombre: 'Julián Restrepo', email: 'julian@kaypi.demo', passwordHash: DEMO_HASH, rol: 'MANAGER', qrSecret: nuevoQrSecret() },
    { id: 'emp_felipe', empresaId: 'empresa_kaypi', oficinaId: 'ofi_cdmx', jornadaId: 'jor_fija_cdmx', nombre: 'Felipe Gómez', email: 'felipe@kaypi.demo', passwordHash: DEMO_HASH, rol: 'EMPLEADO', qrSecret: nuevoQrSecret() },
    { id: 'emp_lucia', empresaId: 'empresa_kaypi', oficinaId: 'ofi_lima', jornadaId: 'jor_flex_lima', nombre: 'Lucía Quispe', email: 'lucia@kaypi.demo', passwordHash: DEMO_HASH, rol: 'EMPLEADO', qrSecret: nuevoQrSecret() },
    { id: 'emp_marco', empresaId: 'empresa_kaypi', oficinaId: 'ofi_lima', jornadaId: 'jor_flex_lima', nombre: 'Marco Salas', email: 'marco@kaypi.demo', passwordHash: DEMO_HASH, rol: 'EMPLEADO', qrSecret: nuevoQrSecret() },
  ]);

  await db.insert(kiosco).values([
    { id: 'kio_cdmx_01', oficinaId: 'ofi_cdmx', nombre: 'Recepción CDMX', status: 'active' },
    { id: 'kio_lima_01', oficinaId: 'ofi_lima', nombre: 'Recepción Lima', status: 'active' },
  ]);

  const eventos: NuevoCheckInEvent[] = [
    // Julián (CDMX): día normal, día con retraso, día con horas extra
    ...diaCDMX('emp_julian', '2026-06-08', { in: '08:58', out: '18:05', conBreak: true }),
    ...diaCDMX('emp_julian', '2026-06-09', { in: '09:22', out: '18:00', conBreak: true, flags: ['retraso'] }),
    ...diaCDMX('emp_julian', '2026-06-10', { in: '08:55', out: '20:30', conBreak: true }),
    // Felipe (CDMX): día normal, (06-09 FALTA → sin marcajes), día fuera de geofence
    ...diaCDMX('emp_felipe', '2026-06-08', { in: '09:01', out: '18:00' }),
    ...diaCDMX('emp_felipe', '2026-06-10', { in: '09:00', out: '18:10', geofenceOk: false, flags: ['fuera_geofence'] }),
    // Andrés (CDMX): día largo con descanso
    ...diaCDMX('emp_andres', '2026-06-10', { in: '08:30', out: '19:00', conBreak: true }),
    // Lucía (Lima, flexible/geo)
    ...diaLima('emp_lucia', '2026-06-09', { in: '10:00', out: '16:00' }),
    ...diaLima('emp_lucia', '2026-06-10', { in: '09:30', out: '17:30', conBreak: true }),
    // Marco (Lima, flexible/geo)
    ...diaLima('emp_marco', '2026-06-10', { in: '11:00', out: '19:00', conBreak: true }),
  ];
  await db.insert(checkInEvent).values(eventos);

  // Un código de fallback vigente (ejemplo para las utilidades de C)
  const ahora = new Date();
  await db.insert(codigoFallback).values({
    id: randomUUID(),
    oficinaId: 'ofi_cdmx',
    codigo: '4823',
    generadoEn: ahora.toISOString(),
    validoHasta: new Date(ahora.getTime() + 5 * 60_000).toISOString(),
  });

  // Una entrada de auditoría de ejemplo (un check-in manual)
  await db.insert(auditLog).values({
    id: randomUUID(),
    entidad: 'checkin_event',
    entidadId: eventos[0]?.id ?? 'n/a',
    accion: 'SEED',
    actorId: 'emp_andres',
    detalle: { nota: 'Datos de demostración cargados por el seed' },
  });

  console.log(
    `✓ Seed listo: 1 empresa · 2 oficinas · 2 jornadas · 2 políticas · 5 empleados · 2 kioscos · ${eventos.length} marcajes · 1 código fallback`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('✗ Error en el seed:', e);
    process.exit(1);
  });
