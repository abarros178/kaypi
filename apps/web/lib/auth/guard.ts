import { redirect } from 'next/navigation';
import { getCurrentUser } from './current-user';

/**
 * Exige sesión con rol administrativo. Se llama dentro de cada Server Action
 * (defensa en profundidad: no se confía solo en el middleware/layout).
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.rol === 'EMPLEADO') redirect('/');
  return user;
}
