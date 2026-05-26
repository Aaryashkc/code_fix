import { describe, it, expect } from 'vitest';
import {
  samplePolyline,
  pointToPolylineDistance,
  filterAmenitiesAlongRoute,
  deduplicateNearbyStops,
  type RouteSnackStop
} from '../lib/snackRouteUtils';
import type { Amenity } from '../lib/overpassService';

describe('snackRouteUtils', () => {
  // Coordinates for a simple mock route: Kathmandu to Bhaktapur-ish points
  const mockRoute: [number, number][] = [
    [27.7172, 85.324],  // Point A (Kathmandu)
    [27.7000, 85.350],  // Point B
    [27.6792, 85.420],  // Point C (Bhaktapur)
  ];

  describe('samplePolyline', () => {
    it('returns empty array for empty route', () => {
      expect(samplePolyline([])).toEqual([]);
    });

    it('returns single sample for single-point route', () => {
      const result = samplePolyline([[27.7172, 85.324]]);
      expect(result).toHaveLength(1);
      expect(result[0].point).toEqual([27.7172, 85.324]);
    });

    it('samples points along a multi-point polyline', () => {
      const result = samplePolyline(mockRoute, 1); // 1 km sampling interval
      expect(result.length).toBeGreaterThanOrEqual(2);
      // First and last points should be included
      expect(result[0].point).toEqual(mockRoute[0]);
      expect(result[result.length - 1].point).toEqual(mockRoute[mockRoute.length - 1]);
    });
  });

  describe('pointToPolylineDistance', () => {
    it('calculates the closest distance to any of the sampled points', () => {
      const sampled = samplePolyline(mockRoute, 0.5);
      
      // A point exactly on the start coordinate
      const resultA = pointToPolylineDistance([27.7172, 85.324], sampled);
      expect(resultA.distance).toBeCloseTo(0, 2);
      expect(resultA.nearestIndex).toBe(0);

      // A point far away
      const resultFar = pointToPolylineDistance([28.2096, 83.9856], sampled); // Pokhara
      expect(resultFar.distance).toBeGreaterThan(100); // More than 100km away
    });
  });

  describe('filterAmenitiesAlongRoute', () => {
    const mockAmenities: Amenity[] = [
      {
        id: 1,
        lat: 27.7175,
        lon: 85.3242,
        name: 'Close Cafe',
        type: 'cafe',
        tags: { amenity: 'cafe' }
      },
      {
        id: 2,
        lat: 27.7050,
        lon: 85.3480,
        name: 'Nearby Diner',
        type: 'restaurant',
        tags: { amenity: 'restaurant' }
      },
      {
        id: 3,
        lat: 28.2096,
        lon: 83.9856,
        name: 'Far Away Food',
        type: 'fast_food',
        tags: { amenity: 'fast_food' }
      }
    ];

    it('filters out amenities further than the buffer limit', () => {
      const bufferKm = 2; // 2km buffer
      const filtered = filterAmenitiesAlongRoute(mockAmenities, mockRoute, bufferKm);
      
      expect(filtered).toHaveLength(2);
      expect(filtered.map(s => s.name)).toContain('Close Cafe');
      expect(filtered.map(s => s.name)).toContain('Nearby Diner');
      expect(filtered.map(s => s.name)).not.toContain('Far Away Food');
    });

    it('sorts amenities based on their order along the route', () => {
      const filtered = filterAmenitiesAlongRoute(mockAmenities, mockRoute, 5);
      
      expect(filtered).toHaveLength(2);
      // Close Cafe (at Kathmandu start) should come before Nearby Diner (further along)
      expect(filtered[0].name).toBe('Close Cafe');
      expect(filtered[1].name).toBe('Nearby Diner');
    });
  });

  describe('deduplicateNearbyStops', () => {
    const stops: RouteSnackStop[] = [
      {
        id: 101,
        name: 'Cafe A (Closer)',
        lat: 27.7172,
        lng: 85.3240,
        type: 'cafe',
        tags: {},
        distanceFromRoute: 0.05,
        orderAlongRoute: 0
      },
      {
        id: 102,
        name: 'Cafe B (Slightly further)',
        lat: 27.7173,
        lng: 85.3241, // super close to Cafe A
        type: 'cafe',
        tags: {},
        distanceFromRoute: 0.15,
        orderAlongRoute: 0
      },
      {
        id: 103,
        name: 'Distant Restaurant',
        lat: 27.6792,
        lng: 85.4200, // far from A and B
        type: 'restaurant',
        tags: {},
        distanceFromRoute: 0.01,
        orderAlongRoute: 5
      }
    ];

    it('keeps only the closest stop if multiple fall within the separation limit', () => {
      const minSeparation = 0.5; // 500m separation
      const deduplicated = deduplicateNearbyStops(stops, minSeparation);

      expect(deduplicated).toHaveLength(2);
      // Cafe B should be removed, Cafe A kept because distanceFromRoute (0.05) < Cafe B (0.15)
      expect(deduplicated[0].name).toBe('Cafe A (Closer)');
      expect(deduplicated[1].name).toBe('Distant Restaurant');
    });

    it('keeps all stops if they are further than min separation', () => {
      const minSeparation = 0.01; // tiny separation
      const deduplicated = deduplicateNearbyStops(stops, minSeparation);

      expect(deduplicated).toHaveLength(3);
    });
  });
});
