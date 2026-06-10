import { AreaPlaceholder } from '../../_components/area-placeholder';

export default function AdminPage() {
  return (
    <AreaPlaceholder
      titulo="Administración"
      responsable="Andrés"
      descripcion="Configuración del sistema: la oficina es el contenedor de toda la config y el empleado se asigna a una."
      items={[
        'Oficinas: CRUD con ubicación, radio de geofence y timezone.',
        'Jornadas: fija (entrada/salida + descanso) o flexible (solo máximos).',
        'Política de check-in: canales + nivel + enforcement + fallback.',
        'Empleados: alta/edición, asignación a oficina y jornada, rol.',
      ]}
    />
  );
}
