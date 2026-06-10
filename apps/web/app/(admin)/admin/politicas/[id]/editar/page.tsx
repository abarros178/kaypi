import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { db, oficina, politicaCheckIn } from '@kaypi/db';
import { actualizarPolitica } from '../../actions';
import { PoliticaForm } from '../../_components/politica-form';

export default async function EditarPoliticaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, oficinas] = await Promise.all([
    db.query.politicaCheckIn.findFirst({ where: eq(politicaCheckIn.id, id) }),
    db.query.oficina.findMany({ columns: { id: true, nombre: true }, orderBy: [asc(oficina.nombre)] }),
  ]);
  if (!p) notFound();

  const action = actualizarPolitica.bind(null, p.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editar política</h1>
      </div>
      <PoliticaForm
        action={action}
        oficinas={oficinas}
        oficinaFija
        submitLabel="Guardar cambios"
        defaults={{
          oficinaId: p.oficinaId,
          canales: p.canales,
          nivel: p.nivel,
          enforcement: p.enforcement,
          fallbackHabilitado: p.fallbackHabilitado,
        }}
      />
    </div>
  );
}
