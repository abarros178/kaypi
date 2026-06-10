import { crearOficina } from '../actions';
import { OficinaForm } from '../_components/oficina-form';

export default function NuevaOficinaPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nueva oficina</h1>
        <p className="text-muted-foreground">Ubicación, geofence y zona horaria de la sede.</p>
      </div>
      <OficinaForm action={crearOficina} submitLabel="Crear oficina" />
    </div>
  );
}
