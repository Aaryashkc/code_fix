const express = require('express');
const router = express.Router();
const {
  initiatePayment,
  verifyPayment,
  getPaymentStatus,
  selectCashPayment,
  confirmCashPayment,
} = require('../controllers/paymentController');

const { protect, optionalProtect, authorize } = require('../middleware/auth');

router.post('/initiate', protect, authorize('tourist'), initiatePayment);
router.post('/verify', optionalProtect, verifyPayment);
router.post('/cash', protect, authorize('tourist'), selectCashPayment);
router.post('/confirm-cash', protect, authorize('guide'), confirmCashPayment);
router.get('/:bookingId/status', protect, getPaymentStatus);

module.exports = router;
