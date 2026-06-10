import type { ZodError } from 'zod';

/** Estado común de los formularios con Server Actions + useActionState. */
export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

/** Convierte issues de zod a un mapa campo → mensajes (independiente de la versión de zod). */
export function aFieldErrors(error: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_');
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
