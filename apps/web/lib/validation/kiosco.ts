import { z } from 'zod';

export const KioscoSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio'),
  oficinaId: z.string().min(1, 'Selecciona una oficina'),
  status: z.enum(['active', 'inactive']),
});

export type KioscoInput = z.infer<typeof KioscoSchema>;
