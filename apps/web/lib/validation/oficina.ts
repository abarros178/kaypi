import { z } from 'zod';

export const OficinaSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio'),
  direccion: z.string().trim().optional(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  geofenceRadiusM: z.coerce.number().int('Debe ser un entero').positive('Debe ser mayor a 0'),
  timezone: z.string().trim().min(1, 'La zona horaria es obligatoria'),
});

export type OficinaInput = z.infer<typeof OficinaSchema>;

export interface OficinaFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

/** Convierte issues de zod a un mapa campo → mensajes (independiente de la versión de zod). */
export function aFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_');
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
