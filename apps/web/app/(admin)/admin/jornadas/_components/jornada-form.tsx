'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Button, buttonVariants, Card, CardContent, Input } from '@kaypi/ui';
import { cn } from '@kaypi/ui/cn';
import { type FormState } from '@/lib/forms';
import { Campo, inputClass } from '../../_components/campo';

type Accion = (prev: FormState, formData: FormData) => Promise<FormState>;

export interface JornadaDefaults {
  oficinaId?: string;
  nombre?: string;
  tipo?: 'FIJA' | 'FLEXIBLE';
  maxHorasDiarias?: number;
  maxHorasSemanales?: number;
  horaEntrada?: string;
  horaSalida?: string;
  descansoInicio?: string;
  descansoFin?: string;
  descansoMin?: number;
  toleranciaRetrasoMin?: number;
}

export function JornadaForm({
  action,
  oficinas,
  defaults,
  submitLabel,
}: {
  action: Accion;
  oficinas: Array<{ id: string; nombre: string }>;
  defaults?: JornadaDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [tipo, setTipo] = useState<'FIJA' | 'FLEXIBLE'>(defaults?.tipo ?? 'FIJA');

  return (
    <Card className="max-w-2xl">
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-4">
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

          <Campo label="Nombre" name="nombre" errors={state.fieldErrors?.nombre}>
            <Input id="nombre" name="nombre" defaultValue={defaults?.nombre} placeholder="Jornada estándar" />
          </Campo>

          <div className="grid gap-4 sm:grid-cols-3">
            <Campo label="Tipo" name="tipo">
              <select
                id="tipo"
                name="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as 'FIJA' | 'FLEXIBLE')}
                className={inputClass}
              >
                <option value="FIJA">Fija</option>
                <option value="FLEXIBLE">Flexible</option>
              </select>
            </Campo>
            <Campo label="Máx. horas/día" name="maxHorasDiarias" errors={state.fieldErrors?.maxHorasDiarias}>
              <Input id="maxHorasDiarias" name="maxHorasDiarias" type="number" step="0.5" defaultValue={defaults?.maxHorasDiarias ?? 8} />
            </Campo>
            <Campo label="Máx. horas/semana" name="maxHorasSemanales" errors={state.fieldErrors?.maxHorasSemanales}>
              <Input id="maxHorasSemanales" name="maxHorasSemanales" type="number" step="0.5" defaultValue={defaults?.maxHorasSemanales ?? 40} />
            </Campo>
          </div>

          {tipo === 'FIJA' ? (
            <div className="flex flex-col gap-4 rounded-md border border-dashed p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo label="Hora de entrada" name="horaEntrada" errors={state.fieldErrors?.horaEntrada}>
                  <Input id="horaEntrada" name="horaEntrada" type="time" defaultValue={defaults?.horaEntrada ?? '09:00'} />
                </Campo>
                <Campo label="Hora de salida" name="horaSalida" errors={state.fieldErrors?.horaSalida}>
                  <Input id="horaSalida" name="horaSalida" type="time" defaultValue={defaults?.horaSalida ?? '18:00'} />
                </Campo>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Campo label="Descanso inicio" name="descansoInicio">
                  <Input id="descansoInicio" name="descansoInicio" type="time" defaultValue={defaults?.descansoInicio ?? '13:00'} />
                </Campo>
                <Campo label="Descanso fin" name="descansoFin">
                  <Input id="descansoFin" name="descansoFin" type="time" defaultValue={defaults?.descansoFin ?? '14:00'} />
                </Campo>
                <Campo label="Tolerancia (min)" name="toleranciaRetrasoMin">
                  <Input id="toleranciaRetrasoMin" name="toleranciaRetrasoMin" type="number" defaultValue={defaults?.toleranciaRetrasoMin ?? 5} />
                </Campo>
              </div>
            </div>
          ) : (
            <input type="hidden" name="toleranciaRetrasoMin" value={defaults?.toleranciaRetrasoMin ?? 5} />
          )}

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'Guardando…' : submitLabel}
            </Button>
            <Link href="/admin/jornadas" className={cn(buttonVariants({ variant: 'ghost' }))}>
              Cancelar
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
