'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Button, Card, CardContent } from '@kaypi/ui';
import { generarQR, type TipoMarcaje } from '@kaypi/shared';

interface EmpleadoLite {
  id: string;
  nombre: string;
  oficinaId: string;
  oficinaNombre: string;
}

interface Props {
  empleados: EmpleadoLite[];
}

const TIPOS: { tipo: TipoMarcaje; etiqueta: string }[] = [
  { tipo: 'IN', etiqueta: 'Entrada' },
  { tipo: 'OUT', etiqueta: 'Salida' },
  { tipo: 'BREAK_START', etiqueta: 'Inicia descanso' },
  { tipo: 'BREAK_END', etiqueta: 'Termina descanso' },
];

const ROTACION_MS = 30_000;

export function QrDemoCliente({ empleados }: Props) {
  const [empleadoId, setEmpleadoId] = useState(empleados[0]?.id ?? '');
  const [tipo, setTipo] = useState<TipoMarcaje>('IN');
  const [qrSecret, setQrSecret] = useState<string | null>(null);
  const [secretoLoading, setSecretoLoading] = useState(false);
  const [qrSvg, setQrSvg] = useState<string>('');
  const [qrString, setQrString] = useState<string>('');
  const [rotacionTs, setRotacionTs] = useState(0);
  const [progress, setProgress] = useState(100);

  const empleadoSeleccionado = useMemo(
    () => empleados.find((e) => e.id === empleadoId),
    [empleados, empleadoId],
  );

  // Cuando cambia el empleado: pedir su qrSecret al endpoint dev.
  useEffect(() => {
    if (!empleadoId) return;
    let cancelled = false;
    setSecretoLoading(true);
    setQrSecret(null);
    setQrSvg('');
    setQrString('');
    fetch(`/api/dev/empleado/${empleadoId}/secret`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (typeof data?.qrSecret === 'string') setQrSecret(data.qrSecret);
      })
      .finally(() => {
        if (!cancelled) setSecretoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [empleadoId]);

  // Rotar el QR cada 30 s (re-arma cuando cambia secret/empleado/tipo).
  useEffect(() => {
    if (!qrSecret || !empleadoId) return;
    let cancelled = false;

    async function rotar() {
      const { qr, ts } = await generarQR({
        empleadoId,
        tipo,
        qrSecret: qrSecret!,
      });
      if (cancelled) return;
      const svg = await QRCode.toString(qr, {
        type: 'svg',
        margin: 1,
        width: 320,
        color: { dark: '#0a0a0a', light: '#ffffff' },
      });
      if (cancelled) return;
      setQrString(qr);
      setQrSvg(svg);
      setRotacionTs(ts);
    }

    rotar();
    const id = setInterval(rotar, ROTACION_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [qrSecret, empleadoId, tipo]);

  // Barra de progreso del countdown (re-arma con cada rotación).
  useEffect(() => {
    if (!rotacionTs) return;
    setProgress(100);
    const id = setInterval(() => {
      const restante = rotacionTs + ROTACION_MS - Date.now();
      const pct = Math.max(0, (restante / ROTACION_MS) * 100);
      setProgress(pct);
      if (pct <= 0) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
  }, [rotacionTs]);

  return (
    <div className="flex flex-col gap-6">
      {/* Selector de empleado */}
      <div className="grid gap-2">
        <label htmlFor="empleado" className="text-sm font-medium">
          Empleado
        </label>
        <select
          id="empleado"
          value={empleadoId}
          onChange={(e) => setEmpleadoId(e.target.value)}
          className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          {empleados.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre} · {e.oficinaNombre}
            </option>
          ))}
        </select>
        {empleadoSeleccionado && (
          <p className="text-xs text-muted-foreground">
            ID: <code>{empleadoSeleccionado.id}</code> · Oficina:{' '}
            <code>{empleadoSeleccionado.oficinaId}</code>
          </p>
        )}
      </div>

      {/* Selector de tipo */}
      <div className="grid gap-2">
        <label className="text-sm font-medium">Tipo de marcaje</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TIPOS.map(({ tipo: t, etiqueta }) => (
            <Button
              key={t}
              variant={tipo === t ? 'primary' : 'outline'}
              onClick={() => setTipo(t)}
              type="button"
            >
              {etiqueta}
            </Button>
          ))}
        </div>
      </div>

      {/* QR + countdown */}
      <Card>
        <CardContent className="p-6">
          {secretoLoading ? (
            <div className="flex h-[360px] items-center justify-center text-sm text-muted-foreground">
              Cargando secreto del empleado…
            </div>
          ) : qrSvg ? (
            <div className="flex flex-col items-center gap-4">
              <div
                className="rounded-md bg-white p-3"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <p className="text-center text-sm text-muted-foreground">
                Acerca el celular al lector del kiosco.
              </p>
              <div className="w-full max-w-[320px]">
                <div className="h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-foreground transition-[width] duration-100 ease-linear"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1 text-center text-xs text-muted-foreground">
                  Próxima rotación en {Math.ceil((progress / 100) * (ROTACION_MS / 1000))}s
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-[360px] items-center justify-center text-sm text-muted-foreground">
              Selecciona un empleado.
            </div>
          )}
        </CardContent>
      </Card>

      {qrString && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Ver string del QR (debug)</summary>
          <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3">
            <code>{qrString}</code>
          </pre>
        </details>
      )}
    </div>
  );
}
