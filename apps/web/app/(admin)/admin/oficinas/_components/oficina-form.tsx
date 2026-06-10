'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Button, buttonVariants, Card, CardContent, Input } from '@kaypi/ui';
import { cn } from '@kaypi/ui/cn';
import type { OficinaFormState } from '@/lib/validation/oficina';

type Accion = (prev: OficinaFormState, formData: FormData) => Promise<OficinaFormState>;

export interface OficinaDefaults {
  nombre?: string;
  direccion?: string;
  lat?: number;
  lng?: number;
  geofenceRadiusM?: number;
  timezone?: string;
}

function Campo({
  label,
  name,
  errors,
  children,
}: {
  label: string;
  name: string;
  errors?: string[];
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5" htmlFor={name}>
      <span className="text-sm font-medium">{label}</span>
      {children}
      {errors?.length ? <span className="text-xs text-destructive">{errors[0]}</span> : null}
    </label>
  );
}

export function OficinaForm({
  action,
  defaults,
  submitLabel,
}: {
  action: Accion;
  defaults?: OficinaDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <Card className="max-w-2xl">
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-4">
          <Campo label="Nombre" name="nombre" errors={state.fieldErrors?.nombre}>
            <Input id="nombre" name="nombre" defaultValue={defaults?.nombre} placeholder="Oficina Centro" />
          </Campo>

          <Campo label="Dirección" name="direccion" errors={state.fieldErrors?.direccion}>
            <Input id="direccion" name="direccion" defaultValue={defaults?.direccion} placeholder="Calle 123, Ciudad" />
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Latitud" name="lat" errors={state.fieldErrors?.lat}>
              <Input id="lat" name="lat" type="number" step="any" defaultValue={defaults?.lat} placeholder="19.4326" />
            </Campo>
            <Campo label="Longitud" name="lng" errors={state.fieldErrors?.lng}>
              <Input id="lng" name="lng" type="number" step="any" defaultValue={defaults?.lng} placeholder="-99.1332" />
            </Campo>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Radio de geofence (m)" name="geofenceRadiusM" errors={state.fieldErrors?.geofenceRadiusM}>
              <Input
                id="geofenceRadiusM"
                name="geofenceRadiusM"
                type="number"
                defaultValue={defaults?.geofenceRadiusM ?? 150}
                placeholder="150"
              />
            </Campo>
            <Campo label="Zona horaria" name="timezone" errors={state.fieldErrors?.timezone}>
              <Input
                id="timezone"
                name="timezone"
                list="tz-comunes"
                defaultValue={defaults?.timezone ?? 'America/Mexico_City'}
                placeholder="America/Mexico_City"
              />
              <datalist id="tz-comunes">
                <option value="America/Mexico_City" />
                <option value="America/Lima" />
                <option value="America/Bogota" />
                <option value="America/Santiago" />
                <option value="America/Argentina/Buenos_Aires" />
              </datalist>
            </Campo>
          </div>

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'Guardando…' : submitLabel}
            </Button>
            <Link href="/admin/oficinas" className={cn(buttonVariants({ variant: 'ghost' }))}>
              Cancelar
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
