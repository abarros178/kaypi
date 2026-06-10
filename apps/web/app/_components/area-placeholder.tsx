import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kaypi/ui';
import { cn } from '@kaypi/ui/cn';
import { buttonVariants } from '@kaypi/ui';
import { KaypiMark } from './kaypi-mark';

export function AreaPlaceholder({
  titulo,
  responsable,
  descripcion,
  items,
}: {
  titulo: string;
  responsable: string;
  descripcion: string;
  items: string[];
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between">
        <Link href="/" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
          <ArrowLeft /> Inicio
        </Link>
        <KaypiMark />
      </header>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
          <Badge variant="warning">En construcción</Badge>
        </div>
        <p className="max-w-prose text-muted-foreground">{descripcion}</p>
        <p className="text-sm text-muted-foreground">
          Responsable: <span className="font-medium text-foreground">{responsable}</span>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Qué irá aquí (V1)</CardTitle>
          <CardDescription>Alcance acordado en el PRD para esta área.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2 text-sm">
            {items.map((it) => (
              <li key={it} className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                {it}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
