import Link from 'next/link';
import { Monitor, Pencil, Plus } from 'lucide-react';
import { asc } from 'drizzle-orm';
import { db, kiosco } from '@kaypi/db';
import { Badge, buttonVariants, Card } from '@kaypi/ui';
import { cn } from '@kaypi/ui/cn';
import { EliminarKiosco } from './_components/eliminar-kiosco';

export default async function KioscosPage() {
  const kioscos = await db.query.kiosco.findMany({
    orderBy: [asc(kiosco.nombre)],
    with: { oficina: { columns: { nombre: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kioscos</h1>
          <p className="text-muted-foreground">Estaciones de marcaje por oficina (lector de QR del empleado).</p>
        </div>
        <Link href="/admin/kioscos/nueva" className={cn(buttonVariants({ variant: 'primary' }))}>
          <Plus /> Nuevo kiosco
        </Link>
      </header>

      {kioscos.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <Monitor className="size-8 text-muted-foreground/50" />
          <p className="text-muted-foreground">Aún no hay kioscos registrados.</p>
        </Card>
      ) : (
        <Card className="divide-y overflow-hidden">
          {kioscos.map((k) => (
            <div key={k.id} className="flex items-center justify-between gap-4 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary">
                  <Monitor className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="truncate font-medium">{k.nombre}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {k.oficina.nombre} · <span className="font-mono">{k.id}</span>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={k.status === 'active' ? 'success' : 'neutral'}>
                  {k.status === 'active' ? 'Activo' : 'Inactivo'}
                </Badge>
                <Link
                  href={`/admin/kioscos/${k.id}/editar`}
                  className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
                  aria-label={`Editar ${k.nombre}`}
                  title="Editar"
                >
                  <Pencil className="size-4" />
                </Link>
                <EliminarKiosco id={k.id} nombre={k.nombre} />
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
