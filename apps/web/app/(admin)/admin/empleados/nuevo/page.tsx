import { asc } from 'drizzle-orm';
import { db, jornada, oficina } from '@kaypi/db';
import { crearEmpleado } from '../actions';
import { EmpleadoForm } from '../_components/empleado-form';

export default async function NuevoEmpleadoPage() {
  const [oficinas, jornadasRaw] = await Promise.all([
    db.query.oficina.findMany({ columns: { id: true, nombre: true }, orderBy: [asc(oficina.nombre)] }),
    db.query.jornada.findMany({
      columns: { id: true, nombre: true },
      with: { oficina: { columns: { nombre: true } } },
      orderBy: [asc(jornada.nombre)],
    }),
  ]);
  const jornadas = jornadasRaw.map((j) => ({ id: j.id, nombre: j.nombre, oficinaNombre: j.oficina.nombre }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo empleado</h1>
        <p className="text-muted-foreground">Datos de acceso, rol y asignación.</p>
      </div>
      <EmpleadoForm action={crearEmpleado} oficinas={oficinas} jornadas={jornadas} submitLabel="Crear empleado" />
    </div>
  );
}
