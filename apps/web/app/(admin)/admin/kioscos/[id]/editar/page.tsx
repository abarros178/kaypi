import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { db, kiosco, oficina } from '@kaypi/db';
import { actualizarKiosco } from '../../actions';
import { KioscoForm } from '../../_components/kiosco-form';

export default async function EditarKioscoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [k, oficinas] = await Promise.all([
    db.query.kiosco.findFirst({ where: eq(kiosco.id, id) }),
    db.query.oficina.findMany({ columns: { id: true, nombre: true }, orderBy: [asc(oficina.nombre)] }),
  ]);
  if (!k) notFound();

  const action = actualizarKiosco.bind(null, k.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editar kiosco</h1>
        <p className="text-muted-foreground">{k.nombre}</p>
      </div>
      <KioscoForm
        action={action}
        oficinas={oficinas}
        submitLabel="Guardar cambios"
        defaults={{ nombre: k.nombre, oficinaId: k.oficinaId, status: k.status }}
      />
    </div>
  );
}
