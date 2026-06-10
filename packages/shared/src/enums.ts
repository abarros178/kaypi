import { z } from 'zod';

/**
 * Enums del dominio. Cada uno se exporta como schema zod (valor) y como tipo TS
 * (mismo nombre) para usarse en validación y en tipado indistintamente.
 */

export const TipoMarcaje = z.enum(['IN', 'OUT', 'BREAK_START', 'BREAK_END']);
export type TipoMarcaje = z.infer<typeof TipoMarcaje>;

export const Canal = z.enum(['WEB', 'MOVIL', 'KIOSCO']);
export type Canal = z.infer<typeof Canal>;

/** Nivel de confianza requerido por la política de la oficina. */
export const Nivel = z.enum(['SOLO_LOGIN', 'LOGIN_GEO', 'LOGIN_FACIAL']);
export type Nivel = z.infer<typeof Nivel>;

/** Origen del marcaje. Determina cómo se concilia (offline/manual/etc). */
export const Fuente = z.enum(['NORMAL', 'MANUAL', 'FALLBACK_CODE', 'KIOSCO_OFFLINE']);
export type Fuente = z.infer<typeof Fuente>;

/** Qué hace el sistema cuando un factor del nivel falla. */
export const Enforcement = z.enum(['BLOCK', 'FLAG']);
export type Enforcement = z.infer<typeof Enforcement>;

export const Rol = z.enum(['ADMIN', 'MANAGER', 'EMPLEADO']);
export type Rol = z.infer<typeof Rol>;

export const TipoJornada = z.enum(['FIJA', 'FLEXIBLE']);
export type TipoJornada = z.infer<typeof TipoJornada>;
