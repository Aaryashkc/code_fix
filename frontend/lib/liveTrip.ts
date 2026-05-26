import type { ExploreMarker } from '@/components/map/UserExploreMap';

export interface LiveTripDestination {
  _id: string;
  name: string;
  category: string;
  images?: string[];
  location?: {
    coordinates?: [number, number];
    address?: string;
  };
}

export interface LiveTripParticipant {
  id: string;
  name: string;
  email?: string;
}

export interface LiveTripBookingSummary {
  _id: string;
  startDate: string;
  endDate: string;
  status: string;
  paymentStatus?: string;
  paymentMethod?: string;
  packageType?: string;
  numberOfDays?: number;
  groupSize?: number;
}

export interface LiveTripLocation {
  lat: number;
  lng: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  updatedAt: string;
  userId?: string | null;
}

export interface LiveTripSos {
  message: string;
  triggeredAt: string;
  lat?: number | null;
  lng?: number | null;
  userId?: string | null;
  triggeredBy?: string | null;
}

export interface LiveTripEvent {
  _id: string;
  bookingId: string;
  type: 'trip_joined' | 'trip_left' | 'location_update' | 'sos_triggered';
  actor?: string | null;
  actorRole?: string | null;
  message?: string;
  location?: {
    lat?: number;
    lng?: number;
    accuracy?: number;
    heading?: number;
    speed?: number;
  } | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface LiveTripSession {
  bookingId: string;
  room: string;
  booking: LiveTripBookingSummary;
  tourist: LiveTripParticipant | null;
  guide: LiveTripParticipant | null;
  destinations: LiveTripDestination[];
  latestLocation: LiveTripLocation | null;
  lastSOS: LiveTripSos | null;
  participantCount: number;
  connectedRoles: string[];
  recentEvents?: LiveTripEvent[];
  isLive: boolean;
  updatedAt: string;
}

export function upsertLiveTripSession(
  sessions: LiveTripSession[],
  incoming: Partial<LiveTripSession> & { bookingId: string }
) {
  const existingIndex = sessions.findIndex((session) => session.bookingId === incoming.bookingId);

  if (existingIndex === -1) {
    return [incoming as LiveTripSession, ...sessions];
  }

  const existingSession = sessions[existingIndex];
  const mergedSession = {
    ...existingSession,
    ...incoming,
    booking: incoming.booking || existingSession.booking,
    tourist: incoming.tourist ?? existingSession.tourist,
    guide: incoming.guide ?? existingSession.guide,
    destinations: incoming.destinations || existingSession.destinations,
    latestLocation: incoming.latestLocation ?? existingSession.latestLocation,
    lastSOS: incoming.lastSOS ?? existingSession.lastSOS,
    connectedRoles: incoming.connectedRoles || existingSession.connectedRoles,
    recentEvents: incoming.recentEvents || existingSession.recentEvents,
  };

  const nextSessions = [...sessions];
  nextSessions[existingIndex] = mergedSession;
  return nextSessions;
}

export function prependLiveTripEvent(
  sessions: LiveTripSession[],
  bookingId: string,
  event: LiveTripEvent
) {
  return upsertLiveTripSession(sessions, {
    bookingId,
    recentEvents: [
      event,
      ...(sessions.find((session) => session.bookingId === bookingId)?.recentEvents || [])
        .filter((entry) => entry._id !== event._id),
    ].slice(0, 8),
  });
}

export function getLiveTripEventLabel(event: LiveTripEvent) {
  if (event.type === 'sos_triggered') return 'SOS triggered';
  if (event.type === 'location_update') return 'Location checkpoint';
  if (event.type === 'trip_joined') return 'Joined monitoring';
  if (event.type === 'trip_left') return 'Left monitoring';
  return 'Live trip event';
}

export function buildLiveTripMarkers(destinations: LiveTripDestination[]): ExploreMarker[] {
  return destinations
    .filter((destination) => Array.isArray(destination.location?.coordinates))
    .map((destination, index) => ({
      id: destination._id,
      name: `${index + 1}. ${destination.name}`,
      category: destination.category || 'Destination',
      address: destination.location?.address || 'Nepal',
      lat: Number(destination.location?.coordinates?.[1]),
      lng: Number(destination.location?.coordinates?.[0]),
      rating: 4.7,
    }))
    .filter((destination) => Number.isFinite(destination.lat) && Number.isFinite(destination.lng));
}

export function buildLiveTripRoutePath(destinations: LiveTripDestination[]) {
  return destinations
    .filter((destination) => Array.isArray(destination.location?.coordinates))
    .map((destination) => [
      Number(destination.location?.coordinates?.[1]),
      Number(destination.location?.coordinates?.[0]),
    ] as [number, number])
    .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
}
