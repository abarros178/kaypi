import { describe, expect, it } from 'vitest';
import { dentroDeGeofence, haversineMetros } from './geo';

describe('haversineMetros', () => {
  it('da ~0 para el mismo punto', () => {
    const p = { lat: 19.4326, lng: -99.1332 };
    expect(haversineMetros(p, p)).toBeCloseTo(0, 1);
  });

  it('mide ~111 km por grado de latitud', () => {
    const d = haversineMetros({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });
});

describe('dentroDeGeofence', () => {
  const oficina = { lat: 19.4326, lng: -99.1332, geofenceRadiusM: 150 };

  it('acepta un punto dentro del radio', () => {
    expect(dentroDeGeofence({ lat: 19.4327, lng: -99.1333 }, oficina)).toBe(true);
  });

  it('rechaza un punto lejano', () => {
    expect(dentroDeGeofence({ lat: 19.5, lng: -99.2 }, oficina)).toBe(false);
  });
});
