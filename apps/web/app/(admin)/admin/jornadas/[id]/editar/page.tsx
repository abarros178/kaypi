import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { db, jornada, oficina } from '@kaypi/db';
import { actualizarJornada } from '../../actions';
import { JornadaForm } from '../../_components/jornada-form';

export default async function EditarJornadaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [j, oficinas] = await Promise.all([
    db.query.jornada.findFirst({ where: eq(jornada.id, id) }),
    db.query.oficina.findMany({ columns: { id: true, nombre: true }, orderBy: [asc(oficina.nombre)] }),
  ]);
  if (!j) notFound();

  const action = actualizarJornada.bind(null, j.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editar jornada</h1>
        <p className="text-muted-foreground">{j.nombre}</p>
      </div>
      <JornadaForm
        action={action}
        oficinas={oficinas}
        submitLabel="Guardar cambios"
        defaults={{
          oficinaId: j.oficinaId,
          nombre: j.nombre,
          tipo: j.tipo,
          maxHorasDiarias: j.maxHorasDiarias,
          maxHorasSemanales: j.maxHorasSemanales,
          horaEntrada: j.horaEntrada ?? undefined,
          horaSalida: j.horaSalida ?? undefined,
          descansoInicio: j.descansoInicio ?? undefined,
          descansoFin: j.descansoFin ?? undefined,
          descansoMin: j.descansoMin ?? undefined,
          toleranciaRetrasoMin: j.toleranciaRetrasoMin,
        }}
      />
    </div>
  );
}
