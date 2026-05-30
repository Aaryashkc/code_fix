export interface GeocodedPlace {
  name: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
    address: string;
  };
}

interface NominatimResult {
  lat?: string;
  lon?: string;
  display_name?: string;
}

export async function geocodePlaceName(name: string): Promise<GeocodedPlace | null> {
  const query = name.trim().replace(/\s+/g, ' ');
  if (!query) return null;

  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '1',
    addressdetails: '1',
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Nominatim geocoding failed with status ${response.status}`);
  }

  const results = (await response.json()) as NominatimResult[];
  const result = results[0];
  const lat = Number(result?.lat);
  const lng = Number(result?.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    name: query,
    location: {
      type: 'Point',
      coordinates: [lng, lat],
      address: result.display_name || query,
    },
  };
}
