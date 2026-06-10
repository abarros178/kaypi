import { AreaPlaceholder } from '../../_components/area-placeholder';

export default function ReportesPage() {
  return (
    <AreaPlaceholder
      titulo="Reportes y dashboard"
      responsable="Andrés"
      descripcion="Los marcajes canónicos se interpretan al leer: faltas, retrasos y horas extra contra la jornada del empleado."
      items={[
        'Filtros: oficina, rango de fechas, empleado.',
        'Modo lista: nombre · oficina · faltas · retrasos · horas extra.',
        'Modo calendario: semana de empleados × días.',
        'PDF mensual por empleado (formato a cerrar con Néstor).',
      ]}
    />
  );
}
