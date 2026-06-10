'use server';

import { randomBytes, randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db, empleado } from '@kaypi/db';
import { requireAdmin } from '@/lib/auth/guard';
import { hashPassword } from '@/lib/auth/password';
import { aFieldErrors, type FormState } from '@/lib/forms';
import { EmpleadoCrear, EmpleadoEditar } from '@/lib/validation/empleado';

const EMPRESA_ID = 'empresa_kaypi';

function leer(formData: FormData) {
  return {
    nombre: formData.get('nombre'),
    email: formData.get('email'),
    rol: formData.get('rol'),
    oficinaId: formData.get('oficinaId'),
    jornadaId: formData.get('jornadaId') || undefined,
    password: formData.get('password') || undefined,
  };
}

export async function crearEmpleado(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = EmpleadoCrear.safeParse(leer(formData));
  if (!parsed.success) return { error: 'Revisa los campos', fieldErrors: aFieldErrors(parsed.error) };
  const d = parsed.data;

  try {
    await db.insert(empleado).values({
      id: `emp_${randomUUID().slice(0, 8)}`,
      empresaId: EMPRESA_ID,
      nombre: d.nombre,
      email: d.email.toLowerCase(),
      rol: d.rol,
      oficinaId: d.oficinaId,
      jornadaId: d.jornadaId ?? null,
      passwordHash: await hashPassword(d.password),
      // Secreto HMAC para el QR del kiosco (lo usa el flujo de Julián; cada empleado el suyo).
      qrSecret: randomBytes(32).toString('base64'),
    });
  } catch {
    return { error: 'No se pudo crear (¿el email ya está registrado?)' };
  }

  revalidatePath('/admin/empleados');
  redirect('/admin/empleados');
}

export async function actualizarEmpleado(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = EmpleadoEditar.safeParse(leer(formData));
  if (!parsed.success) return { error: 'Revisa los campos', fieldErrors: aFieldErrors(parsed.error) };
  const d = parsed.data;

  try {
    await db
      .update(empleado)
      .set({
        nombre: d.nombre,
        email: d.email.toLowerCase(),
        rol: d.rol,
        oficinaId: d.oficinaId,
        jornadaId: d.jornadaId ?? null,
        ...(d.password ? { passwordHash: await hashPassword(d.password) } : {}),
      })
      .where(eq(empleado.id, id));
  } catch {
    return { error: 'No se pudo guardar (¿email duplicado?)' };
  }

  revalidatePath('/admin/empleados');
  redirect('/admin/empleados');
}

export async function eliminarEmpleado(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  try {
    await db.delete(empleado).where(eq(empleado.id, id));
    revalidatePath('/admin/empleados');
    return { ok: true };
  } catch {
    return { ok: false, error: 'No se puede eliminar: tiene marcajes asociados.' };
  }
}
