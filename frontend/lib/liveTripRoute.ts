import type { RouteSnackStop } from './overpassService';
import type { LiveTripSession } from './liveTrip';
import { buildLiveTripRoutePath } from './liveTrip';

export function buildLiveTripWaypoints(session?: LiveTripSession | null) {
  const plannedPath = buildLiveTripRoutePath(session?.destinations || []);

  if (session?.latestLocation) {
    return [[session.latestLocation.lat, session.latestLocation.lng] as [number, number], ...plannedPath];
  }

  return plannedPath;
}

export function getRouteStopLabel(type: RouteSnackStop['type']) {
  if (type === 'hotel') return 'Hotel';
  if (type === 'guest_house') return 'Guest house';
  if (type === 'hostel') return 'Hostel';
  if (type === 'restaurant') return 'Restaurant';
  if (type === 'fast_food') return 'Fast food';
  return 'Cafe';
}

export function getRouteStopKey(stop: RouteSnackStop) {
  return `${stop.type}-${stop.id}`;
}

export function isLodgingStop(type: RouteSnackStop['type']) {
  return type === 'hotel' || type === 'guest_house' || type === 'hostel';
}

export function formatRouteDistance(distanceMeters?: number | null) {
  if (!Number.isFinite(Number(distanceMeters))) return 'Route pending';
  const km = Number(distanceMeters) / 1000;
  return `${km.toFixed(km >= 10 ? 0 : 1)} km`;
}

export function formatNearbyDistance(distanceKm: number) {
  if (!Number.isFinite(distanceKm)) return 'Nearby';
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m away`;
  return `${distanceKm.toFixed(1)} km away`;
}
