import { asc } from 'drizzle-orm';
import { db, empleado } from '@kaypi/db';
import { QrDemoCliente } from './qr-demo-cliente';

export const dynamic = 'force-dynamic';

export default async function KioscoQrDemoPage() {
  const empleados = await db.query.empleado.findMany({
    orderBy: [asc(empleado.nombre)],
    with: { oficina: { columns: { nombre: true } } },
  });

  const lista = empleados.map((e) => ({
    id: e.id,
    nombre: e.nombre,
    oficinaId: e.oficinaId,
    oficinaNombre: e.oficina.nombre,
  }));

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">QR del empleado · demo</h1>
        <p className="text-sm text-muted-foreground">
          Simula la pantalla del celular del empleado: selecciona quién eres y el tipo de marcaje;
          el QR rota cada 30 s y se firma con HMAC.
        </p>
      </header>

      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
        <strong>Modo demo:</strong> en producción el <code>qrSecret</code> vive solo en el dispositivo
        del empleado tras login. Aquí el servidor lo entrega por <code>/api/dev/...</code> únicamente
        para esta vitrina.
      </div>

      <QrDemoCliente empleados={lista} />
    </div>
  );
}
