'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Button, buttonVariants, Card, CardContent } from '@kaypi/ui';
import { cn } from '@kaypi/ui/cn';
import { type FormState } from '@/lib/forms';
import { CANALES, NIVELES } from '@/lib/validation/politica';
import { Campo, inputClass } from '../../_components/campo';

type Accion = (prev: FormState, formData: FormData) => Promise<FormState>;

export interface PoliticaDefaults {
  oficinaId?: string;
  canales?: string[];
  nivel?: string;
  enforcement?: string;
  fallbackHabilitado?: boolean;
}

export function PoliticaForm({
  action,
  oficinas,
  defaults,
  submitLabel,
  oficinaFija,
}: {
  action: Accion;
  oficinas: Array<{ id: string; nombre: string }>;
  defaults?: PoliticaDefaults;
  submitLabel: string;
  oficinaFija?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const canales = defaults?.canales ?? ['WEB', 'MOVIL'];

  return (
    <Card className="max-w-2xl">
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-4">
          <Campo label="Oficina" name="oficinaId" errors={state.fieldErrors?.oficinaId}>
            <select
              id="oficinaId"
              name="oficinaId"
              defaultValue={defaults?.oficinaId ?? ''}
              disabled={oficinaFija}
              className={inputClass}
            >
              <option value="" disabled>
                Selecciona…
              </option>
              {oficinas.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </select>
            {oficinaFija ? <input type="hidden" name="oficinaId" value={defaults?.oficinaId} /> : null}
          </Campo>

          <Campo label="Canales habilitados" name="canales" errors={state.fieldErrors?.canales}>
            <div className="flex flex-wrap gap-3">
              {CANALES.map((c) => (
                <label key={c} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <input type="checkbox" name="canales" value={c} defaultChecked={canales.includes(c)} />
                  {c}
                </label>
              ))}
            </div>
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Nivel requerido" name="nivel">
              <select id="nivel" name="nivel" defaultValue={defaults?.nivel ?? 'LOGIN_GEO'} className={inputClass}>
                {NIVELES.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Si un factor falla" name="enforcement" hint="FLAG: acepta y marca · BLOCK: rechaza">
              <select id="enforcement" name="enforcement" defaultValue={defaults?.enforcement ?? 'FLAG'} className={inputClass}>
                <option value="FLAG">Marcar (FLAG)</option>
                <option value="BLOCK">Bloquear (BLOCK)</option>
              </select>
            </Campo>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="fallbackHabilitado" defaultChecked={defaults?.fallbackHabilitado ?? true} />
            Habilitar código de fallback
          </label>

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'Guardando…' : submitLabel}
            </Button>
            <Link href="/admin/politicas" className={cn(buttonVariants({ variant: 'ghost' }))}>
              Cancelar
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
