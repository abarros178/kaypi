import { and, eq } from 'drizzle-orm';
import { db, kiosco } from '@kaypi/db';
import { LectorCliente } from './lector-cliente';

export const dynamic = 'force-dynamic';

export default async function KioscoLectorPage() {
  const kioscoId = process.env.KIOSCO_ID;

  if (!kioscoId) {
    return <ErrorKiosco titulo="KIOSCO_ID no configurado" mensaje="Define KIOSCO_ID en .env del PC del kiosco (ej. kio_cdmx_01)." />;
  }

  const kio = await db.query.kiosco.findFirst({
    where: and(eq(kiosco.id, kioscoId), eq(kiosco.status, 'active')),
    with: { oficina: { columns: { nombre: true } } },
  });

  if (!kio) {
    return <ErrorKiosco titulo="Kiosco no encontrado" mensaje={`No existe un kiosco activo con id "${kioscoId}".`} />;
  }

  return (
    <LectorCliente
      kioscoId={kio.id}
      kioscoNombre={kio.nombre}
      oficinaId={kio.oficinaId}
      oficinaNombre={kio.oficina.nombre}
    />
  );
}

function ErrorKiosco({ titulo, mensaje }: { titulo: string; mensaje: string }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
      <p className="text-sm text-muted-foreground">{mensaje}</p>
    </div>
  );
}
