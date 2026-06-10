import Link from 'next/link';
import { ArrowRight, LayoutDashboard, MonitorSmartphone, Palette, ScanFace, Settings } from 'lucide-react';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kaypi/ui';
import { cn } from '@kaypi/ui/cn';
import { buttonVariants } from '@kaypi/ui';
import { KaypiMark } from './_components/kaypi-mark';

const AREAS = [
  {
    href: '/admin',
    titulo: 'Admin',
    responsable: 'Andrés',
    desc: 'Oficinas, jornadas, políticas y empleados.',
    Icon: Settings,
  },
  {
    href: '/checkin',
    titulo: 'Check-in',
    responsable: 'Julián',
    desc: 'Captura web/kiosco que se adapta al contexto y a la red.',
    Icon: ScanFace,
  },
  {
    href: '/kiosco',
    titulo: 'Kiosco',
    responsable: 'Julián',
    desc: 'Modo kiosco offline con réplica local y sincronización.',
    Icon: MonitorSmartphone,
  },
  {
    href: '/reportes',
    titulo: 'Reportes',
    responsable: 'Andrés',
    desc: 'Dashboard (lista + calendario), métricas y PDF mensual.',
    Icon: LayoutDashboard,
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-12 px-6 py-16">
      <header className="flex items-center justify-between">
        <KaypiMark className="text-lg" />
        <Link href="/diseno" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
          <Palette /> Sistema de diseño
        </Link>
      </header>

      <section className="flex flex-col gap-4">
        <Badge variant="success" className="w-fit">
          Día 0 · contrato congelado
        </Badge>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Asistencia verificada.
          <br />
          <span className="text-muted-foreground">Presencia confirmada.</span>
        </h1>
        <p className="max-w-prose text-lg text-muted-foreground">
          Kaypi captura marcajes por web, móvil y kiosco con niveles de confianza configurables,
          los unifica en un único evento canónico y los vuelve dashboard, métricas y reportes.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {AREAS.map(({ href, titulo, responsable, desc, Icon }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/40">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-md bg-secondary text-foreground">
                    <Icon className="size-4.5" />
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
                <CardTitle className="mt-2 flex items-center gap-2">
                  {titulo}
                  <Badge variant="outline">{responsable}</Badge>
                </CardTitle>
                <CardDescription>{desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </section>

      <footer className="mt-auto border-t pt-6 text-sm text-muted-foreground">
        Monorepo: <code className="font-mono">apps/web</code> · <code className="font-mono">apps/mobile</code> ·{' '}
        <code className="font-mono">packages/shared</code> · <code className="font-mono">packages/db</code> ·{' '}
        <code className="font-mono">packages/ui</code>
      </footer>
    </main>
  );
}
