const Booking = require('../models/Booking');
const { buildTripMetadata, LIVE_TRIP_ACTIVE_STATUS } = require('../utils/liveTripAccess');
const { getRecentEventsForBookings } = require('../utils/liveTripEvents');
const { listLiveTripSnapshots } = require('../sockets/liveTripState');

const LIVE_LOCATION_FRESH_MS = 2 * 60 * 1000;

function hasCoordinates(location) {
  return Number.isFinite(Number(location?.lat)) && Number.isFinite(Number(location?.lng));
}

function getLatestLocationFromEvents(events = []) {
  const event = events.find((entry) => (
    entry.metadata?.locationSharingStopped ||
    (entry.type === 'location_update' && hasCoordinates(entry.location))
  ));
  if (event?.metadata?.locationSharingStopped) return null;
  if (!event) return null;

  return {
    lat: event.location.lat,
    lng: event.location.lng,
    accuracy: event.location.accuracy || null,
    heading: event.location.heading || null,
    speed: event.location.speed || null,
    updatedAt: event.createdAt,
    userId: event.actor || null,
  };
}

function getLastSosFromEvents(events = []) {
  const event = events.find((entry) => entry.type === 'sos_triggered');
  if (!event) return null;

  return {
    message: event.message || 'SOS alert triggered',
    triggeredAt: event.createdAt,
    lat: event.location?.lat || null,
    lng: event.location?.lng || null,
    userId: event.actor || null,
    triggeredBy: event.actorRole || null,
  };
}

exports.getAccessibleLiveTrips = async (req, res) => {
  try {
    const filter = {
      status: LIVE_TRIP_ACTIVE_STATUS,
    };

    if (req.user.role === 'tourist') {
      filter.tourist = req.user.id;
    } else if (req.user.role === 'guide') {
      filter.guide = req.user.id;
    }

    const bookings = await Booking.find(filter)
      .populate('tourist', 'name email')
      .populate('guide', 'name email')
      .populate('destinations', 'name category images location')
      .sort({ startDate: 1 })
      .lean();

    const snapshotsByBookingId = new Map(
      listLiveTripSnapshots().map((snapshot) => [snapshot.bookingId, snapshot])
    );
    const bookingIds = bookings.map((booking) => booking._id.toString());
    const eventsByBookingId = await getRecentEventsForBookings(bookingIds);

    const data = bookings.map((booking) => {
      const metadata = buildTripMetadata({
        ...booking,
        _id: booking._id,
        tourist: booking.tourist,
        guide: booking.guide,
        destinations: booking.destinations,
      });
      const snapshot = snapshotsByBookingId.get(booking._id.toString());
      const recentEvents = eventsByBookingId.get(booking._id.toString()) || [];
      const latestLocation = snapshot?.latestLocation || getLatestLocationFromEvents(recentEvents);
      const lastSOS = snapshot?.lastSOS || getLastSosFromEvents(recentEvents);
      const recentLocationIsFresh = latestLocation
        ? Date.now() - Date.parse(latestLocation.updatedAt) < LIVE_LOCATION_FRESH_MS
        : false;

      return {
        bookingId: metadata.bookingId,
        room: metadata.room,
        booking: metadata.booking,
        tourist: metadata.tourist,
        guide: metadata.guide,
        destinations: [...metadata.destinations, ...metadata.customDestinations],
        latestLocation,
        lastSOS,
        participantCount: snapshot?.participantCount || 0,
        connectedRoles: snapshot?.connectedRoles || [],
        recentEvents,
        isLive: Boolean(snapshot?.isLive || recentLocationIsFresh),
        updatedAt: snapshot?.updatedAt || booking.updatedAt,
      };
    });

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to load live trips',
      error: error.message,
    });
  }
};
