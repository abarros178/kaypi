'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { compensacion, db } from '@kaypi/db';
import { requireAdmin } from '@/lib/auth/guard';
import { aFieldErrors, type FormState } from '@/lib/forms';
import { CompensacionSchema } from '@/lib/validation/compensacion';

export async function guardarCompensacion(
  empleadoId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = CompensacionSchema.safeParse({
    tipoSalario: formData.get('tipoSalario'),
    monto: formData.get('monto'),
    moneda: formData.get('moneda'),
    periodoPago: formData.get('periodoPago'),
    multiplicadorExtra: formData.get('multiplicadorExtra'),
    horasMesBase: formData.get('horasMesBase') || 240,
  });
  if (!parsed.success) return { error: 'Revisa los campos', fieldErrors: aFieldErrors(parsed.error) };

  const existe = await db.query.compensacion.findFirst({
    where: eq(compensacion.empleadoId, empleadoId),
  });
  if (existe) {
    await db.update(compensacion).set(parsed.data).where(eq(compensacion.empleadoId, empleadoId));
  } else {
    await db.insert(compensacion).values({ id: `comp_${randomUUID().slice(0, 8)}`, empleadoId, ...parsed.data });
  }

  revalidatePath('/admin/nomina');
  redirect('/admin/nomina');
}
