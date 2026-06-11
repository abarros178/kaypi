'use client';

import { useActionState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@kaypi/ui';
import { loginAction, type LoginState } from '@/lib/auth/actions';
import { KaypiMark } from '@/app/_components/kaypi-mark';

const INICIAL: LoginState = {};

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, INICIAL);

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center gap-3 text-center">
          <KaypiMark className="h-9 w-auto" />
          <CardTitle>Inicia sesión</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form action={action} className="flex flex-col gap-3">
            {next ? <input type="hidden" name="next" value={next} /> : null}
            <Input name="email" type="email" placeholder="tu@correo.com" autoComplete="email" required />
            <Input
              name="password"
              type="password"
              placeholder="Contraseña"
              autoComplete="current-password"
              required
            />
            {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
            <Button type="submit" disabled={pending}>
              {pending ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground">
            Demo: <span className="font-mono">andres@kaypi.demo</span> ·{' '}
            <span className="font-mono">demo1234</span>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
