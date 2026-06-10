'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Home, Moon, Sun } from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  buttonVariants,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmCheck,
  EstadoMarcaje,
  Input,
  PinDrop,
  PresencePulse,
} from '@kaypi/ui';
import { cn } from '@kaypi/ui/cn';
import { nuevoEventId, postCheckIn, type TipoMarcaje } from '@kaypi/shared';
import { KaypiMark } from '../../_components/kaypi-mark';

interface EventoRow {
  id: string;
  tipo: TipoMarcaje;
  tsServidorUTC: string;
  tz: string;
  flags: string[];
  geofenceOk: boolean | null;
  empleado: { nombre: string } | null;
}

const COLORES: Array<[string, string, string]> = [
  ['Primary', 'var(--primary)', 'var(--primary-foreground)'],
  ['Success', 'var(--success)', 'var(--success-foreground)'],
  ['Warning', 'var(--warning)', 'var(--warning-foreground)'],
  ['Destructive', 'var(--destructive)', 'var(--destructive-foreground)'],
  ['Accent', 'var(--accent)', 'var(--accent-foreground)'],
  ['Muted', 'var(--muted)', 'var(--muted-foreground)'],
];

const TIPOS: TipoMarcaje[] = ['IN', 'OUT', 'BREAK_START', 'BREAK_END'];

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{title}</h2>
        {desc ? <p className="text-sm text-muted-foreground/80">{desc}</p> : null}
      </div>
      {children}
    </section>
  );
}

function formatHora(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short', timeZone: tz }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}

export default function DisenoPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [confirmKey, setConfirmKey] = useState(0);
  const [pinKey, setPinKey] = useState(0);
  const [marcando, setMarcando] = useState(false);
  const [eventos, setEventos] = useState<EventoRow[]>([]);

  useEffect(() => setMounted(true), []);

  const cargarEventos = useCallback(async () => {
    try {
      const r = await fetch('/api/checkin?limit=8', { cache: 'no-store' });
      const j = (await r.json()) as { eventos?: EventoRow[] };
      setEventos(j.eventos ?? []);
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    void cargarEventos();
  }, [cargarEventos]);

  async function marcarDemo() {
    setMarcando(true);
    const r = await postCheckIn(window.location.origin, {
      eventId: nuevoEventId(),
      empleadoId: 'emp_andres',
      oficinaId: 'ofi_cdmx',
      tipo: 'IN',
      canal: 'WEB',
      nivelAplicado: 'SOLO_LOGIN',
      clienteLocal: new Date().toISOString(),
      fuente: 'NORMAL',
    });
    setMarcando(false);
    if (r.ok) {
      setConfirmKey((k) => k + 1);
      toast.success('Entrada registrada', {
        description: `Sellado por el servidor (UTC): ${r.event.timestamp.servidorUTC}`,
      });
      void cargarEventos();
    } else {
      toast.error('No se pudo marcar', { description: r.error });
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-12 px-6 py-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <KaypiMark className="text-lg" />
          <Badge variant="outline">Sistema de diseño</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Cambiar tema"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {mounted && theme === 'dark' ? <Sun /> : <Moon />}
          </Button>
          <Link href="/" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            <Home /> Inicio
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Presencia serena</h1>
        <p className="max-w-prose text-muted-foreground">
          La línea visual de Kaypi: neutra, con aire y un solo acento. Craft sobre adorno; animación
          solo cuando confirma algo. Esta página es la referencia compartida del equipo.
        </p>
      </div>

      <Section title="Color" desc="oklch · neutros fríos + un acento de confianza. El color comunica estado, no decora.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {COLORES.map(([name, bg, fg]) => (
            <div
              key={name}
              className="flex h-20 flex-col justify-end rounded-lg border p-3 text-xs font-medium"
              style={{ background: bg, color: fg }}
            >
              {name}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tipografía" desc="Geist Sans para UI · Geist Mono para horas, IDs y datos.">
        <Card>
          <CardContent className="flex flex-col gap-2 pt-5">
            <p className="text-3xl font-semibold tracking-tight">Asistencia verificada</p>
            <p className="text-base text-muted-foreground">Jerarquía por escala y peso, sin decoración.</p>
            <p className="font-mono text-sm text-muted-foreground">09:00 · emp_andres · America/Mexico_City</p>
          </CardContent>
        </Card>
      </Section>

      <Section title="Componentes">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {TIPOS.map((t) => (
              <EstadoMarcaje key={t} tipo={t} />
            ))}
            <Badge variant="warning">fuera_geofence</Badge>
          </div>
          <div className="grid max-w-xl gap-3 sm:grid-cols-[1fr_auto]">
            <Input placeholder="Buscar empleado…" />
            <div className="flex items-center gap-3">
              <Avatar nombre="Andrés Barros" />
              <Avatar nombre="Lucía Quispe" />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Animación" desc="Propósito sobre decoración: confirmar, indicar presencia, ubicar.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Confirmación</CardTitle>
              <CardDescription>Marcaje registrado.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              <ConfirmCheck key={confirmKey} />
              <Button variant="outline" size="sm" onClick={() => setConfirmKey((k) => k + 1)}>
                Repetir
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Presencia</CardTitle>
              <CardDescription>Aquí / en línea.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-6">
              <PresencePulse size={16} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ubicación</CardTitle>
              <CardDescription>Geofence confirmado.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3 py-2">
              <PinDrop key={pinKey} size={36} />
              <Button variant="outline" size="sm" onClick={() => setPinKey((k) => k + 1)}>
                Repetir
              </Button>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section
        title="Contrato en vivo"
        desc="El mismo flujo que usarán los 3 canales: cliente → /api/checkin → el servidor sella el UTC → evento canónico."
      >
        <Card>
          <CardContent className="flex flex-col gap-5 pt-5">
            <div className="flex flex-wrap items-center gap-4">
              <Button onClick={marcarDemo} disabled={marcando}>
                {marcando ? 'Registrando…' : 'Marcar entrada (demo)'}
              </Button>
              <span className="text-sm text-muted-foreground">
                Empuja un marcaje real de <code className="font-mono">emp_andres</code> en{' '}
                <code className="font-mono">ofi_cdmx</code>.
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-medium">Últimos marcajes</h3>
              <ul className="divide-y rounded-lg border">
                {eventos.length === 0 ? (
                  <li className="p-4 text-sm text-muted-foreground">Sin marcajes todavía.</li>
                ) : (
                  eventos.map((ev) => (
                    <li key={ev.id} className="flex items-center justify-between gap-3 p-3">
                      <div className="flex items-center gap-3">
                        <EstadoMarcaje tipo={ev.tipo} />
                        <span className="text-sm">{ev.empleado?.nombre ?? ev.id.slice(0, 8)}</span>
                        {ev.flags.map((f) => (
                          <Badge key={f} variant="warning">
                            {f}
                          </Badge>
                        ))}
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatHora(ev.tsServidorUTC, ev.tz)}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      </Section>

      <footer className="mt-auto border-t pt-6 text-sm text-muted-foreground">
        Documentado en <code className="font-mono">DESIGN.md</code> · tokens en{' '}
        <code className="font-mono">@kaypi/ui/tokens</code>
      </footer>
    </main>
  );
}
