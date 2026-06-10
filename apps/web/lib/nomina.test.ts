import { describe, expect, it } from 'vitest';
import { calcularDevengado, rangoPeriodo, tarifaHora, type CompensacionLite } from './nomina';

const porHora: CompensacionLite = {
  tipoSalario: 'POR_HORA',
  monto: 100,
  moneda: 'MXN',
  periodoPago: 'QUINCENAL',
  multiplicadorExtra: 1.25,
  horasMesBase: 240,
};

const mensual: CompensacionLite = {
  tipoSalario: 'MENSUAL',
  monto: 24000,
  moneda: 'MXN',
  periodoPago: 'MENSUAL',
  multiplicadorExtra: 1.5,
  horasMesBase: 240,
};

describe('tarifaHora', () => {
  it('por hora usa el monto directo', () => expect(tarifaHora(porHora)).toBe(100));
  it('mensual deriva monto / horasMesBase', () => expect(tarifaHora(mensual)).toBe(100));
});

describe('calcularDevengado', () => {
  it('ordinario + extra con multiplicador', () => {
    const d = calcularDevengado({ horas: 50, horasExtra: 10 }, porHora);
    expect(d.ordinario).toBe(4000); // 40h × 100
    expect(d.extra).toBe(1250); // 10h × 100 × 1.25
    expect(d.total).toBe(5250);
  });
  it('sin horas extra', () => {
    expect(calcularDevengado({ horas: 8, horasExtra: 0 }, porHora).total).toBe(800);
  });
});

describe('rangoPeriodo', () => {
  it('quincena 1–15', () => {
    const r = rangoPeriodo('QUINCENAL', '2026-06-10');
    expect([r.desde, r.hasta]).toEqual(['2026-06-01', '2026-06-15']);
  });
  it('quincena 16–fin', () => {
    const r = rangoPeriodo('QUINCENAL', '2026-06-20');
    expect([r.desde, r.hasta]).toEqual(['2026-06-16', '2026-06-30']);
  });
  it('mensual respeta fin de mes', () => {
    const r = rangoPeriodo('MENSUAL', '2026-02-10');
    expect([r.desde, r.hasta]).toEqual(['2026-02-01', '2026-02-28']);
  });
});
