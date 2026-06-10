import type { TipoMarcaje } from './enums';

/**
 * QR del kiosco — formato y crypto.
 *
 * Layout:
 *   v1.{empIdPrefix}.{tipoChar}.{tsB36}.{nonce}.{hmac}
 *
 * - empIdPrefix: primeros 8 chars del id del empleado.
 * - tipoChar:    'I' (IN) | 'O' (OUT) | 'S' (BREAK_START) | 'E' (BREAK_END).
 * - tsB36:       epoch ms en base36 (~9 chars).
 * - nonce:       6 bytes random en base64url (~8 chars).
 * - hmac:        HMAC-SHA256(qrSecret, "v1.{empIdPrefix}.{tipoChar}.{tsB36}.{nonce}")
 *                truncado a 16 bytes, base64url, ~22 chars.
 *
 * El helper usa Web Crypto y funciona igual en Node 18+ y en browsers modernos.
 */

const TIPO_TO_CHAR = {
  IN: 'I',
  OUT: 'O',
  BREAK_START: 'S',
  BREAK_END: 'E',
} as const satisfies Record<TipoMarcaje, string>;

type TipoChar = (typeof TIPO_TO_CHAR)[keyof typeof TIPO_TO_CHAR];

const CHAR_TO_TIPO = {
  I: 'IN',
  O: 'OUT',
  S: 'BREAK_START',
  E: 'BREAK_END',
} as const satisfies Record<TipoChar, TipoMarcaje>;

export const QR_VERSION = 'v1';
export const QR_HMAC_LEN = 22; // base64url de 16 bytes
export const QR_EMP_ID_PREFIX_LEN = 8;

/** Datos parseados del QR (sin verificar firma todavía). */
export interface PayloadQR {
  version: 'v1';
  empIdPrefix: string;
  tipo: TipoMarcaje;
  ts: number;
  nonce: string;
  hmac: string;
}

export interface GenerarQRInput {
  empleadoId: string;
  tipo: TipoMarcaje;
  /** Secreto del empleado (base64, 32 bytes random). */
  qrSecret: string;
  /** Opcional para tests; default = Date.now(). */
  ts?: number;
  /** Opcional para tests; default = 6 bytes random. */
  nonceBytes?: Uint8Array;
}

export interface GenerarQRResult {
  qr: string;
  ts: number;
  nonce: string;
}

/** Genera el string del QR rotativo del empleado. */
export async function generarQR(input: GenerarQRInput): Promise<GenerarQRResult> {
  const ts = input.ts ?? Date.now();
  const empIdPrefix = input.empleadoId.slice(0, QR_EMP_ID_PREFIX_LEN);
  const tipoChar = TIPO_TO_CHAR[input.tipo];
  const nonceRaw = input.nonceBytes ?? randomBytes(6);
  const nonce = bytesToBase64url(nonceRaw);
  const message = `${QR_VERSION}.${empIdPrefix}.${tipoChar}.${ts.toString(36)}.${nonce}`;
  const hmac = (await computeHmac(input.qrSecret, message)).slice(0, QR_HMAC_LEN);
  return { qr: `${message}.${hmac}`, ts, nonce };
}

/** Parsea el QR. Devuelve null si el formato es inválido. NO verifica firma. */
export function parsearQR(qr: string): PayloadQR | null {
  const parts = qr.split('.');
  if (parts.length !== 6) return null;
  const [v, empIdPrefix, tipoChar, tsB36, nonce, hmac] = parts;
  if (v !== QR_VERSION) return null;
  if (!empIdPrefix || empIdPrefix.length !== QR_EMP_ID_PREFIX_LEN) return null;
  if (!isTipoChar(tipoChar)) return null;
  if (!tsB36) return null;
  const ts = parseInt(tsB36, 36);
  if (!Number.isFinite(ts) || ts <= 0) return null;
  if (!nonce || nonce.length < 6) return null;
  if (!hmac || hmac.length !== QR_HMAC_LEN) return null;
  return {
    version: 'v1',
    empIdPrefix,
    tipo: CHAR_TO_TIPO[tipoChar],
    ts,
    nonce,
    hmac,
  };
}

/** Recalcula el HMAC esperado y compara timing-safe contra el del QR. */
export async function verificarHMAC(qr: string, qrSecret: string): Promise<boolean> {
  const parsed = parsearQR(qr);
  if (!parsed) return false;
  const tipoChar = TIPO_TO_CHAR[parsed.tipo];
  const message = `${QR_VERSION}.${parsed.empIdPrefix}.${tipoChar}.${parsed.ts.toString(36)}.${parsed.nonce}`;
  const expected = (await computeHmac(qrSecret, message)).slice(0, QR_HMAC_LEN);
  return timingSafeEqual(expected, parsed.hmac);
}

// --- Internals (Web Crypto + base64url cross-env) -----------------------------

async function computeHmac(secretB64: string, message: string): Promise<string> {
  const secret = base64ToBytes(secretB64);
  const key = await crypto.subtle.importKey(
    'raw',
    secret as unknown as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return bytesToBase64url(new Uint8Array(sig));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  crypto.getRandomValues(out);
  return out;
}

function bytesToBase64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 =
    typeof btoa !== 'undefined' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64ToBytes(s: string): Uint8Array {
  const std = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = std.padEnd(std.length + ((4 - (std.length % 4)) % 4), '=');
  const bin =
    typeof atob !== 'undefined' ? atob(padded) : Buffer.from(padded, 'base64').toString('binary');
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function isTipoChar(c: string | undefined): c is TipoChar {
  return c === 'I' || c === 'O' || c === 'S' || c === 'E';
}
