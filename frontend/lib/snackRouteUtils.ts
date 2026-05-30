/**
 * Utilities for detecting snack areas along a trip route.
 *
 * Uses haversine distance to approximate "point near polyline" checks,
 * avoiding the need for Turf.js as a heavy dependency.
 */

import { haversineDistance } from './distanceUtils';
import type { Amenity } from './overpassService';

export interface RouteSnackStop {
  id: number;
  name: string;
  lat: number;
  lng: number;
  type: 'cafe' | 'fast_food' | 'restaurant' | 'hotel' | 'guest_house' | 'hostel';
  tags: Record<string, string>;
  distanceFromRoute: number; // km from nearest route point
  orderAlongRoute: number;  // index of nearest sampled point (for ordering)
}

/**
 * Sample evenly-spaced points along a polyline.
 * This gives us a set of points we can use for proximity checks
 * without processing every coordinate in the route.
 *
 * @param coordinates - Array of [lat, lng] route coordinates
 * @param intervalKm - Distance between samples in km (default 0.5 = 500m)
 * @returns Sampled coordinates with their index
 */
export function samplePolyline(
  coordinates: [number, number][],
  intervalKm: number = 0.5
): { point: [number, number]; index: number }[] {
  if (coordinates.length === 0) return [];
  if (coordinates.length === 1) return [{ point: coordinates[0], index: 0 }];

  const samples: { point: [number, number]; index: number }[] = [
    { point: coordinates[0], index: 0 }
  ];

  let accumulated = 0;

  for (let i = 1; i < coordinates.length; i++) {
    const dist = haversineDistance(
      coordinates[i - 1][0], coordinates[i - 1][1],
      coordinates[i][0], coordinates[i][1]
    );
    accumulated += dist;

    if (accumulated >= intervalKm) {
      samples.push({ point: coordinates[i], index: i });
      accumulated = 0;
    }
  }

  // Always include the last point
  const last = coordinates[coordinates.length - 1];
  const lastSample = samples[samples.length - 1];
  if (lastSample.point[0] !== last[0] || lastSample.point[1] !== last[1]) {
    samples.push({ point: last, index: coordinates.length - 1 });
  }

  return samples;
}

/**
 * Calculate the minimum distance from a point to a polyline,
 * using sampled points for efficiency.
 *
 * @returns { distance: number, nearestIndex: number } distance in km
 */
export function pointToPolylineDistance(
  point: [number, number],
  sampledPoints: { point: [number, number]; index: number }[]
): { distance: number; nearestIndex: number } {
  let minDist = Infinity;
  let nearestIndex = 0;

  for (const sample of sampledPoints) {
    const dist = haversineDistance(
      point[0], point[1],
      sample.point[0], sample.point[1]
    );
    if (dist < minDist) {
      minDist = dist;
      nearestIndex = sample.index;
    }
  }

  return { distance: minDist, nearestIndex };
}

/**
 * Filter amenities that fall within a buffer distance of a route polyline.
 *
 * @param amenities - Array of amenities from Overpass API
 * @param routeCoordinates - Array of [lat, lng] from the route
 * @param bufferKm - Maximum distance from route in km (default 5)
 * @returns Filtered and ordered array of RouteSnackStop
 */
export function filterAmenitiesAlongRoute(
  amenities: Amenity[],
  routeCoordinates: [number, number][],
  bufferKm: number = 5
): RouteSnackStop[] {
  if (amenities.length === 0 || routeCoordinates.length === 0) return [];

  const samples = samplePolyline(routeCoordinates, 0.5);

  const results: RouteSnackStop[] = [];

  for (const amenity of amenities) {
    const { distance, nearestIndex } = pointToPolylineDistance(
      [amenity.lat, amenity.lon],
      samples
    );

    if (distance <= bufferKm) {
      results.push({
        id: amenity.id,
        name: amenity.name,
        lat: amenity.lat,
        lng: amenity.lon,
        type: amenity.type,
        tags: amenity.tags,
        distanceFromRoute: Math.round(distance * 100) / 100,
        orderAlongRoute: nearestIndex
      });
    }
  }

  // Sort by position along route direction
  results.sort((a, b) => a.orderAlongRoute - b.orderAlongRoute);

  return results;
}

/**
 * Deduplicate snack stops that are very close to each other.
 * Keeps the one closest to the route.
 *
 * @param stops - Ordered snack stops
 * @param minSeparationKm - Minimum distance between stops (default 0.3 = 300m)
 */
export function deduplicateNearbyStops(
  stops: RouteSnackStop[],
  minSeparationKm: number = 0.3
): RouteSnackStop[] {
  if (stops.length <= 1) return stops;

  const result: RouteSnackStop[] = [stops[0]];

  for (let i = 1; i < stops.length; i++) {
    const prev = result[result.length - 1];
    const dist = haversineDistance(prev.lat, prev.lng, stops[i].lat, stops[i].lng);

    if (dist >= minSeparationKm) {
      result.push(stops[i]);
    } else if (stops[i].distanceFromRoute < prev.distanceFromRoute) {
      // Replace prev with closer one
      result[result.length - 1] = stops[i];
    }
  }

  return result;
}
