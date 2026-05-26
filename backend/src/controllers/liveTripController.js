const Booking = require('../models/Booking');
const { buildTripMetadata } = require('../utils/liveTripAccess');
const { getRecentEventsForBookings } = require('../utils/liveTripEvents');
const { listLiveTripSnapshots } = require('../sockets/liveTripState');

const LIVE_ELIGIBLE_STATUSES = ['confirmed', 'completed'];

exports.getAccessibleLiveTrips = async (req, res) => {
  try {
    const filter = {
      status: { $in: LIVE_ELIGIBLE_STATUSES },
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

      return {
        bookingId: metadata.bookingId,
        room: metadata.room,
        booking: metadata.booking,
        tourist: metadata.tourist,
        guide: metadata.guide,
        destinations: metadata.destinations,
        latestLocation: snapshot?.latestLocation || null,
        lastSOS: snapshot?.lastSOS || null,
        participantCount: snapshot?.participantCount || 0,
        connectedRoles: snapshot?.connectedRoles || [],
        recentEvents: eventsByBookingId.get(booking._id.toString()) || [],
        isLive: Boolean(snapshot?.isLive),
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
