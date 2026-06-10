import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

/**
 * Verificación/firma del JWT de sesión. SIN dependencias de Node ni next/headers,
 * para poder usarse tanto en server components como en el middleware (Edge runtime).
 */

export interface SessionData extends JWTPayload {
  empleadoId: string;
  rol: 'ADMIN' | 'MANAGER' | 'EMPLEADO';
  nombre: string;
}

export const SESSION_COOKIE = 'kaypi_session';

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? 'dev-secret-cambiar-en-produccion-kaypi-0000',
);

export function signSession(data: Pick<SessionData, 'empleadoId' | 'rol' | 'nombre'>): Promise<string> {
  return new SignJWT({ empleadoId: data.empleadoId, rol: data.rol, nombre: data.nombre })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as SessionData;
  } catch {
    return null;
  }
}
