const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getPendingPayouts,
  createPayout,
  updatePayoutStatus,
  getPayoutHistory,
  getGuidePayouts,
  downloadPayoutSummary,
  requestPayout,
  getMyPayouts,
} = require('../controllers/payoutController');

// Guide routes (must be before /:id to avoid param collision)
router.post('/request', protect, authorize('guide'), requestPayout);
router.get('/my', protect, authorize('guide'), getMyPayouts);

// Admin routes
router.get('/pending', protect, authorize('admin'), getPendingPayouts);
router.get('/history', protect, authorize('admin'), getPayoutHistory);
router.get('/download', protect, authorize('admin'), downloadPayoutSummary);
router.post('/', protect, authorize('admin'), createPayout);
router.put('/:id/status', protect, authorize('admin'), updatePayoutStatus);

// Admin or own Guide
router.get('/guide/:id', protect, authorize('admin', 'guide'), getGuidePayouts);

module.exports = router;
