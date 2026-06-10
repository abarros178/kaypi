'use server';

import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, empleado } from '@kaypi/db';
import { verifyPassword } from './password';
import { createSession, destroySession } from './session';

const LoginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export interface LoginState {
  error?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { error: 'Completa email y contraseña' };

  const email = parsed.data.email.trim().toLowerCase();
  const user = await db.query.empleado.findFirst({ where: eq(empleado.email, email) });

  // Mensaje genérico (no revelar si el email existe).
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: 'Credenciales incorrectas' };
  }

  await createSession({ empleadoId: user.id, rol: user.rol, nombre: user.nombre });

  const next = formData.get('next');
  redirect(typeof next === 'string' && next.startsWith('/') ? next : '/admin');
}

export async function logoutAction() {
  await destroySession();
  redirect('/login');
}
