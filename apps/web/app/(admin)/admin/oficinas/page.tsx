import Link from 'next/link';
import { Building2, MapPin, Pencil, Plus } from 'lucide-react';
import { asc } from 'drizzle-orm';
import { db, oficina } from '@kaypi/db';
import { Badge, buttonVariants, Card } from '@kaypi/ui';
import { cn } from '@kaypi/ui/cn';
import { EliminarOficina } from './_components/eliminar-oficina';

export default async function OficinasPage() {
  const oficinas = await db.query.oficina.findMany({ orderBy: [asc(oficina.nombre)] });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Oficinas</h1>
          <p className="text-muted-foreground">Cada oficina contiene su ubicación, geofence y zona horaria.</p>
        </div>
        <Link href="/admin/oficinas/nueva" className={cn(buttonVariants({ variant: 'primary' }))}>
          <Plus /> Nueva oficina
        </Link>
      </header>

      {oficinas.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <Building2 className="size-8 text-muted-foreground/50" />
          <p className="text-muted-foreground">Aún no hay oficinas. Crea la primera.</p>
        </Card>
      ) : (
        <Card className="divide-y overflow-hidden">
          {oficinas.map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-4 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary">
                  <Building2 className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="truncate font-medium">{o.nombre}</div>
                  <div className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    <MapPin className="size-3 shrink-0" />
                    <span className="truncate">
                      {o.lat.toFixed(4)}, {o.lng.toFixed(4)} ·{' '}
                      <span className="font-mono">{o.timezone}</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline">{o.geofenceRadiusM} m</Badge>
                <Link
                  href={`/admin/oficinas/${o.id}/editar`}
                  className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
                  aria-label={`Editar ${o.nombre}`}
                  title="Editar"
                >
                  <Pencil className="size-4" />
                </Link>
                <EliminarOficina id={o.id} nombre={o.nombre} />
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
