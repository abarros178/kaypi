/** Utilidades de geolocalización (puras, sin dependencias). */

const R_TIERRA_M = 6_371_000;
const rad = (grados: number): number => (grados * Math.PI) / 180;

export interface Punto {
  lat: number;
  lng: number;
}

/** Distancia en metros entre dos coordenadas (fórmula de Haversine). */
export function haversineMetros(a: Punto, b: Punto): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const lat1 = rad(a.lat);
  const lat2 = rad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R_TIERRA_M * Math.asin(Math.sqrt(h));
}

/** ¿El marcaje cae dentro del radio de geofence de la oficina? */
export function dentroDeGeofence(
  marcaje: Punto,
  oficina: Punto & { geofenceRadiusM: number },
): boolean {
  return haversineMetros(marcaje, oficina) <= oficina.geofenceRadiusM;
}
