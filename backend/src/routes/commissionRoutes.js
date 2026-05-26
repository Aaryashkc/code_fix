const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getCommissionDashboard,
  getMyCommissions,
  setGuideCommissionRate,
  getGlobalCommissionRate,
  setGlobalCommissionRate
} = require('../controllers/commissionController');

// Admin routes
router.get('/dashboard', protect, authorize('admin'), getCommissionDashboard);
router.get('/global-rate', protect, authorize('admin'), getGlobalCommissionRate);
router.put('/global-rate', protect, authorize('admin'), setGlobalCommissionRate);
router.put('/guide/:id/rate', protect, authorize('admin'), setGuideCommissionRate);

// Guide routes
router.get('/my', protect, authorize('guide'), getMyCommissions);

module.exports = router;
