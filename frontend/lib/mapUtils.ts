// Re-export from single source of truth
export { haversineDistance as getDistance, haversineDistance, formatDistance } from '@/lib/distanceUtils';
import { haversineDistance } from '@/lib/distanceUtils';

// Get nearby attractions within a certain radius
export function getNearbyAttractions<T extends { location?: { coordinates?: [number, number] } }>(
  centerLat: number,
  centerLng: number,
  attractions: T[],
  radiusKm: number = 50
): (T & { distance: number })[] {
  return attractions
    .filter((attraction) => attraction.location?.coordinates)
    .map((attraction) => {
      const [lng, lat] = attraction.location!.coordinates!;
      const distance = haversineDistance(centerLat, centerLng, lat, lng);
      return { ...attraction, distance };
    })
    .filter((attraction) => attraction.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
}

// Nepal bounds for map restrictions
export const NEPAL_BOUNDS: [[number, number], [number, number]] = [
  [26.3479, 80.0586], // Southwest
  [30.4469, 88.2015], // Northeast
];

// Popular cities in Nepal with coordinates
export const NEPAL_CITIES = [
  { name: 'Kathmandu', coordinates: [27.7172, 85.324] as [number, number] },
  { name: 'Pokhara', coordinates: [28.2096, 83.9856] as [number, number] },
  { name: 'Chitwan', coordinates: [27.5291, 84.3542] as [number, number] },
  { name: 'Lumbini', coordinates: [27.4833, 83.2833] as [number, number] },
  { name: 'Everest Base Camp', coordinates: [28.0026, 86.8528] as [number, number] },
  { name: 'Annapurna', coordinates: [28.5967, 83.8203] as [number, number] },
];
