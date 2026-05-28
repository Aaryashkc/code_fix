const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  getMyRequests,
  getBooking,
  acceptBooking,
  declineBooking,
  cancelBooking,
  completeBooking,
  respondToBooking,
  getGuideStats,
  getBookingStats,
  getAllBookings,
  counterOffer,
  reviseOffer,
  acceptPrice,
  updateBookingDestinations
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');

// Specific routes FIRST (before dynamic :id routes)
// Admin routes
router.get('/stats', protect, authorize('admin'), getBookingStats);

// Tourist routes
router.get('/my-bookings', protect, authorize('tourist'), getMyBookings);

// Guide routes
router.get('/my-requests', protect, authorize('guide'), getMyRequests);
router.get('/guide/stats', protect, authorize('guide'), getGuideStats);

// Admin get all (must be before /:id)
router.get('/', protect, authorize('admin'), getAllBookings);

// Dynamic routes (LAST)
router.get('/:id', protect, getBooking);
router.post('/', protect, authorize('tourist'), createBooking);
router.put('/:id/cancel', protect, authorize('tourist'), cancelBooking);
router.patch('/:id/destinations', protect, authorize('tourist'), updateBookingDestinations);
// C-3: POST /:id/review removed — use POST /api/reviews instead (standalone Review model)
router.put('/:id/accept', protect, authorize('guide'), acceptBooking);
router.put('/:id/decline', protect, authorize('guide'), declineBooking);
router.patch('/:id/respond', protect, authorize('guide'), respondToBooking);
router.put('/:id/complete', protect, authorize('guide'), completeBooking);

// InDrive-style negotiation routes
router.put('/:id/counter-offer', protect, authorize('guide'), counterOffer);
router.put('/:id/revise-offer', protect, authorize('tourist'), reviseOffer);
router.put('/:id/accept-price', protect, acceptPrice);

module.exports = router;
