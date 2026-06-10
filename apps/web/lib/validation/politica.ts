import { z } from 'zod';

export const PoliticaSchema = z.object({
  oficinaId: z.string().min(1, 'Selecciona una oficina'),
  canales: z.array(z.enum(['WEB', 'MOVIL', 'KIOSCO'])).min(1, 'Selecciona al menos un canal'),
  nivel: z.enum(['SOLO_LOGIN', 'LOGIN_GEO', 'LOGIN_FACIAL']),
  enforcement: z.enum(['BLOCK', 'FLAG']),
  fallbackHabilitado: z.boolean(),
});

export type PoliticaInput = z.infer<typeof PoliticaSchema>;

export const NIVELES = [
  { value: 'SOLO_LOGIN', label: 'Solo login' },
  { value: 'LOGIN_GEO', label: 'Login + geo' },
  { value: 'LOGIN_FACIAL', label: 'Login + facial' },
] as const;

export const CANALES = ['WEB', 'MOVIL', 'KIOSCO'] as const;
