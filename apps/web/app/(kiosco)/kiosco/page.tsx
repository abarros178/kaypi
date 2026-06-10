import Link from 'next/link';
import { Card, CardDescription, CardHeader, CardTitle } from '@kaypi/ui';

export default function KioscoLandingPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col items-center justify-center gap-8 px-4 py-12">
      <header className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Kiosco</h1>
        <p className="mt-2 text-muted-foreground">
          Recepción presencial con QR rotativo firmado y replay-safe.
        </p>
      </header>

      <div className="grid w-full gap-4 sm:grid-cols-2">
        <Link href="/kiosco/lector" className="group">
          <Card className="h-full p-6 transition-shadow hover:shadow-md">
            <CardHeader className="p-0">
              <CardTitle className="text-xl">Lector</CardTitle>
              <CardDescription>
                Cámara fija que escanea el QR del empleado y registra el marcaje.
              </CardDescription>
            </CardHeader>
            <p className="mt-6 text-sm text-muted-foreground group-hover:text-foreground">
              Abrir lector →
            </p>
          </Card>
        </Link>

        <Link href="/kiosco/qr" className="group">
          <Card className="h-full p-6 transition-shadow hover:shadow-md">
            <CardHeader className="p-0">
              <CardTitle className="text-xl">QR del empleado (demo)</CardTitle>
              <CardDescription>
                Simulador del celular del empleado. Genera el QR rotativo cada 30 s.
              </CardDescription>
            </CardHeader>
            <p className="mt-6 text-sm text-muted-foreground group-hover:text-foreground">
              Abrir demo →
            </p>
          </Card>
        </Link>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        El kiosco identifica al empleado por la firma HMAC del QR contra su <code>qrSecret</code>.
        Validación offline, anti-replay 60 s.
      </p>
    </div>
  );
}
