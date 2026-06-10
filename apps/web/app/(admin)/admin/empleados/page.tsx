import Link from 'next/link';
import { Pencil, Plus, Users } from 'lucide-react';
import { asc } from 'drizzle-orm';
import { db, empleado } from '@kaypi/db';
import { Avatar, Badge, buttonVariants, Card } from '@kaypi/ui';
import { cn } from '@kaypi/ui/cn';
import { EliminarEmpleado } from './_components/eliminar-empleado';

const rolVariant = (rol: string) =>
  rol === 'ADMIN' ? 'success' : rol === 'MANAGER' ? 'warning' : 'neutral';

export default async function EmpleadosPage() {
  const empleados = await db.query.empleado.findMany({
    orderBy: [asc(empleado.nombre)],
    with: { oficina: { columns: { nombre: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Empleados</h1>
          <p className="text-muted-foreground">Alta y edición, asignación a oficina y jornada, y rol.</p>
        </div>
        <Link href="/admin/empleados/nuevo" className={cn(buttonVariants({ variant: 'primary' }))}>
          <Plus /> Nuevo empleado
        </Link>
      </header>

      {empleados.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <Users className="size-8 text-muted-foreground/50" />
          <p className="text-muted-foreground">Aún no hay empleados.</p>
        </Card>
      ) : (
        <Card className="divide-y overflow-hidden">
          {empleados.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-4 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar nombre={e.nombre} />
                <div className="min-w-0">
                  <div className="truncate font-medium">{e.nombre}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {e.email} · {e.oficina.nombre}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={rolVariant(e.rol)}>{e.rol}</Badge>
                <Link
                  href={`/admin/empleados/${e.id}/editar`}
                  className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
                  aria-label={`Editar ${e.nombre}`}
                  title="Editar"
                >
                  <Pencil className="size-4" />
                </Link>
                <EliminarEmpleado id={e.id} nombre={e.nombre} />
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
