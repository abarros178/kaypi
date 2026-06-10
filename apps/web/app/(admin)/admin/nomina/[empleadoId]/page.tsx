import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db, empleado } from '@kaypi/db';
import { guardarCompensacion } from '../actions';
import { CompensacionForm } from '../_components/compensacion-form';

export default async function CompensacionPage({ params }: { params: Promise<{ empleadoId: string }> }) {
  const { empleadoId } = await params;
  const e = await db.query.empleado.findFirst({
    where: eq(empleado.id, empleadoId),
    with: { compensacion: true },
  });
  if (!e) notFound();

  const action = guardarCompensacion.bind(null, e.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compensación</h1>
        <p className="text-muted-foreground">{e.nombre}</p>
      </div>
      <CompensacionForm
        action={action}
        defaults={
          e.compensacion
            ? {
                tipoSalario: e.compensacion.tipoSalario,
                monto: e.compensacion.monto,
                moneda: e.compensacion.moneda,
                periodoPago: e.compensacion.periodoPago,
                multiplicadorExtra: e.compensacion.multiplicadorExtra,
                horasMesBase: e.compensacion.horasMesBase,
              }
            : undefined
        }
      />
    </div>
  );
}
