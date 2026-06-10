'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db, oficina } from '@kaypi/db';
import { requireAdmin } from '@/lib/auth/guard';
import { aFieldErrors, OficinaSchema, type OficinaFormState } from '@/lib/validation/oficina';

// Single-tenant en el V1: todas las oficinas cuelgan de la empresa demo.
const EMPRESA_ID = 'empresa_kaypi';

function leerFormulario(formData: FormData) {
  return {
    nombre: formData.get('nombre'),
    direccion: formData.get('direccion') || undefined,
    lat: formData.get('lat'),
    lng: formData.get('lng'),
    geofenceRadiusM: formData.get('geofenceRadiusM'),
    timezone: formData.get('timezone'),
  };
}

export async function crearOficina(
  _prev: OficinaFormState,
  formData: FormData,
): Promise<OficinaFormState> {
  await requireAdmin();
  const parsed = OficinaSchema.safeParse(leerFormulario(formData));
  if (!parsed.success) return { error: 'Revisa los campos', fieldErrors: aFieldErrors(parsed.error) };

  await db.insert(oficina).values({
    id: `ofi_${randomUUID().slice(0, 8)}`,
    empresaId: EMPRESA_ID,
    ...parsed.data,
  });

  revalidatePath('/admin/oficinas');
  redirect('/admin/oficinas');
}

export async function actualizarOficina(
  id: string,
  _prev: OficinaFormState,
  formData: FormData,
): Promise<OficinaFormState> {
  await requireAdmin();
  const parsed = OficinaSchema.safeParse(leerFormulario(formData));
  if (!parsed.success) return { error: 'Revisa los campos', fieldErrors: aFieldErrors(parsed.error) };

  await db.update(oficina).set(parsed.data).where(eq(oficina.id, id));

  revalidatePath('/admin/oficinas');
  redirect('/admin/oficinas');
}

export async function eliminarOficina(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  try {
    await db.delete(oficina).where(eq(oficina.id, id));
    revalidatePath('/admin/oficinas');
    return { ok: true };
  } catch {
    // Falla típica: la oficina tiene empleados o marcajes asociados (FK).
    return { ok: false, error: 'No se puede eliminar: tiene empleados o marcajes asociados.' };
  }
}
