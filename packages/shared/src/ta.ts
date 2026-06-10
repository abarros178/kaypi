/**
 * Motor T&A mínimo (PRD §6.3). Funciones PURAS sobre números/epochs para que sean
 * triviales de testear; el manejo de zona horaria lo hace quien llama (API/reportes)
 * antes de pasar minutos-desde-medianoche-local.
 */
import type { TipoMarcaje } from './enums';

export interface MarcajeLite {
  tipo: TipoMarcaje;
  /** epoch en ms (derivado del servidorUTC). */
  ts: number;
}

/**
 * Minutos trabajados emparejando IN→OUT y restando los tramos BREAK_START→BREAK_END.
 * Tolerante a marcajes impares: ignora los que no cierran par.
 */
export function minutosTrabajados(marcajes: MarcajeLite[]): number {
  const orden = [...marcajes].sort((a, b) => a.ts - b.ts);
  let total = 0;
  let inicioTrabajo: number | null = null;
  let inicioBreak: number | null = null;
  for (const m of orden) {
    if (m.tipo === 'IN' && inicioTrabajo === null) {
      inicioTrabajo = m.ts;
    } else if (m.tipo === 'OUT' && inicioTrabajo !== null) {
      total += m.ts - inicioTrabajo;
      inicioTrabajo = null;
    } else if (m.tipo === 'BREAK_START' && inicioBreak === null) {
      inicioBreak = m.ts;
    } else if (m.tipo === 'BREAK_END' && inicioBreak !== null) {
      total -= m.ts - inicioBreak;
      inicioBreak = null;
    }
  }
  return Math.max(0, Math.round(total / 60_000));
}

export function horasTrabajadas(marcajes: MarcajeLite[]): number {
  return minutosTrabajados(marcajes) / 60;
}

/** Convierte "HH:MM" a minutos desde medianoche. */
export function horaAMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** ¿El primer IN del día llegó tarde? (solo jornada FIJA). */
export function esRetraso(
  primerInMinLocal: number | null,
  horaEntradaMin: number,
  toleranciaMin = 5,
): boolean {
  if (primerInMinLocal === null) return false;
  return primerInMinLocal > horaEntradaMin + toleranciaMin;
}

/** Minutos de retraso netos de la tolerancia (0 si llegó a tiempo). */
export function minutosRetraso(
  primerInMinLocal: number | null,
  horaEntradaMin: number,
  toleranciaMin = 5,
): number {
  if (primerInMinLocal === null) return 0;
  return Math.max(0, primerInMinLocal - (horaEntradaMin + toleranciaMin));
}

/** Falta = día laborable sin ningún IN. (V1: sin integración a permisos.) */
export function esFalta(huboIn: boolean, esDiaLaborable: boolean): boolean {
  return esDiaLaborable && !huboIn;
}

/** Horas extra = lo que excede el máximo (diario o semanal). */
export function horasExtra(horas: number, maxHoras: number): number {
  return Math.max(0, horas - maxHoras);
}
