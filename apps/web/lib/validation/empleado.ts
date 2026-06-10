import { z } from 'zod';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EmpleadoBase = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio'),
  email: z.string().trim().regex(emailRegex, 'Email inválido'),
  rol: z.enum(['ADMIN', 'MANAGER', 'EMPLEADO']),
  oficinaId: z.string().min(1, 'Selecciona una oficina'),
  jornadaId: z.string().optional(),
});

export const EmpleadoCrear = EmpleadoBase.extend({
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

export const EmpleadoEditar = EmpleadoBase.extend({
  password: z.string().optional(),
});

export const ROLES = ['ADMIN', 'MANAGER', 'EMPLEADO'] as const;
