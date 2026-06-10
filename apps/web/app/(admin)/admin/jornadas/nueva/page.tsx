import { asc } from 'drizzle-orm';
import { db, oficina } from '@kaypi/db';
import { crearJornada } from '../actions';
import { JornadaForm } from '../_components/jornada-form';

export default async function NuevaJornadaPage() {
  const oficinas = await db.query.oficina.findMany({
    columns: { id: true, nombre: true },
    orderBy: [asc(oficina.nombre)],
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nueva jornada</h1>
        <p className="text-muted-foreground">Tipo de horario y máximos para una oficina.</p>
      </div>
      <JornadaForm action={crearJornada} oficinas={oficinas} submitLabel="Crear jornada" />
    </div>
  );
}
