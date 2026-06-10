import { z } from 'zod';

export const JornadaSchema = z
  .object({
    oficinaId: z.string().min(1, 'Selecciona una oficina'),
    nombre: z.string().trim().min(1, 'El nombre es obligatorio'),
    tipo: z.enum(['FIJA', 'FLEXIBLE']),
    maxHorasDiarias: z.coerce.number().positive('Debe ser mayor a 0'),
    maxHorasSemanales: z.coerce.number().positive('Debe ser mayor a 0'),
    horaEntrada: z.string().optional(),
    horaSalida: z.string().optional(),
    descansoInicio: z.string().optional(),
    descansoFin: z.string().optional(),
    descansoMin: z.coerce.number().int().nonnegative().optional(),
    toleranciaRetrasoMin: z.coerce.number().int().nonnegative(),
  })
  .refine((d) => d.tipo === 'FLEXIBLE' || (!!d.horaEntrada && !!d.horaSalida), {
    message: 'Entrada y salida son obligatorias en jornada fija',
    path: ['horaEntrada'],
  });

export type JornadaInput = z.infer<typeof JornadaSchema>;

/** Normaliza para la DB: una jornada FLEXIBLE no guarda horarios. */
export function normalizarJornada(d: JornadaInput) {
  const flexible = d.tipo === 'FLEXIBLE';
  return {
    oficinaId: d.oficinaId,
    nombre: d.nombre,
    tipo: d.tipo,
    maxHorasDiarias: d.maxHorasDiarias,
    maxHorasSemanales: d.maxHorasSemanales,
    horaEntrada: flexible ? null : d.horaEntrada ?? null,
    horaSalida: flexible ? null : d.horaSalida ?? null,
    descansoInicio: flexible ? null : d.descansoInicio ?? null,
    descansoFin: flexible ? null : d.descansoFin ?? null,
    descansoMin: d.descansoMin ?? null,
    toleranciaRetrasoMin: d.toleranciaRetrasoMin,
  };
}
