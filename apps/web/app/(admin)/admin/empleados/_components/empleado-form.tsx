'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Button, buttonVariants, Card, CardContent, Input } from '@kaypi/ui';
import { cn } from '@kaypi/ui/cn';
import { type FormState } from '@/lib/forms';
import { ROLES } from '@/lib/validation/empleado';
import { Campo, inputClass } from '../../_components/campo';

type Accion = (prev: FormState, formData: FormData) => Promise<FormState>;

export interface EmpleadoDefaults {
  nombre?: string;
  email?: string;
  rol?: string;
  oficinaId?: string;
  jornadaId?: string;
}

export function EmpleadoForm({
  action,
  oficinas,
  jornadas,
  defaults,
  submitLabel,
  esEdicion,
}: {
  action: Accion;
  oficinas: Array<{ id: string; nombre: string }>;
  jornadas: Array<{ id: string; nombre: string; oficinaNombre: string }>;
  defaults?: EmpleadoDefaults;
  submitLabel: string;
  esEdicion?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <Card className="max-w-2xl">
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Nombre" name="nombre" errors={state.fieldErrors?.nombre}>
              <Input id="nombre" name="nombre" defaultValue={defaults?.nombre} placeholder="Nombre y apellido" />
            </Campo>
            <Campo label="Email" name="email" errors={state.fieldErrors?.email}>
              <Input id="email" name="email" type="email" defaultValue={defaults?.email} placeholder="persona@kaypi.demo" />
            </Campo>
          </div>

          <Campo
            label="Contraseña"
            name="password"
            errors={state.fieldErrors?.password}
            hint={esEdicion ? 'Déjala vacía para no cambiarla.' : 'Mínimo 6 caracteres.'}
          >
            <Input id="password" name="password" type="password" placeholder={esEdicion ? '••••••' : 'Contraseña'} autoComplete="new-password" />
          </Campo>

          <div className="grid gap-4 sm:grid-cols-3">
            <Campo label="Rol" name="rol">
              <select id="rol" name="rol" defaultValue={defaults?.rol ?? 'EMPLEADO'} className={inputClass}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Oficina" name="oficinaId" errors={state.fieldErrors?.oficinaId}>
              <select id="oficinaId" name="oficinaId" defaultValue={defaults?.oficinaId ?? ''} className={inputClass}>
                <option value="" disabled>
                  Selecciona…
                </option>
                {oficinas.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Jornada" name="jornadaId">
              <select id="jornadaId" name="jornadaId" defaultValue={defaults?.jornadaId ?? ''} className={inputClass}>
                <option value="">Sin jornada</option>
                {jornadas.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.nombre} ({j.oficinaNombre})
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'Guardando…' : submitLabel}
            </Button>
            <Link href="/admin/empleados" className={cn(buttonVariants({ variant: 'ghost' }))}>
              Cancelar
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
