import {
  CheckInEventSchema,
  CheckInInputSchema,
  type CheckInEvent,
  type CheckInInput,
} from './checkin';

export interface CheckInOk {
  ok: true;
  event: CheckInEvent;
}
export interface CheckInErr {
  ok: false;
  error: string;
  /** true cuando enforcement=BLOCK rechazó el marcaje (HTTP 422). */
  rechazado?: boolean;
}
export type CheckInResultado = CheckInOk | CheckInErr;

/**
 * Cliente ÚNICO que todos los canales (web/móvil/kiosco) usan para enviar un marcaje.
 * Valida el input contra el contrato antes de salir a la red y valida la respuesta
 * contra el evento canónico — así los tres workstreams comparten exactamente el mismo flujo.
 */
export async function postCheckIn(
  baseUrl: string,
  input: CheckInInput,
  init?: RequestInit,
): Promise<CheckInResultado> {
  const parsed = CheckInInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: `Input inválido: ${parsed.error.message}` };
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/checkin`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(parsed.data),
      ...init,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error de red' };
  }

  const json = (await res.json().catch(() => null)) as { event?: unknown; error?: string } | null;
  if (!res.ok) {
    return { ok: false, error: json?.error ?? `HTTP ${res.status}`, rechazado: res.status === 422 };
  }

  const event = CheckInEventSchema.safeParse(json?.event ?? json);
  if (!event.success) {
    return { ok: false, error: 'La respuesta del servidor no cumple el evento canónico' };
  }
  return { ok: true, event: event.data };
}

/** Genera un eventId (uuid) para idempotencia desde el cliente. */
export function nuevoEventId(): string {
  return crypto.randomUUID();
}
