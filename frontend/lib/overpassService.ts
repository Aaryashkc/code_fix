/**
 * Overpass API Service for fetching nearby amenities
 * with simple in-memory caching to avoid rate limits
 */

import {
  deduplicateNearbyStops,
  filterAmenitiesAlongRoute,
  type RouteSnackStop,
} from './snackRouteUtils';

interface Amenity {
  id: number;
  name: string;
  lat: number;
  lon: number;
  type: 'cafe' | 'fast_food' | 'restaurant';
  tags: Record<string, string>;
}

interface CacheEntry {
  data: Amenity[];
  timestamp: number;
}

interface OverpassElement {
  id: number;
  type: 'node' | 'way' | 'relation';
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags: Record<string, string>;
}

// Simple in-memory cache
const cache = new Map<string, CacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// In-flight request deduplication — prevents duplicate API calls for same location
const inFlight = new Map<string, Promise<Amenity[] | RouteSnackStop[]>>();

/**
 * Generate cache key based on location and radius
 */
function generateCacheKey(lat: number, lon: number, radius: number): string {
  // Round to 3 decimal places for approximate location matching (~100m precision)
  const roundedLat = Math.round(lat * 1000) / 1000;
  const roundedLon = Math.round(lon * 1000) / 1000;
  return `${roundedLat},${roundedLon},${radius}`;
}

function generateRouteCacheKey(routePoints: [number, number][], radius: number): string {
  const sampled = sampleRoutePoints(routePoints, 8)
    .map(([lat, lon]) => `${Math.round(lat * 1000) / 1000},${Math.round(lon * 1000) / 1000}`)
    .join('|');
  return `route-snacks:${radius}:${sampled}`;
}

function sampleRoutePoints(routePoints: [number, number][], maxPoints: number): [number, number][] {
  if (routePoints.length <= maxPoints) return routePoints;

  return Array.from({ length: maxPoints }, (_, index) => {
    const routeIndex = Math.round((index * (routePoints.length - 1)) / (maxPoints - 1));
    return routePoints[routeIndex];
  });
}

function mapOverpassElementsToAmenities(elements: OverpassElement[]): Amenity[] {
  return elements
    .filter((element) => element.tags && element.tags.name)
    .map((element) => {
      const isWay = element.type === 'way';
      const eLat = isWay ? element.center?.lat : element.lat;
      const eLon = isWay ? element.center?.lon : element.lon;
      if (!eLat || !eLon) return null;
      return {
        id: element.id,
        name: element.tags.name,
        lat: eLat,
        lon: eLon,
        type: element.tags.amenity as 'cafe' | 'fast_food' | 'restaurant',
        tags: element.tags,
      };
    })
    .filter(Boolean) as Amenity[];
}

/**
 * Check if cache entry is valid
 */
function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_DURATION;
}

/**
 * Fetch nearby coffee, tea, snacks using Overpass API
 * Searches for: cafes, fast food, restaurants within specified radius
 *
 * @param lat - Latitude
 * @param lon - Longitude
 * @param radius - Search radius in meters (default: 50000 = 50km)
 * @returns Array of amenities with name, location, and type
 */
export async function fetchNearbyAmenities(
  lat: number,
  lon: number,
  radius: number = 50000
): Promise<Amenity[]> {
  const cacheKey = generateCacheKey(lat, lon, radius);

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && isCacheValid(cached)) {
    return cached.data;
  }

  // Deduplicate concurrent requests for the same location
  const existing = inFlight.get(cacheKey);
  if (existing) {
    return existing as Promise<Amenity[]>;
  }

  // Overpass API query for cafes, fast food, and restaurants
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="cafe"](around:${radius},${lat},${lon});
      node["amenity"="fast_food"](around:${radius},${lat},${lon});
      node["amenity"="restaurant"](around:${radius},${lat},${lon});
      way["amenity"="cafe"](around:${radius},${lat},${lon});
      way["amenity"="fast_food"](around:${radius},${lat},${lon});
      way["amenity"="restaurant"](around:${radius},${lat},${lon});
    );
    out center;
  `;

  const request = (async () => {
    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`);
      }

      const data = await response.json();

      const amenities = mapOverpassElementsToAmenities(data.elements as OverpassElement[]);

      cache.set(cacheKey, { data: amenities, timestamp: Date.now() });
      return amenities;
    } finally {
      inFlight.delete(cacheKey);
    }
  })();

  inFlight.set(cacheKey, request);
  return request;
}

export async function fetchSnacksAlongRoute(
  routePoints: [number, number][],
  radiusPerPoint: number = 500
): Promise<RouteSnackStop[]> {
  if (routePoints.length === 0) return [];

  const cacheKey = generateRouteCacheKey(routePoints, radiusPerPoint);

  const cached = cache.get(cacheKey);
  if (cached && isCacheValid(cached)) {
    return cached.data as unknown as RouteSnackStop[];
  }

  const existing = inFlight.get(cacheKey);
  if (existing) {
    return existing as Promise<RouteSnackStop[]>;
  }

  const samplePoints = sampleRoutePoints(routePoints, 8);
  const queryParts = samplePoints.flatMap(([lat, lon]) => [
    `node["amenity"="cafe"](around:${radiusPerPoint},${lat},${lon});`,
    `node["amenity"="fast_food"](around:${radiusPerPoint},${lat},${lon});`,
    `node["amenity"="restaurant"](around:${radiusPerPoint},${lat},${lon});`,
    `way["amenity"="cafe"](around:${radiusPerPoint},${lat},${lon});`,
    `way["amenity"="fast_food"](around:${radiusPerPoint},${lat},${lon});`,
    `way["amenity"="restaurant"](around:${radiusPerPoint},${lat},${lon});`,
  ]);

  const query = `
    [out:json][timeout:25];
    (
      ${queryParts.join('\n      ')}
    );
    out center;
  `;

  const request = (async () => {
    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`);
      }

      const data = await response.json();
      const byId = new Map<string, Amenity>();

      for (const amenity of mapOverpassElementsToAmenities(data.elements as OverpassElement[])) {
        byId.set(`${amenity.type}:${amenity.id}`, amenity);
      }

      const routeStops = deduplicateNearbyStops(
        filterAmenitiesAlongRoute(Array.from(byId.values()), routePoints, radiusPerPoint / 1000),
        0.15
      ).slice(0, 12);

      cache.set(cacheKey, { data: routeStops as unknown as Amenity[], timestamp: Date.now() });
      return routeStops;
    } finally {
      inFlight.delete(cacheKey);
    }
  })();

  inFlight.set(cacheKey, request);
  return request;
}

/**
 * Clear all cached data
 */
export function clearAmenitiesCache(): void {
  cache.clear();
  console.log('[Overpass] Cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}

export type { Amenity, RouteSnackStop };
