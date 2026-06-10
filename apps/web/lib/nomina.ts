/**
 * Motor de pre-nómina (puro, testeable). Convierte las horas verificadas del T&A
 * (`resumenTA` de lib/reportes.ts) en el devengado del período: ordinario + extra.
 * Devengado bruto, NO neto: las deducciones/impuestos son de un motor de nómina externo.
 */

export interface CompensacionLite {
  tipoSalario: 'POR_HORA' | 'MENSUAL';
  monto: number;
  moneda: string;
  periodoPago: 'DIARIO' | 'QUINCENAL' | 'MENSUAL';
  multiplicadorExtra: number;
  horasMesBase: number;
}

export function tarifaHora(c: CompensacionLite): number {
  return c.tipoSalario === 'POR_HORA' ? c.monto : c.monto / c.horasMesBase;
}

export interface Devengado {
  tarifa: number;
  ordinario: number;
  extra: number;
  total: number;
  moneda: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function calcularDevengado(
  horas: { horas: number; horasExtra: number },
  c: CompensacionLite,
): Devengado {
  const tarifa = tarifaHora(c);
  const horasOrd = Math.max(0, horas.horas - horas.horasExtra);
  const ordinario = horasOrd * tarifa;
  const extra = horas.horasExtra * tarifa * c.multiplicadorExtra;
  return {
    tarifa: r2(tarifa),
    ordinario: r2(ordinario),
    extra: r2(extra),
    total: r2(ordinario + extra),
    moneda: c.moneda,
  };
}

export interface RangoPeriodo {
  desde: string;
  hasta: string;
  etiqueta: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const finDeMes = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Rango del período de pago que contiene `fechaRef` (YYYY-MM-DD). */
export function rangoPeriodo(
  periodo: 'DIARIO' | 'QUINCENAL' | 'MENSUAL',
  fechaRef: string,
): RangoPeriodo {
  const [y = 2026, m = 1, d = 1] = fechaRef.split('-').map(Number);
  const mm = pad(m);

  if (periodo === 'DIARIO') {
    return { desde: fechaRef, hasta: fechaRef, etiqueta: fechaRef };
  }
  if (periodo === 'MENSUAL') {
    return { desde: `${y}-${mm}-01`, hasta: `${y}-${mm}-${pad(finDeMes(y, m))}`, etiqueta: `${mm}/${y}` };
  }
  // QUINCENAL
  if (d <= 15) {
    return { desde: `${y}-${mm}-01`, hasta: `${y}-${mm}-15`, etiqueta: `1ª quincena ${mm}/${y}` };
  }
  return { desde: `${y}-${mm}-16`, hasta: `${y}-${mm}-${pad(finDeMes(y, m))}`, etiqueta: `2ª quincena ${mm}/${y}` };
}

/** Formatea un monto con su moneda (presentación). */
export function formatoMoneda(monto: number, moneda: string): string {
  try {
    return new Intl.NumberFormat('es', { style: 'currency', currency: moneda, maximumFractionDigits: 2 }).format(monto);
  } catch {
    return `${monto.toFixed(2)} ${moneda}`;
  }
}
