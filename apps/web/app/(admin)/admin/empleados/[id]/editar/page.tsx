import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { db, empleado, jornada, oficina } from '@kaypi/db';
import { actualizarEmpleado } from '../../actions';
import { EmpleadoForm } from '../../_components/empleado-form';

export default async function EditarEmpleadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [e, oficinas, jornadasRaw] = await Promise.all([
    db.query.empleado.findFirst({ where: eq(empleado.id, id) }),
    db.query.oficina.findMany({ columns: { id: true, nombre: true }, orderBy: [asc(oficina.nombre)] }),
    db.query.jornada.findMany({
      columns: { id: true, nombre: true },
      with: { oficina: { columns: { nombre: true } } },
      orderBy: [asc(jornada.nombre)],
    }),
  ]);
  if (!e) notFound();

  const jornadas = jornadasRaw.map((j) => ({ id: j.id, nombre: j.nombre, oficinaNombre: j.oficina.nombre }));
  const action = actualizarEmpleado.bind(null, e.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editar empleado</h1>
        <p className="text-muted-foreground">{e.nombre}</p>
      </div>
      <EmpleadoForm
        action={action}
        oficinas={oficinas}
        jornadas={jornadas}
        esEdicion
        submitLabel="Guardar cambios"
        defaults={{
          nombre: e.nombre,
          email: e.email,
          rol: e.rol,
          oficinaId: e.oficinaId,
          jornadaId: e.jornadaId ?? undefined,
        }}
      />
    </div>
  );
}
