import { Badge } from '@kaypi/ui';

export function Proximamente({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        <Badge variant="warning">Próximamente</Badge>
      </div>
      <p className="max-w-prose text-muted-foreground">{descripcion}</p>
      <p className="text-sm text-muted-foreground">
        Misma estructura que Oficinas (Server Actions + validación + revalidación). Replica ese patrón aquí.
      </p>
    </div>
  );
}
