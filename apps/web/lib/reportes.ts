import { horaAMinutos, minutosTrabajados, type TipoMarcaje } from '@kaypi/shared';

/**
 * Agregación T&A para el dashboard (PRD §6.3). Toma los marcajes ya consultados y los
 * cruza con la jornada del empleado y la zona horaria de su oficina. Mantiene la lógica
 * separada de la consulta para poder testearla.
 */

export interface EventoTA {
  empleadoId: string;
  tipo: TipoMarcaje;
  tsServidorUTC: string;
}

export interface EmpleadoTA {
  id: string;
  nombre: string;
  oficinaNombre: string;
  tz: string;
  jornadaTipo: 'FIJA' | 'FLEXIBLE' | null;
  horaEntrada: string | null;
  toleranciaRetrasoMin: number;
  maxHorasDiarias: number;
}

export interface ResumenTA {
  empleadoId: string;
  nombre: string;
  oficina: string;
  diasConMarcaje: number;
  faltas: number;
  retrasos: number;
  horas: number;
  horasExtra: number;
}

/** Componentes de fecha/hora locales (en la tz dada) de un instante UTC. */
function partesLocales(iso: string, tz: string): { fecha: string; minutos: number } {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? '00';
  let hh = get('hour');
  if (hh === '24') hh = '00';
  return {
    fecha: `${get('year')}-${get('month')}-${get('day')}`,
    minutos: Number(hh) * 60 + Number(get('minute')),
  };
}

/** Días "YYYY-MM-DD" entre desde y hasta (inclusive). */
function diasDelRango(desde: string, hasta: string): string[] {
  const out: string[] = [];
  let cursor = new Date(`${desde}T12:00:00Z`).getTime();
  const fin = new Date(`${hasta}T12:00:00Z`).getTime();
  while (cursor <= fin) {
    out.push(new Date(cursor).toISOString().slice(0, 10));
    cursor += 86_400_000;
  }
  return out;
}

/** Lunes a viernes (V1: sin integración a calendario/permisos). */
function esLaborable(fecha: string): boolean {
  const dow = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  return dow >= 1 && dow <= 5;
}

export function resumenTA(
  empleados: EmpleadoTA[],
  eventos: EventoTA[],
  rango: { desde: string; hasta: string },
): ResumenTA[] {
  const laborables = diasDelRango(rango.desde, rango.hasta).filter(esLaborable);

  return empleados.map((emp) => {
    const esFija = emp.jornadaTipo === 'FIJA';
    const entradaMin = emp.horaEntrada ? horaAMinutos(emp.horaEntrada) : null;

    // Agrupar los marcajes del empleado por día local de su oficina.
    const porDia = new Map<string, Array<{ tipo: TipoMarcaje; ts: number; minutos: number }>>();
    for (const e of eventos) {
      if (e.empleadoId !== emp.id) continue;
      const { fecha, minutos } = partesLocales(e.tsServidorUTC, emp.tz);
      if (fecha < rango.desde || fecha > rango.hasta) continue;
      const lista = porDia.get(fecha) ?? [];
      lista.push({ tipo: e.tipo, ts: new Date(e.tsServidorUTC).getTime(), minutos });
      porDia.set(fecha, lista);
    }

    let faltas = 0;
    let retrasos = 0;
    let horas = 0;
    let horasExtra = 0;

    for (const dia of laborables) {
      const marcajes = porDia.get(dia);
      const ins = marcajes?.filter((m) => m.tipo === 'IN') ?? [];
      if (ins.length === 0) {
        if (esFija) faltas++;
        continue;
      }
      const minDia = minutosTrabajados(marcajes!.map((m) => ({ tipo: m.tipo, ts: m.ts })));
      const hDia = minDia / 60;
      horas += hDia;
      horasExtra += Math.max(0, hDia - emp.maxHorasDiarias);

      if (esFija && entradaMin != null) {
        const primerIn = Math.min(...ins.map((m) => m.minutos));
        if (primerIn > entradaMin + emp.toleranciaRetrasoMin) retrasos++;
      }
    }

    return {
      empleadoId: emp.id,
      nombre: emp.nombre,
      oficina: emp.oficinaNombre,
      diasConMarcaje: porDia.size,
      faltas,
      retrasos,
      horas: Math.round(horas * 10) / 10,
      horasExtra: Math.round(horasExtra * 10) / 10,
    };
  });
}

/** Rango por defecto: últimos 7 días hasta `hoy` (YYYY-MM-DD). */
export function rangoPorDefecto(hoyISO: string): { desde: string; hasta: string } {
  const hasta = hoyISO.slice(0, 10);
  const desde = new Date(new Date(`${hasta}T12:00:00Z`).getTime() - 6 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  return { desde, hasta };
}

export type EstadoDia = 'TRABAJADO' | 'RETRASO' | 'FALTA' | 'EXTRA' | 'LIBRE';

export interface FilaCalendario {
  empleadoId: string;
  nombre: string;
  oficina: string;
  dias: Record<string, EstadoDia>;
}

export interface Calendario {
  dias: string[];
  filas: FilaCalendario[];
}

/** Estado por día y empleado para la vista calendario (mismo criterio que resumenTA). */
export function gridSemanal(
  empleados: EmpleadoTA[],
  eventos: EventoTA[],
  rango: { desde: string; hasta: string },
): Calendario {
  const dias = diasDelRango(rango.desde, rango.hasta);

  const filas: FilaCalendario[] = empleados.map((emp) => {
    const esFija = emp.jornadaTipo === 'FIJA';
    const entradaMin = emp.horaEntrada ? horaAMinutos(emp.horaEntrada) : null;

    const porDia = new Map<string, Array<{ tipo: TipoMarcaje; ts: number; minutos: number }>>();
    for (const e of eventos) {
      if (e.empleadoId !== emp.id) continue;
      const { fecha, minutos } = partesLocales(e.tsServidorUTC, emp.tz);
      if (fecha < rango.desde || fecha > rango.hasta) continue;
      const lista = porDia.get(fecha) ?? [];
      lista.push({ tipo: e.tipo, ts: new Date(e.tsServidorUTC).getTime(), minutos });
      porDia.set(fecha, lista);
    }

    const estados: Record<string, EstadoDia> = {};
    for (const dia of dias) {
      const marcajes = porDia.get(dia);
      const ins = marcajes?.filter((m) => m.tipo === 'IN') ?? [];
      if (ins.length === 0) {
        estados[dia] = esLaborable(dia) && esFija ? 'FALTA' : 'LIBRE';
        continue;
      }
      const hDia = minutosTrabajados(marcajes!.map((m) => ({ tipo: m.tipo, ts: m.ts }))) / 60;
      let estado: EstadoDia = 'TRABAJADO';
      if (esFija && entradaMin != null) {
        const primerIn = Math.min(...ins.map((m) => m.minutos));
        if (primerIn > entradaMin + emp.toleranciaRetrasoMin) estado = 'RETRASO';
      }
      if (estado === 'TRABAJADO' && hDia > emp.maxHorasDiarias) estado = 'EXTRA';
      estados[dia] = estado;
    }

    return { empleadoId: emp.id, nombre: emp.nombre, oficina: emp.oficinaNombre, dias: estados };
  });

  return { dias, filas };
}
