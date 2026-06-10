import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, empleado } from '@kaypi/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Endpoint dev: devuelve el `qrSecret` + perfil mínimo del empleado para que la
 * página /kiosco/qr pueda firmar el QR rotativo en el cliente con Web Crypto.
 *
 * MODO DEMO — el secreto del empleado vive normalmente solo en su dispositivo
 * (cacheado tras login). En producción este endpoint NO existe.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not Found', { status: 404 });
  }

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
