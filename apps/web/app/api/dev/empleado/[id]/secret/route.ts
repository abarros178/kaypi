import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, empleado } from '@kaypi/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Endpoint demo: devuelve el `qrSecret` + perfil mínimo del empleado para que la
 * página /kiosco/qr pueda firmar el QR rotativo en el cliente con Web Crypto.
 *
 * PoC — el secreto del empleado viviría normalmente solo en su dispositivo tras
 * login. Aquí lo exponemos a propósito para que la vitrina funcione en cualquier
 * entorno (dev local y Vercel).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const emp = await db.query.empleado.findFirst({ where: eq(empleado.id, id) });
  if (!emp) {
    return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
  }

  return NextResponse.json({
    id: emp.id,
    nombre: emp.nombre,
    oficinaId: emp.oficinaId,
    qrSecret: emp.qrSecret,
  });
}
