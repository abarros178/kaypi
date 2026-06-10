import { AreaPlaceholder } from '../../_components/area-placeholder';

export default function CheckinPage() {
  return (
    <AreaPlaceholder
      titulo="Check-in (web / kiosco)"
      responsable="Julián"
      descripcion="Una sola plataforma web que detecta el contexto (web vs kiosco) y el estado de red (online vs offline), y produce el evento canónico vía /api/checkin."
      items={[
        'Login + selección de tipo de marcaje (IN/OUT/BREAK) en ≤5s.',
        'Niveles: solo login · login+geo · login+facial (según política).',
        'Confirmación visual inmediata (ConfirmCheck + toast).',
        'Fallback con código rotativo cuando un factor falla.',
      ]}
    />
  );
}
