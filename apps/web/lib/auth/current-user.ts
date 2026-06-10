import { cache } from 'react';
import { eq } from 'drizzle-orm';
import { db, empleado } from '@kaypi/db';
import { getSession } from './session';

/**
 * Usuario actual (sesión + fila fresca de la DB). Cacheado por render con React.cache
 * para no consultar la DB más de una vez por petición.
 */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const user = await db.query.empleado.findFirst({
    where: eq(empleado.id, session.empleadoId),
    columns: { id: true, nombre: true, email: true, rol: true, oficinaId: true },
  });
  return user ?? null;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
