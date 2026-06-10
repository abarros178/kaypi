import Link from 'next/link';
import { CalendarClock, Pencil, Plus } from 'lucide-react';
import { asc } from 'drizzle-orm';
import { db, jornada } from '@kaypi/db';
import { Badge, buttonVariants, Card } from '@kaypi/ui';
import { cn } from '@kaypi/ui/cn';
import { EliminarJornada } from './_components/eliminar-jornada';

export default async function JornadasPage() {
  const jornadas = await db.query.jornada.findMany({
    orderBy: [asc(jornada.nombre)],
    with: { oficina: { columns: { nombre: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Jornadas</h1>
          <p className="text-muted-foreground">Horarios y máximos por oficina; disparan retrasos y horas extra.</p>
        </div>
        <Link href="/admin/jornadas/nueva" className={cn(buttonVariants({ variant: 'primary' }))}>
          <Plus /> Nueva jornada
        </Link>
      </header>

      {jornadas.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <CalendarClock className="size-8 text-muted-foreground/50" />
          <p className="text-muted-foreground">Aún no hay jornadas.</p>
        </Card>
      ) : (
        <Card className="divide-y overflow-hidden">
          {jornadas.map((j) => (
            <div key={j.id} className="flex items-center justify-between gap-4 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary">
                  <CalendarClock className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="truncate font-medium">{j.nombre}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {j.oficina.nombre} ·{' '}
                    {j.tipo === 'FIJA' ? (
                      <span className="font-mono">
                        {j.horaEntrada}–{j.horaSalida}
                      </span>
                    ) : (
                      'sin horario fijo'
                    )}{' '}
                    · máx {j.maxHorasDiarias} h/día
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={j.tipo === 'FIJA' ? 'neutral' : 'outline'}>{j.tipo}</Badge>
                <Link
                  href={`/admin/jornadas/${j.id}/editar`}
                  className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
                  aria-label={`Editar ${j.nombre}`}
                  title="Editar"
                >
                  <Pencil className="size-4" />
                </Link>
                <EliminarJornada id={j.id} nombre={j.nombre} />
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
