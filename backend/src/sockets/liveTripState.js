const liveTripSessions = new Map();

function createBaseSession(bookingId) {
  return {
    bookingId,
    room: `trip:${bookingId}`,
    booking: null,
    tourist: null,
    guide: null,
    destinations: [],
    latestLocation: null,
    lastSOS: null,
    participantSockets: new Map(),
    connectedRoles: new Set(),
    updatedAt: new Date().toISOString(),
  };
}

function mergeMetadata(target, metadata = {}) {
  if (metadata.room) {
    target.room = metadata.room;
  }
  if (metadata.booking) {
    target.booking = metadata.booking;
  }
  if (metadata.tourist) {
    target.tourist = metadata.tourist;
  }
  if (metadata.guide) {
    target.guide = metadata.guide;
  }
  if (Array.isArray(metadata.destinations)) {
    target.destinations = metadata.destinations;
  }
}

function ensureSession(bookingId, metadata = {}) {
  const normalizedBookingId = String(bookingId);
  const session = liveTripSessions.get(normalizedBookingId) || createBaseSession(normalizedBookingId);
  mergeMetadata(session, metadata);
  session.updatedAt = new Date().toISOString();
  liveTripSessions.set(normalizedBookingId, session);
  return session;
}

function createSnapshot(session) {
  return {
    bookingId: session.bookingId,
    room: session.room,
    booking: session.booking,
    tourist: session.tourist,
    guide: session.guide,
    destinations: session.destinations,
    latestLocation: session.latestLocation,
    lastSOS: session.lastSOS,
    participantCount: session.participantSockets.size,
    connectedRoles: Array.from(session.connectedRoles),
    isLive: Boolean(session.participantSockets.size > 0 || session.latestLocation || session.lastSOS),
    updatedAt: session.updatedAt,
  };
}

function refreshConnectedRoles(session) {
  session.connectedRoles = new Set(
    Array.from(session.participantSockets.values())
      .map((participant) => participant.role)
      .filter(Boolean)
  );
}

function joinTripSession(bookingId, metadata, socketInfo) {
  const session = ensureSession(bookingId, metadata);
  session.participantSockets.set(socketInfo.socketId, {
    role: socketInfo.role,
    userId: socketInfo.userId,
  });
  refreshConnectedRoles(session);
  session.updatedAt = new Date().toISOString();
  return createSnapshot(session);
}

function leaveTripSession(bookingId, socketId) {
  const session = liveTripSessions.get(String(bookingId));
  if (!session) {
    return null;
  }

  session.participantSockets.delete(socketId);
  refreshConnectedRoles(session);
  session.updatedAt = new Date().toISOString();

  if (
    session.participantSockets.size === 0 &&
    !session.latestLocation &&
    !session.lastSOS
  ) {
    liveTripSessions.delete(String(bookingId));
    return null;
  }

  return createSnapshot(session);
}

function updateTripLocation(bookingId, metadata, location) {
  const session = ensureSession(bookingId, metadata);
  session.latestLocation = {
    lat: location.lat,
    lng: location.lng,
    accuracy: location.accuracy || null,
    heading: location.heading || null,
    speed: location.speed || null,
    updatedAt: location.updatedAt || new Date().toISOString(),
    userId: location.userId || null,
  };
  session.updatedAt = new Date().toISOString();
  return createSnapshot(session);
}

function triggerTripSOS(bookingId, metadata, alert) {
  const session = ensureSession(bookingId, metadata);
  session.lastSOS = {
    message: alert.message || 'SOS alert triggered',
    triggeredAt: alert.triggeredAt || new Date().toISOString(),
    lat: Number.isFinite(alert.lat) ? alert.lat : null,
    lng: Number.isFinite(alert.lng) ? alert.lng : null,
    userId: alert.userId || null,
    triggeredBy: alert.triggeredBy || null,
  };
  session.updatedAt = new Date().toISOString();
  return createSnapshot(session);
}

function getLiveTripSnapshot(bookingId) {
  const session = liveTripSessions.get(String(bookingId));
  return session ? createSnapshot(session) : null;
}

function listLiveTripSnapshots() {
  return Array.from(liveTripSessions.values())
    .map((session) => createSnapshot(session))
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

module.exports = {
  getLiveTripSnapshot,
  joinTripSession,
  leaveTripSession,
  listLiveTripSnapshots,
  triggerTripSOS,
  updateTripLocation,
};
