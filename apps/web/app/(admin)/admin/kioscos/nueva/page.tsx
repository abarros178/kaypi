import { asc } from 'drizzle-orm';
import { db, oficina } from '@kaypi/db';
import { crearKiosco } from '../actions';
import { KioscoForm } from '../_components/kiosco-form';

export default async function NuevoKioscoPage() {
  const oficinas = await db.query.oficina.findMany({
    columns: { id: true, nombre: true },
    orderBy: [asc(oficina.nombre)],
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo kiosco</h1>
        <p className="text-muted-foreground">Registra una estación de marcaje y asígnala a una oficina.</p>
      </div>
      <KioscoForm action={crearKiosco} oficinas={oficinas} submitLabel="Crear kiosco" />
    </div>
  );
}
