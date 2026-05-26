const express = require('express');
const router = express.Router();
const {
  getGuides,
  getGuide,
  updateAvailability,
  getGuideBookingHistory,
  getOnlineGuides
} = require('../controllers/guideController');
const { protect, authorize } = require('../middleware/auth');

// Specific routes BEFORE dynamic :id
router.get('/online', getOnlineGuides);
router.put('/me/availability', protect, authorize('guide'), updateAvailability);
router.get('/', getGuides);
router.get('/:id/booking-history', getGuideBookingHistory);
router.get('/:id', getGuide);

module.exports = router;
