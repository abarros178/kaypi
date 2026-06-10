'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Button, buttonVariants, Card, CardContent, Input } from '@kaypi/ui';
import { cn } from '@kaypi/ui/cn';
import { type FormState } from '@/lib/forms';
import { Campo, inputClass } from '../../_components/campo';

type Accion = (prev: FormState, formData: FormData) => Promise<FormState>;

export interface KioscoDefaults {
  nombre?: string;
  oficinaId?: string;
  status?: string;
}

export function KioscoForm({
  action,
  oficinas,
  defaults,
  submitLabel,
}: {
  action: Accion;
  oficinas: Array<{ id: string; nombre: string }>;
  defaults?: KioscoDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <Card className="max-w-2xl">
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-4">
          <Campo label="Nombre" name="nombre" errors={state.fieldErrors?.nombre}>
            <Input id="nombre" name="nombre" defaultValue={defaults?.nombre} placeholder="Recepción planta baja" />
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2">
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
            <Campo label="Estado" name="status">
              <select id="status" name="status" defaultValue={defaults?.status ?? 'active'} className={inputClass}>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </Campo>
          </div>

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'Guardando…' : submitLabel}
            </Button>
            <Link href="/admin/kioscos" className={cn(buttonVariants({ variant: 'ghost' }))}>
              Cancelar
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
