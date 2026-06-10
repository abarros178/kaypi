'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db, politicaCheckIn } from '@kaypi/db';
import { requireAdmin } from '@/lib/auth/guard';
import { aFieldErrors, type FormState } from '@/lib/forms';
import { PoliticaSchema } from '@/lib/validation/politica';

function leer(formData: FormData) {
  return {
    oficinaId: formData.get('oficinaId'),
    canales: formData.getAll('canales'),
    nivel: formData.get('nivel'),
    enforcement: formData.get('enforcement'),
    fallbackHabilitado: formData.get('fallbackHabilitado') === 'on',
  };
}

export async function crearPolitica(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = PoliticaSchema.safeParse(leer(formData));
  if (!parsed.success) return { error: 'Revisa los campos', fieldErrors: aFieldErrors(parsed.error) };

  // Una política por oficina.
  const existe = await db.query.politicaCheckIn.findFirst({
    where: eq(politicaCheckIn.oficinaId, parsed.data.oficinaId),
  });
  if (existe) return { error: 'Esa oficina ya tiene una política. Edítala en su lugar.' };

  await db.insert(politicaCheckIn).values({ id: `pol_${randomUUID().slice(0, 8)}`, ...parsed.data });
  revalidatePath('/admin/politicas');
  redirect('/admin/politicas');
}

export async function actualizarPolitica(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = PoliticaSchema.safeParse(leer(formData));
  if (!parsed.success) return { error: 'Revisa los campos', fieldErrors: aFieldErrors(parsed.error) };

  await db.update(politicaCheckIn).set(parsed.data).where(eq(politicaCheckIn.id, id));
  revalidatePath('/admin/politicas');
  redirect('/admin/politicas');
}

export async function eliminarPolitica(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  try {
    await db.delete(politicaCheckIn).where(eq(politicaCheckIn.id, id));
    revalidatePath('/admin/politicas');
    return { ok: true };
  } catch {
    return { ok: false, error: 'No se pudo eliminar la política.' };
  }
}
