import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db, oficina } from '@kaypi/db';
import { actualizarOficina } from '../../actions';
import { OficinaForm } from '../../_components/oficina-form';

export default async function EditarOficinaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await db.query.oficina.findFirst({ where: eq(oficina.id, id) });
  if (!o) notFound();

  const action = actualizarOficina.bind(null, o.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editar oficina</h1>
        <p className="text-muted-foreground">{o.nombre}</p>
      </div>
      <OficinaForm
        action={action}
        submitLabel="Guardar cambios"
        defaults={{
          nombre: o.nombre,
          direccion: o.direccion ?? undefined,
          lat: o.lat,
          lng: o.lng,
          geofenceRadiusM: o.geofenceRadiusM,
          timezone: o.timezone,
        }}
      />
    </div>
  );
}
