import { asc } from 'drizzle-orm';
import { db, oficina } from '@kaypi/db';
import { crearPolitica } from '../actions';
import { PoliticaForm } from '../_components/politica-form';

export default async function NuevaPoliticaPage() {
  const oficinas = await db.query.oficina.findMany({
    columns: { id: true, nombre: true },
    orderBy: [asc(oficina.nombre)],
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nueva política</h1>
        <p className="text-muted-foreground">Define canales, nivel y enforcement para una oficina.</p>
      </div>
      <PoliticaForm action={crearPolitica} oficinas={oficinas} submitLabel="Crear política" />
    </div>
  );
}
