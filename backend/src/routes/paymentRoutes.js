const express = require('express');
const router = express.Router();
const {
  initiatePayment,
  verifyPayment,
  getPaymentStatus,
  selectCashPayment,
  confirmCashPayment,
} = require('../controllers/paymentController');

// M-1: optionalProtect removed — imported but never applied to any route in this file
const { protect, authorize } = require('../middleware/auth');

router.post('/initiate', protect, authorize('tourist'), initiatePayment);
router.post('/verify', protect, authorize('tourist', 'admin'), verifyPayment);
router.post('/cash', protect, authorize('tourist'), selectCashPayment);
router.post('/confirm-cash', protect, authorize('guide'), confirmCashPayment);
router.get('/:bookingId/status', protect, getPaymentStatus);

module.exports = router;
