import { Coffee, LogIn, LogOut, Play } from 'lucide-react';
import type { TipoMarcaje } from '@kaypi/shared';
import { Badge, type BadgeProps } from './badge';

const MAPA: Record<
  TipoMarcaje,
  { label: string; variant: BadgeProps['variant']; Icon: typeof LogIn }
> = {
  IN: { label: 'Entrada', variant: 'success', Icon: LogIn },
  OUT: { label: 'Salida', variant: 'neutral', Icon: LogOut },
  BREAK_START: { label: 'Inicio descanso', variant: 'warning', Icon: Coffee },
  BREAK_END: { label: 'Fin descanso', variant: 'warning', Icon: Play },
};

/** Badge que traduce un tipo de marcaje canónico a color + ícono + etiqueta. */
export function EstadoMarcaje({ tipo }: { tipo: TipoMarcaje }) {
  const { label, variant, Icon } = MAPA[tipo];
  return (
    <Badge variant={variant}>
      <Icon />
      {label}
    </Badge>
  );
}
