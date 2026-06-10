import { describe, expect, it } from 'vitest';
import { generarQR, parsearQR, verificarHMAC, QR_HMAC_LEN } from './kiosco-qr';

const SECRET_A = 'YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE='; // 32 'a's base64
const SECRET_B = 'YmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmI='; // 32 'b's base64

const FIXED_NONCE = new Uint8Array([1, 2, 3, 4, 5, 6]);
const FIXED_TS = 1738023400123;

describe('generarQR', () => {
  it('produce un QR con 6 segmentos separados por punto', async () => {
    const { qr } = await generarQR({
      empleadoId: 'emp_andres',
      tipo: 'IN',
      qrSecret: SECRET_A,
      ts: FIXED_TS,
      nonceBytes: FIXED_NONCE,
    });
    expect(qr.split('.')).toHaveLength(6);
  });

  it('codifica empIdPrefix de 8 chars y la versión v1', async () => {
    const { qr } = await generarQR({
      empleadoId: 'emp_andres',
      tipo: 'IN',
      qrSecret: SECRET_A,
      ts: FIXED_TS,
      nonceBytes: FIXED_NONCE,
    });
    const [v, empIdPrefix] = qr.split('.');
    expect(v).toBe('v1');
    expect(empIdPrefix).toBe('emp_andr');
  });

  it('mapea cada tipo a su char correcto', async () => {
    const tipos = [
      { tipo: 'IN' as const, char: 'I' },
      { tipo: 'OUT' as const, char: 'O' },
      { tipo: 'BREAK_START' as const, char: 'S' },
      { tipo: 'BREAK_END' as const, char: 'E' },
    ];
    for (const { tipo, char } of tipos) {
      const { qr } = await generarQR({
        empleadoId: 'emp_andres',
        tipo,
        qrSecret: SECRET_A,
        ts: FIXED_TS,
        nonceBytes: FIXED_NONCE,
      });
      expect(qr.split('.')[2]).toBe(char);
    }
  });

  it('genera QRs distintos cuando cambia el nonce (rotación)', async () => {
    const a = await generarQR({
      empleadoId: 'emp_andres',
      tipo: 'IN',
      qrSecret: SECRET_A,
      ts: FIXED_TS,
      nonceBytes: new Uint8Array([1, 1, 1, 1, 1, 1]),
    });
    const b = await generarQR({
      empleadoId: 'emp_andres',
      tipo: 'IN',
      qrSecret: SECRET_A,
      ts: FIXED_TS,
      nonceBytes: new Uint8Array([2, 2, 2, 2, 2, 2]),
    });
    expect(a.qr).not.toBe(b.qr);
  });

  it('queda compacto (< 80 chars en el caso común)', async () => {
    const { qr } = await generarQR({
      empleadoId: 'emp_andres',
      tipo: 'IN',
      qrSecret: SECRET_A,
    });
    expect(qr.length).toBeLessThan(80);
  });
});

describe('parsearQR', () => {
  it('parsea un QR válido y devuelve el tipo expandido', async () => {
    const { qr } = await generarQR({
      empleadoId: 'emp_julian',
      tipo: 'OUT',
      qrSecret: SECRET_A,
      ts: FIXED_TS,
      nonceBytes: FIXED_NONCE,
    });
    const p = parsearQR(qr);
    expect(p).not.toBeNull();
    expect(p?.version).toBe('v1');
    expect(p?.empIdPrefix).toBe('emp_juli');
    expect(p?.tipo).toBe('OUT');
    expect(p?.ts).toBe(FIXED_TS);
    expect(p?.hmac.length).toBe(QR_HMAC_LEN);
  });

  it('devuelve null si faltan segmentos', () => {
    expect(parsearQR('v1.emp_juli.I.lph23')).toBeNull();
  });

  it('devuelve null si la versión no es v1', () => {
    expect(parsearQR('v0.emp_juli.I.lph23.abc.xxxxxxxxxxxxxxxxxxxxxx')).toBeNull();
  });

  it('devuelve null si el tipoChar no es válido', () => {
    expect(parsearQR('v1.emp_juli.X.lph23.abc.xxxxxxxxxxxxxxxxxxxxxx')).toBeNull();
  });

  it('devuelve null si empIdPrefix no mide 8 chars', () => {
    expect(parsearQR('v1.emp.I.lph23.abc.xxxxxxxxxxxxxxxxxxxxxx')).toBeNull();
  });
});

describe('verificarHMAC', () => {
  it('acepta un QR firmado con el secreto correcto', async () => {
    const { qr } = await generarQR({
      empleadoId: 'emp_andres',
      tipo: 'IN',
      qrSecret: SECRET_A,
    });
    expect(await verificarHMAC(qr, SECRET_A)).toBe(true);
  });

  it('rechaza si el secreto es distinto', async () => {
    const { qr } = await generarQR({
      empleadoId: 'emp_andres',
      tipo: 'IN',
      qrSecret: SECRET_A,
    });
    expect(await verificarHMAC(qr, SECRET_B)).toBe(false);
  });

  it('rechaza si se mutó el tipo', async () => {
    const { qr } = await generarQR({
      empleadoId: 'emp_andres',
      tipo: 'IN',
      qrSecret: SECRET_A,
    });
    // Mutar solo el char de tipo (segmento 2). El HMAC original ya no aplica.
    const parts = qr.split('.');
    parts[2] = 'O';
    expect(await verificarHMAC(parts.join('.'), SECRET_A)).toBe(false);
  });

  it('rechaza si se mutó el timestamp', async () => {
    const { qr } = await generarQR({
      empleadoId: 'emp_andres',
      tipo: 'IN',
      qrSecret: SECRET_A,
      ts: FIXED_TS,
    });
    const parts = qr.split('.');
    parts[3] = (FIXED_TS + 60_000).toString(36);
    expect(await verificarHMAC(parts.join('.'), SECRET_A)).toBe(false);
  });

  it('rechaza si el QR está mal formado', async () => {
    expect(await verificarHMAC('no-es-un-qr', SECRET_A)).toBe(false);
  });
});
