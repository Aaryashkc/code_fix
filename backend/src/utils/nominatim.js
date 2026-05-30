const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

function hasValidCoordinates(location) {
  const coordinates = location?.coordinates;
  return (
    Array.isArray(coordinates) &&
    Number.isFinite(Number(coordinates[0])) &&
    Number.isFinite(Number(coordinates[1]))
  );
}

function normalizeLocation(location) {
  if (!location) return null;
  const coordinates = location.coordinates;
  if (!hasValidCoordinates(location)) return null;

  return {
    type: 'Point',
    coordinates: [Number(coordinates[0]), Number(coordinates[1])],
    address: String(location.address || '').trim(),
  };
}

async function geocodePlaceName(name) {
  const query = String(name || '').trim().replace(/\s+/g, ' ');
  if (!query) return null;

  const searchParams = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '1',
    addressdetails: '1',
  });

  try {
    const response = await fetch(`${NOMINATIM_URL}?${searchParams.toString()}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': process.env.NOMINATIM_USER_AGENT || 'YatraTravelApp/1.0',
      },
    });

    if (!response.ok) return null;

    const results = await response.json();
    const result = Array.isArray(results) ? results[0] : null;
    const lat = Number(result?.lat);
    const lon = Number(result?.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    return {
      type: 'Point',
      coordinates: [lon, lat],
      address: result.display_name || query,
    };
  } catch {
    return null;
  }
}

async function resolveLocationFromName(name, existingLocation) {
  const normalized = normalizeLocation(existingLocation);
  if (normalized) {
    return {
      ...normalized,
      address: normalized.address || String(name || '').trim(),
    };
  }

  return geocodePlaceName(name);
}

module.exports = {
  geocodePlaceName,
  hasValidCoordinates,
  normalizeLocation,
  resolveLocationFromName,
};
