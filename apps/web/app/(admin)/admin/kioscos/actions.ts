'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db, kiosco } from '@kaypi/db';
import { requireAdmin } from '@/lib/auth/guard';
import { aFieldErrors, type FormState } from '@/lib/forms';
import { KioscoSchema } from '@/lib/validation/kiosco';

function leer(formData: FormData) {
  return {
    nombre: formData.get('nombre'),
    oficinaId: formData.get('oficinaId'),
    status: formData.get('status'),
  };
}

export async function crearKiosco(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = KioscoSchema.safeParse(leer(formData));
  if (!parsed.success) return { error: 'Revisa los campos', fieldErrors: aFieldErrors(parsed.error) };

  await db.insert(kiosco).values({ id: `kio_${randomUUID().slice(0, 8)}`, ...parsed.data });
  revalidatePath('/admin/kioscos');
  redirect('/admin/kioscos');
}

export async function actualizarKiosco(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = KioscoSchema.safeParse(leer(formData));
  if (!parsed.success) return { error: 'Revisa los campos', fieldErrors: aFieldErrors(parsed.error) };

  await db.update(kiosco).set(parsed.data).where(eq(kiosco.id, id));
  revalidatePath('/admin/kioscos');
  redirect('/admin/kioscos');
}

export async function eliminarKiosco(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  try {
    await db.delete(kiosco).where(eq(kiosco.id, id));
    revalidatePath('/admin/kioscos');
    return { ok: true };
  } catch {
    return { ok: false, error: 'No se puede eliminar: tiene marcajes/QR asociados.' };
  }
}
