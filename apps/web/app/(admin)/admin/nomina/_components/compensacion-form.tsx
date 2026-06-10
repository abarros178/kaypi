'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Button, buttonVariants, Card, CardContent, Input } from '@kaypi/ui';
import { cn } from '@kaypi/ui/cn';
import { type FormState } from '@/lib/forms';
import { MONEDAS } from '@/lib/validation/compensacion';
import { Campo, inputClass } from '../../_components/campo';

type Accion = (prev: FormState, formData: FormData) => Promise<FormState>;

export interface CompensacionDefaults {
  tipoSalario?: string;
  monto?: number;
  moneda?: string;
  periodoPago?: string;
  multiplicadorExtra?: number;
  horasMesBase?: number;
}

export function CompensacionForm({
  action,
  defaults,
}: {
  action: Accion;
  defaults?: CompensacionDefaults;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <Card className="max-w-2xl">
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Tipo de salario" name="tipoSalario">
              <select id="tipoSalario" name="tipoSalario" defaultValue={defaults?.tipoSalario ?? 'MENSUAL'} className={inputClass}>
                <option value="MENSUAL">Mensual</option>
                <option value="POR_HORA">Por hora</option>
              </select>
            </Campo>
            <Campo label="Monto" name="monto" errors={state.fieldErrors?.monto} hint="Mensual: salario base. Por hora: tarifa.">
              <Input id="monto" name="monto" type="number" step="0.01" defaultValue={defaults?.monto} placeholder="0.00" />
            </Campo>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Campo label="Moneda" name="moneda">
              <select id="moneda" name="moneda" defaultValue={defaults?.moneda ?? 'MXN'} className={inputClass}>
                {MONEDAS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Período de pago" name="periodoPago">
              <select id="periodoPago" name="periodoPago" defaultValue={defaults?.periodoPago ?? 'QUINCENAL'} className={inputClass}>
                <option value="DIARIO">Diario</option>
                <option value="QUINCENAL">Quincenal</option>
                <option value="MENSUAL">Mensual</option>
              </select>
            </Campo>
            <Campo label="Multiplicador extra" name="multiplicadorExtra" errors={state.fieldErrors?.multiplicadorExtra} hint="1.25 = +25%">
              <Input id="multiplicadorExtra" name="multiplicadorExtra" type="number" step="0.05" defaultValue={defaults?.multiplicadorExtra ?? 1.25} />
            </Campo>
          </div>

          <input type="hidden" name="horasMesBase" value={defaults?.horasMesBase ?? 240} />

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'Guardando…' : 'Guardar compensación'}
            </Button>
            <Link href="/admin/nomina" className={cn(buttonVariants({ variant: 'ghost' }))}>
              Cancelar
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
