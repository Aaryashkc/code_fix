const Booking = require('../models/Booking');

function createAccessError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function buildTripMetadata(booking) {
  return {
    bookingId: booking._id.toString(),
    room: `trip:${booking._id.toString()}`,
    booking: {
      _id: booking._id.toString(),
      startDate: booking.startDate,
      endDate: booking.endDate,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      paymentMethod: booking.paymentMethod,
      packageType: booking.packageType,
      numberOfDays: booking.numberOfDays,
      groupSize: booking.groupSize,
    },
    tourist: booking.tourist ? {
      id: booking.tourist._id.toString(),
      name: booking.tourist.name,
      email: booking.tourist.email,
    } : null,
    guide: booking.guide ? {
      id: booking.guide._id.toString(),
      name: booking.guide.name,
      email: booking.guide.email,
    } : null,
    destinations: (booking.destinations || []).map((destination) => ({
      _id: destination._id.toString(),
      name: destination.name,
      category: destination.category,
      images: destination.images || [],
      location: destination.location,
    })),
    customDestinations: (booking.customDestinations || []).map((destination, index) => ({
      _id: `custom-${index}`,
      name: destination.name,
      category: 'Custom destination',
      images: [],
      location: destination.location || null,
      custom: true,
    })),
  };
}

async function getAccessibleBooking(bookingId, user) {
  const booking = await Booking.findById(bookingId)
    .populate('tourist', 'name email')
    .populate('guide', 'name email')
    .populate('destinations', 'name category images location');

  if (!booking) {
    throw createAccessError('Booking not found', 404);
  }

  const isAdmin = user.role === 'admin';
  const isTourist = booking.tourist?._id?.toString() === user.id;
  const isGuide = booking.guide?._id?.toString() === user.id;

  if (!isAdmin && !isTourist && !isGuide) {
    throw createAccessError('Not authorized to access this live trip', 403);
  }

  return {
    booking,
    metadata: buildTripMetadata(booking),
    permissions: {
      isAdmin,
      isGuide,
      isTourist,
    },
  };
}

module.exports = {
  buildTripMetadata,
  createAccessError,
  getAccessibleBooking,
};
