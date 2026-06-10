import { AreaPlaceholder } from '../../_components/area-placeholder';

export default function KioscoPage() {
  return (
    <AreaPlaceholder
      titulo="Kiosco offline"
      responsable="Julián"
      descripcion="El mismo cliente web en modo kiosco sobre un PC fijo, con réplica local (embedded replica de Turso) que sincroniza con la base central."
      items={[
        'Cola offline: marcajes con fuente=KIOSCO_OFFLINE y hora local.',
        'Sincronización al recuperar red; el servidor concilia la hora canónica.',
        'QR dinámico / proximidad bluetooth para confirmar presencia.',
        'Conflictos: conservar ambos y marcar para revisión.',
      ]}
    />
  );
}
