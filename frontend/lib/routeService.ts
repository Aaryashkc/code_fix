export interface RoadRoute {
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

interface OsrmRouteResponse {
  routes?: Array<{
    distance: number;
    duration: number;
    geometry?: {
      coordinates?: [number, number][];
    };
  }>;
}

export async function fetchRoadRoute(points: [number, number][]): Promise<RoadRoute | null> {
  if (points.length < 2) return null;

  const coordinates = points.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Route service error: ${response.status}`);
  }

  const data = (await response.json()) as OsrmRouteResponse;
  const route = data.routes?.[0];
  const geometry = route?.geometry?.coordinates;

  if (!route || !geometry || geometry.length < 2) {
    return null;
  }

  return {
    coordinates: geometry.map(([lng, lat]) => [lat, lng]),
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  };
}
