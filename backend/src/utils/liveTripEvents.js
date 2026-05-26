const LiveTripEvent = require('../models/LiveTripEvent');

const LOCATION_EVENT_MIN_INTERVAL_MS = 60 * 1000;

function sanitizeLocation(location = {}) {
  const lat = Number(location.lat);
  const lng = Number(location.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return undefined;
  }

  return {
    lat,
    lng,
    accuracy: Number.isFinite(Number(location.accuracy)) ? Number(location.accuracy) : undefined,
    heading: Number.isFinite(Number(location.heading)) ? Number(location.heading) : undefined,
    speed: Number.isFinite(Number(location.speed)) ? Number(location.speed) : undefined,
  };
}

function toEventDto(event) {
  return {
    _id: event._id.toString(),
    bookingId: event.booking?.toString?.() || String(event.booking),
    type: event.type,
    actor: event.actor?.toString?.() || event.actor || null,
    actorRole: event.actorRole || null,
    message: event.message || '',
    location: event.location || null,
    metadata: event.metadata || {},
    createdAt: event.createdAt,
  };
}

async function recordLiveTripEvent({
  bookingId,
  type,
  actorId,
  actorRole,
  message,
  location,
  metadata,
}) {
  if (!bookingId || !type) return null;

  const event = await LiveTripEvent.create({
    booking: bookingId,
    type,
    actor: actorId || undefined,
    actorRole,
    message,
    location: sanitizeLocation(location),
    metadata: metadata || {},
  });

  return toEventDto(event);
}

async function recordLocationMilestone({ socket, bookingId, actorId, actorRole, location }) {
  const now = Date.now();
  socket.data.lastPersistedLocationAtByBooking = socket.data.lastPersistedLocationAtByBooking || {};
  const lastPersistedAt = socket.data.lastPersistedLocationAtByBooking[bookingId] || 0;

  if (now - lastPersistedAt < LOCATION_EVENT_MIN_INTERVAL_MS) {
    return null;
  }

  socket.data.lastPersistedLocationAtByBooking[bookingId] = now;

  return recordLiveTripEvent({
    bookingId,
    type: 'location_update',
    actorId,
    actorRole,
    location,
  });
}

async function getRecentEventsForBookings(bookingIds, perBookingLimit = 8) {
  const normalizedIds = bookingIds.map((id) => String(id)).filter(Boolean);
  if (normalizedIds.length === 0) {
    return new Map();
  }

  const events = await LiveTripEvent.find({ booking: { $in: normalizedIds } })
    .sort({ createdAt: -1 })
    .limit(Math.max(normalizedIds.length * perBookingLimit, perBookingLimit))
    .lean();

  const eventsByBookingId = new Map();
  for (const event of events) {
    const bookingId = event.booking.toString();
    const bookingEvents = eventsByBookingId.get(bookingId) || [];
    if (bookingEvents.length < perBookingLimit) {
      bookingEvents.push(toEventDto(event));
      eventsByBookingId.set(bookingId, bookingEvents);
    }
  }

  return eventsByBookingId;
}

module.exports = {
  getRecentEventsForBookings,
  recordLiveTripEvent,
  recordLocationMilestone,
};
