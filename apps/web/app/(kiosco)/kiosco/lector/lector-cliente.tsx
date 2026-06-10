'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { parsearQR } from '@kaypi/shared';

interface Props {
  kioscoId: string;
  kioscoNombre: string;
  oficinaId: string;
  oficinaNombre: string;
}

type Estado =
  | { tipo: 'inicializando' }
  | { tipo: 'esperando' }
  | { tipo: 'procesando' }
  | { tipo: 'exito'; nombre: string; etiqueta: string }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'sin_camara'; mensaje: string };

const TIPO_LABEL: Record<string, string> = {
  IN: 'Entrada',
  OUT: 'Salida',
  BREAK_START: 'Inicio de descanso',
  BREAK_END: 'Fin de descanso',
};

const REANUDAR_MS = 2_000;

export function LectorCliente({ kioscoId, kioscoNombre, oficinaId, oficinaNombre }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const procesandoRef = useRef(false);
  const [estado, setEstado] = useState<Estado>({ tipo: 'inicializando' });
  // El reloj se inicializa solo en el cliente para evitar hydration mismatch
  // (el toLocaleTimeString del server usa otra locale que el del navegador).
  const [ahora, setAhora] = useState<string>('');

  useEffect(() => {
    setAhora(new Date().toLocaleTimeString());
    const id = setInterval(() => setAhora(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);

  // Inicializar cámara y scanner. Tomamos control manual del MediaStream para
  // sobrevivir el doble-mount del strict-mode de Next dev (decodeFromVideoDevice
  // encadena getUserMedia + srcObject + play() y el segundo mount le pisa el play
  // al primero → AbortError). Aquí: getUserMedia + srcObject + play() los hace
  // este effect, y zxing solo decodifica (decodeFromStream).
  useEffect(() => {
    let cancelado = false;
    let streamLocal: MediaStream | null = null;
    let controlsLocal: IScannerControls | null = null;

    async function init() {
      const video = videoRef.current;
      if (!video) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelado) {
          for (const t of stream.getTracks()) t.stop();
          return;
        }
        streamLocal = stream;

        // play() puede tirar AbortError si el effect anterior aún no soltó el
        // video. No es fatal: el siguiente intento agarra. Lo silenciamos.
        video.srcObject = stream;
        try {
          await video.play();
        } catch (e) {
          if (!(e instanceof DOMException && e.name === 'AbortError')) throw e;
        }
        if (cancelado) return;

        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromStream(stream, video, (result) => {
          if (cancelado || !result || procesandoRef.current) return;
          void handleScan(result.getText());
        });
        if (cancelado) {
          controls.stop();
          return;
        }
        controlsLocal = controls;
        controlsRef.current = controls;
        setEstado({ tipo: 'esperando' });
      } catch (e) {
        if (cancelado) return;
        const mensaje = e instanceof Error ? e.message : 'No se pudo iniciar la cámara';
        setEstado({ tipo: 'sin_camara', mensaje });
      }
    }

    void init();
    return () => {
      cancelado = true;
      controlsLocal?.stop();
      controlsRef.current = null;
      if (streamLocal) {
        for (const t of streamLocal.getTracks()) t.stop();
      }
      const video = videoRef.current;
      if (video) video.srcObject = null;
    };
  }, []);

  async function handleScan(qr: string) {
    if (procesandoRef.current) return;
    procesandoRef.current = true;
    setEstado({ tipo: 'procesando' });

    const parsed = parsearQR(qr);
    if (!parsed) {
      setEstado({ tipo: 'error', mensaje: 'QR no reconocido' });
      window.setTimeout(reanudar, REANUDAR_MS);
      return;
    }

    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          eventId: crypto.randomUUID(),
          empleadoId: parsed.empIdPrefix,
          oficinaId,
          tipo: parsed.tipo,
          canal: 'KIOSCO',
          nivelAplicado: 'SOLO_LOGIN',
          clienteLocal: new Date().toISOString(),
          fuente: 'NORMAL',
          qrEmpleadoScan: qr,
        }),
      });
      const body = await res.json().catch(() => ({}));

      if (res.ok && body?.event) {
        // Buscar nombre del empleado vía endpoint dev (no se usa el qrSecret;
        // solo el campo `nombre`). En prod esto vendría en la respuesta del POST.
        const nombre = await obtenerNombre(body.event.empleadoId).catch(() => 'Empleado');
        setEstado({
          tipo: 'exito',
          nombre,
          etiqueta: TIPO_LABEL[body.event.tipo] ?? body.event.tipo,
        });
      } else {
        setEstado({ tipo: 'error', mensaje: body?.error ?? 'Marcaje rechazado' });
      }
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'Error de red';
      setEstado({ tipo: 'error', mensaje });
    }
    window.setTimeout(reanudar, REANUDAR_MS);
  }

  function reanudar() {
    procesandoRef.current = false;
    setEstado({ tipo: 'esperando' });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="relative flex flex-1 items-center justify-center overflow-hidden">
        {/* Video de la cámara. Sin autoPlay: zxing maneja el play() y dos llamadas
            simultáneas (strict-mode + autoPlay) disparan AbortError. */}
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted
          playsInline
        />

        {/* Marco guía + overlay de estado */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div
            className={`size-[min(70vh,70vw)] rounded-2xl border-4 transition-colors ${
              estado.tipo === 'exito'
                ? 'border-emerald-400/90'
                : estado.tipo === 'error'
                  ? 'border-rose-500/90'
                  : 'border-white/70'
            }`}
          />
          <Overlay estado={estado} />
        </div>
      </main>

      {/* Franja inferior */}
      <footer className="flex items-center justify-between border-t border-border bg-card/80 px-6 py-3 text-xs text-muted-foreground backdrop-blur">
        <div>
          <span className="font-medium text-foreground">{kioscoNombre}</span> · {oficinaNombre}
        </div>
        <div className="font-mono" suppressHydrationWarning>{ahora}</div>
        <div className="hidden sm:block">
          <code className="text-[0.625rem]">
            {kioscoId} · {oficinaId}
          </code>
        </div>
      </footer>
    </div>
  );
}

