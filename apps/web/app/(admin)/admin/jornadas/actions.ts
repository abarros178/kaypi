'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db, jornada } from '@kaypi/db';
import { requireAdmin } from '@/lib/auth/guard';
import { aFieldErrors, type FormState } from '@/lib/forms';
import { JornadaSchema, normalizarJornada } from '@/lib/validation/jornada';

function leer(formData: FormData) {
  return {
    oficinaId: formData.get('oficinaId'),
    nombre: formData.get('nombre'),
    tipo: formData.get('tipo'),
    maxHorasDiarias: formData.get('maxHorasDiarias'),
    maxHorasSemanales: formData.get('maxHorasSemanales'),
    horaEntrada: formData.get('horaEntrada') || undefined,
    horaSalida: formData.get('horaSalida') || undefined,
    descansoInicio: formData.get('descansoInicio') || undefined,
    descansoFin: formData.get('descansoFin') || undefined,
    descansoMin: formData.get('descansoMin') || undefined,
    toleranciaRetrasoMin: formData.get('toleranciaRetrasoMin') || 5,
  };
}

export async function crearJornada(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = JornadaSchema.safeParse(leer(formData));
  if (!parsed.success) return { error: 'Revisa los campos', fieldErrors: aFieldErrors(parsed.error) };

  await db.insert(jornada).values({ id: `jor_${randomUUID().slice(0, 8)}`, ...normalizarJornada(parsed.data) });
  revalidatePath('/admin/jornadas');
  redirect('/admin/jornadas');
}

export async function actualizarJornada(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = JornadaSchema.safeParse(leer(formData));
  if (!parsed.success) return { error: 'Revisa los campos', fieldErrors: aFieldErrors(parsed.error) };

  await db.update(jornada).set(normalizarJornada(parsed.data)).where(eq(jornada.id, id));
  revalidatePath('/admin/jornadas');
  redirect('/admin/jornadas');
}

export async function eliminarJornada(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  try {
    await db.delete(jornada).where(eq(jornada.id, id));
    revalidatePath('/admin/jornadas');
    return { ok: true };
  } catch {
    return { ok: false, error: 'No se puede eliminar: tiene empleados asignados.' };
  }
}
