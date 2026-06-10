import { describe, expect, it } from 'vitest';
import {
  esFalta,
  esRetraso,
  horaAMinutos,
  horasExtra,
  minutosRetraso,
  minutosTrabajados,
} from './ta';

/** epoch en ms para una hora del 2026-06-12 (UTC, basta para diferencias). */
const t = (h: number, m = 0): number => Date.UTC(2026, 5, 12, h, m);

describe('minutosTrabajados', () => {
  it('suma un IN→OUT simple', () => {
    expect(
      minutosTrabajados([
        { tipo: 'IN', ts: t(9) },
        { tipo: 'OUT', ts: t(17) },
      ]),
    ).toBe(8 * 60);
  });

  it('descuenta el descanso BREAK_START→BREAK_END', () => {
    expect(
      minutosTrabajados([
        { tipo: 'IN', ts: t(9) },
        { tipo: 'BREAK_START', ts: t(13) },
        { tipo: 'BREAK_END', ts: t(14) },
        { tipo: 'OUT', ts: t(18) },
      ]),
    ).toBe(8 * 60);
  });

  it('ignora marcajes que no cierran par', () => {
    expect(minutosTrabajados([{ tipo: 'IN', ts: t(9) }])).toBe(0);
  });
});

describe('retraso / falta / extra', () => {
  it('detecta retraso respetando la tolerancia', () => {
    expect(esRetraso(horaAMinutos('09:06'), horaAMinutos('09:00'), 5)).toBe(true);
    expect(esRetraso(horaAMinutos('09:04'), horaAMinutos('09:00'), 5)).toBe(false);
  });

  it('calcula minutos de retraso netos de tolerancia', () => {
    expect(minutosRetraso(horaAMinutos('09:20'), horaAMinutos('09:00'), 5)).toBe(15);
  });

  it('falta = día laborable sin IN', () => {
    expect(esFalta(false, true)).toBe(true);
    expect(esFalta(true, true)).toBe(false);
    expect(esFalta(false, false)).toBe(false);
  });

  it('horas extra sobre el máximo', () => {
    expect(horasExtra(9.5, 8)).toBeCloseTo(1.5);
    expect(horasExtra(7, 8)).toBe(0);
  });
});