function Overlay({ estado }: { estado: Estado }) {
  if (estado.tipo === 'inicializando') {
    return <Tarjeta titulo="Iniciando cámara…" />;
  }
  if (estado.tipo === 'sin_camara') {
    return <Tarjeta titulo="No hay cámara" detalle={estado.mensaje} tono="error" />;
  }
  if (estado.tipo === 'esperando') {
    return <Tarjeta titulo="Acerca tu QR" detalle="Buscando código…" tono="neutral" />;
  }
  if (estado.tipo === 'procesando') {
    return <Tarjeta titulo="Validando…" tono="neutral" />;
  }
  if (estado.tipo === 'exito') {
    return <Tarjeta titulo={`✓ ${estado.nombre}`} detalle={estado.etiqueta} tono="exito" />;
  }
  return <Tarjeta titulo="✗ Rechazado" detalle={estado.mensaje} tono="error" />;
}

function Tarjeta({
  titulo,
  detalle,
  tono = 'neutral',
}: {
  titulo: string;
  detalle?: string;
  tono?: 'neutral' | 'exito' | 'error';
}) {
  const color =
    tono === 'exito'
      ? 'bg-emerald-500/90 text-white'
      : tono === 'error'
        ? 'bg-rose-500/90 text-white'
        : 'bg-black/70 text-white';
  return (
    <div className={`mt-6 rounded-xl px-6 py-4 text-center shadow-lg backdrop-blur-sm ${color}`}>
      <div className="text-xl font-semibold">{titulo}</div>
      {detalle && <div className="mt-1 text-sm opacity-90">{detalle}</div>}
    </div>
  );
}

async function obtenerNombre(empleadoId: string): Promise<string> {
  const res = await fetch(`/api/dev/empleado/${empleadoId}/secret`);
  if (!res.ok) return 'Empleado';
  const data = await res.json();
  return typeof data?.nombre === 'string' ? data.nombre : 'Empleado';
}
