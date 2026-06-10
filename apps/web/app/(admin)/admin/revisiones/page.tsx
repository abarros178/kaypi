import { desc, eq } from 'drizzle-orm';
import { ShieldCheck } from 'lucide-react';
import { checkInEvent, db } from '@kaypi/db';
import { Badge, Card } from '@kaypi/ui';
import { FilaRevision } from './_components/fila-revision';

function formatoHora(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short', timeZone: tz }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default async function RevisionesPage() {
  const noRevisados = await db.query.checkInEvent.findMany({
    where: eq(checkInEvent.revisado, false),
    orderBy: [desc(checkInEvent.tsServidorUTC)],
    with: {
      empleado: { columns: { nombre: true } },
      oficina: { columns: { nombre: true } },
    },
  });
  // `flags` es JSON: filtramos en memoria los que tienen anomalías.
  const pendientes = noRevisados.filter((e) => Array.isArray(e.flags) && e.flags.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Revisiones</h1>
          <p className="text-muted-foreground">Marcajes con anomalías (flags) pendientes de aprobar o corregir.</p>
        </div>
        {pendientes.length > 0 ? <Badge variant="warning">{pendientes.length} pendientes</Badge> : null}
      </div>

      {pendientes.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <ShieldCheck className="size-8 text-success" />
          <p className="text-muted-foreground">No hay marcajes pendientes de revisión. Todo limpio.</p>
        </Card>
      ) : (
        <Card className="divide-y overflow-hidden">
          {pendientes.map((e) => (
            <FilaRevision
              key={e.id}
              id={e.id}
              tipo={e.tipo}
              empleado={e.empleado?.nombre ?? e.empleadoId}
              oficina={e.oficina?.nombre ?? ''}
              hora={formatoHora(e.tsServidorUTC, e.tz)}
              flags={e.flags}
            />
          ))}
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Aprobar o corregir deja traza en el AuditLog (append-only). Un período de nómina "limpio" no debería tener pendientes.
      </p>
    </div>
  );
}
