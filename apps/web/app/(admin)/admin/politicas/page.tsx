import Link from 'next/link';
import { Pencil, Plus, ShieldCheck } from 'lucide-react';
import { asc } from 'drizzle-orm';
import { db, politicaCheckIn } from '@kaypi/db';
import { Badge, buttonVariants, Card } from '@kaypi/ui';
import { cn } from '@kaypi/ui/cn';
import { NIVELES } from '@/lib/validation/politica';
import { EliminarPolitica } from './_components/eliminar-politica';

const nivelLabel = (v: string) => NIVELES.find((n) => n.value === v)?.label ?? v;

export default async function PoliticasPage() {
  const politicas = await db.query.politicaCheckIn.findMany({
    orderBy: [asc(politicaCheckIn.oficinaId)],
    with: { oficina: { columns: { nombre: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Políticas de check-in</h1>
          <p className="text-muted-foreground">Canales, nivel y enforcement por oficina.</p>
        </div>
        <Link href="/admin/politicas/nueva" className={cn(buttonVariants({ variant: 'primary' }))}>
          <Plus /> Nueva política
        </Link>
      </header>

      {politicas.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <ShieldCheck className="size-8 text-muted-foreground/50" />
          <p className="text-muted-foreground">Aún no hay políticas.</p>
        </Card>
      ) : (
        <Card className="divide-y overflow-hidden">
          {politicas.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-4 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary">
                  <ShieldCheck className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.oficina.nombre}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {nivelLabel(p.nivel)} · {p.canales.join(' · ')}
                    {p.fallbackHabilitado ? ' · fallback' : ''}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={p.enforcement === 'BLOCK' ? 'destructive' : 'neutral'}>{p.enforcement}</Badge>
                <Link
                  href={`/admin/politicas/${p.id}/editar`}
                  className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
                  aria-label={`Editar política de ${p.oficina.nombre}`}
                  title="Editar"
                >
                  <Pencil className="size-4" />
                </Link>
                <EliminarPolitica id={p.id} oficina={p.oficina.nombre} />
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
