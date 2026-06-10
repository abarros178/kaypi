'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { auditLog, checkInEvent, db } from '@kaypi/db';
import { requireAdmin } from '@/lib/auth/guard';

async function revisar(id: string, accion: string, detalle: Record<string, unknown>) {
  const user = await requireAdmin();
  await db
    .update(checkInEvent)
    .set({ revisado: true, revisadoPor: user.id, revisadoEn: new Date().toISOString() })
    .where(eq(checkInEvent.id, id));
  // AuditLog append-only: queda la traza de quién revisó y cómo.
  await db.insert(auditLog).values({
    id: `aud_${randomUUID().slice(0, 8)}`,
    entidad: 'checkin_event',
    entidadId: id,
    accion,
    actorId: user.id,
    detalle,
  });
  revalidatePath('/admin/revisiones');
}

export async function aprobarMarcaje(id: string): Promise<{ ok: boolean }> {
  await revisar(id, 'APROBAR_FLAG', { resultado: 'aprobado' });
  return { ok: true };
}

export async function marcarCorreccion(id: string, nota: string): Promise<{ ok: boolean }> {
  await revisar(id, 'MARCAR_CORRECCION', { resultado: 'correccion', nota });
  return { ok: true };
}
