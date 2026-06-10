import { cookies } from 'next/headers';
import { SESSION_COOKIE, signSession, verifySession, type SessionData } from './jwt';

/** Maneja la cookie de sesión (server-only: usa next/headers). */

const MAX_AGE = 60 * 60 * 24 * 7; // 7 días

export async function createSession(data: Pick<SessionData, 'empleadoId' | 'rol' | 'nombre'>) {
  const token = await signSession(data);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function getSession(): Promise<SessionData | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return token ? verifySession(token) : null;
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
