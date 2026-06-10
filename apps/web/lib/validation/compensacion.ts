import { z } from 'zod';

export const CompensacionSchema = z.object({
  tipoSalario: z.enum(['POR_HORA', 'MENSUAL']),
  monto: z.coerce.number().positive('Debe ser mayor a 0'),
  moneda: z.string().trim().min(1).max(3),
  periodoPago: z.enum(['DIARIO', 'QUINCENAL', 'MENSUAL']),
  multiplicadorExtra: z.coerce.number().min(1, 'Debe ser ≥ 1'),
  horasMesBase: z.coerce.number().positive(),
});

export type CompensacionInput = z.infer<typeof CompensacionSchema>;

export const MONEDAS = ['MXN', 'COP', 'PEN', 'USD'] as const;
