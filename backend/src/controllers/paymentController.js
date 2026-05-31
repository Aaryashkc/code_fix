const crypto = require('crypto');
const axios = require('axios');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { sendEmail } = require('../utils/email');
const { paymentInvoiceTemplate } = require('../utils/emailTemplates');
const { createAndEmit } = require('../utils/notificationService');
const { createCommissionForBooking } = require('../utils/commissionLedger');

if (!process.env.ESEWA_SECRET_KEY || !process.env.ESEWA_PRODUCT_CODE) {
  console.error('WARNING: eSewa payment credentials (ESEWA_SECRET_KEY, ESEWA_PRODUCT_CODE) are not set in environment variables');
}

const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY;
const ESEWA_PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE;
const ESEWA_PAYMENT_URL = process.env.ESEWA_PAYMENT_URL || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
const ESEWA_STATUS_URL = process.env.ESEWA_STATUS_URL || 'https://uat.esewa.com.np/api/epay/transaction/status/';
const hasInvalidEsewaConfig =
  !ESEWA_SECRET_KEY ||
  !ESEWA_PRODUCT_CODE ||
  String(ESEWA_SECRET_KEY).toLowerCase().includes('your-esewa') ||
  String(ESEWA_PRODUCT_CODE).toLowerCase().includes('your-esewa');

const getFrontendBaseUrl = () => {
  const fallback = 'http://localhost:3000';
  const raw = process.env.FRONTEND_URL || fallback;
  const firstUrl = raw
    .split(',')
    .map((value) => value.trim())
    .find(Boolean) || fallback;
  return firstUrl.replace(/\/+$/, '');
};

const normalizeEsewaPayload = (value = '') => {
  const normalized = String(value)
    .trim()
    // Some gateways/callbacks send '+' as spaces in query params.
    .replace(/\s/g, '+')
    // Support URL-safe base64 variants defensively.
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padLength = normalized.length % 4;
  if (padLength === 0) return normalized;
  return normalized + '='.repeat(4 - padLength);
};

const safeEquals = (a, b) => {
  const left = crypto.createHash('sha256').update(String(a)).digest();
  const right = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(left, right);
};

// Generate HMAC-SHA256 signature for eSewa
const generateEsewaSignature = (message) => {
  const hmac = crypto.createHmac('sha256', ESEWA_SECRET_KEY);
  hmac.update(message);
  return hmac.digest('base64');
};

// @desc    Initiate eSewa payment
// @route   POST /api/payments/initiate
// @access  Private (Tourist)
exports.initiatePayment = async (req, res) => {
  try {
    if (hasInvalidEsewaConfig) {
      return res.status(500).json({
        success: false,
        message: 'eSewa payment is not configured on server. Please set valid ESEWA credentials.'
      });
    }

    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId)
      .select('tourist guide status paymentStatus totalPrice');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.tourist.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to pay for this booking' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: 'Booking must be confirmed before payment' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'This booking has already been paid' });
    }

    const frontendUrl = getFrontendBaseUrl();
    const transaction_uuid = `yatra${booking._id.toString().slice(-8)}${Date.now().toString(36)}`;
    const total_amount = Math.round(booking.totalPrice);

    const signedFieldNames = 'total_amount,transaction_uuid,product_code';
    const signatureMessage = `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${ESEWA_PRODUCT_CODE}`;
    const signature = generateEsewaSignature(signatureMessage);

    // Standalone Mongo-safe atomic guard (no transaction required)
    const lockResult = await Booking.updateOne(
      {
        _id: bookingId,
        tourist: req.user.id,
        status: 'confirmed',
        paymentStatus: { $ne: 'paid' }
      },
      { $set: { paymentPidx: transaction_uuid, paymentMethod: 'esewa' } }
    );

    if (!lockResult.modifiedCount) {
      return res.status(409).json({
        success: false,
        message: 'Booking payment state changed. Please refresh and try again.'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        payment_url: ESEWA_PAYMENT_URL,
        formData: {
          amount: total_amount,
          tax_amount: 0,
          total_amount: total_amount,
          transaction_uuid: transaction_uuid,
          product_code: ESEWA_PRODUCT_CODE,
          product_service_charge: 0,
          product_delivery_charge: 0,

          success_url: `${frontendUrl}/user/bookings/payment-success`,
          failure_url: `${frontendUrl}/user/bookings/payment-failure`,
          signed_field_names: signedFieldNames,
          signature: signature,
        }
      }
    });
  } catch (error) {
    console.error('Payment initiation error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to initiate payment', error: error.message });
  }
};

// Helper to extract raw JSON values directly from the JSON string to preserve exact decimal formatting for signature verification
const getRawJsonFieldValue = (jsonStr, field) => {
  const regex = new RegExp(`"${field}"\\s*:\\s*(?:"([^"]*)"|([^,\\s}]+))`);
  const match = jsonStr.match(regex);
  if (!match) return null;
  return match[1] !== undefined ? match[1] : match[2];
};

// @desc    Verify eSewa payment (called after redirect back)
// @route   POST /api/payments/verify
// @access  Public with optional auth context
exports.verifyPayment = async (req, res) => {
  try {
    if (hasInvalidEsewaConfig) {
      return res.status(500).json({
        success: false,
        message: 'eSewa payment is not configured on server. Please set valid ESEWA credentials.'
      });
    }

    const encodedData = req.body?.encodedData || req.body?.data;

    if (!encodedData) {
      return res.status(400).json({ success: false, message: 'Payment data is required' });
    }

    // Decode base64 response from eSewa
    let paymentData;
    let decodedStr;
    try {
      const normalizedEncodedData = normalizeEsewaPayload(encodedData);
      decodedStr = Buffer.from(normalizedEncodedData, 'base64').toString('utf-8');
      paymentData = JSON.parse(decodedStr);
    } catch (_parseErr) {
      return res.status(400).json({ success: false, message: 'Invalid payment data format' });
    }

    const {
      transaction_uuid,
      transaction_code,
      product_code,
      total_amount,
      signed_field_names,
      signature
    } = paymentData;

    if (!transaction_uuid || !signed_field_names || !signature) {
      return res.status(400).json({ success: false, message: 'Signed payment data is required' });
    }

    const fields = String(signed_field_names)
      .split(',')
      .map((field) => field.trim())
      .filter(Boolean);
    const requiredSignedFields = ['transaction_uuid', 'total_amount', 'product_code'];
    if (requiredSignedFields.some((field) => !fields.includes(field))) {
      return res.status(400).json({ success: false, message: 'Payment signature is missing required fields' });
    }

    // Construct signature message by extracting raw values from decodedStr to preserve float representations (e.g. 1000.0)
    const signatureMessage = fields.map((field) => {
      const rawVal = getRawJsonFieldValue(decodedStr, field);
      return `${field}=${rawVal !== null ? rawVal : paymentData[field]}`;
    }).join(',');
    const expectedSignature = generateEsewaSignature(signatureMessage);
    if (!safeEquals(expectedSignature, signature)) {
      return res.status(400).json({ success: false, message: 'Payment signature verification failed' });
    }

    if (product_code !== ESEWA_PRODUCT_CODE) {
      return res.status(400).json({ success: false, message: 'Invalid payment product code' });
    }

    const booking = await Booking.findOne({ paymentPidx: transaction_uuid });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found for this payment' });
    }

    // SECURITY: Enforce that the caller is the booking tourist or an admin if they are logged in.
    // If they are not logged in (e.g., because of browser cookie block/expiration on redirect), 
    // the valid cryptographic signature verified above is sufficient proof of payment to mark the booking paid.
    if (req.user && booking.tourist.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to verify payment for this booking'
      });
    }

    const paidAmount = Number(String(total_amount).replace(/,/g, ''));
    const expectedAmount = Math.round(booking.totalPrice);
    if (!Number.isFinite(paidAmount) || paidAmount !== expectedAmount) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount does not match booking total'
      });
    }

    // Check eSewa status
    let esewaStatus;
    try {
      esewaStatus = await axios.get(ESEWA_STATUS_URL, {
        params: {
          product_code: ESEWA_PRODUCT_CODE,
          total_amount: paidAmount, // Use normalized integer value matching what was initiated
          transaction_uuid,
        },
        headers: { 'Accept': 'application/json' },
        timeout: 8000,
      });
    } catch (err) {
      console.error('eSewa status check error:', err.message);
      return res.status(502).json({
        success: false,
        message: 'Unable to confirm payment with eSewa. Please try again.'
      });
    }

    const providerStatus = String(esewaStatus?.data?.status || '').toUpperCase();
    const esewaComplete = providerStatus === 'COMPLETE';
    if (!esewaComplete) {
      return res.status(400).json({
        success: false,
        message: `Payment not completed. Status: ${providerStatus || 'UNKNOWN'}`,
        data: { status: providerStatus || 'UNKNOWN', bookingId: booking._id }
      });
    }

    // Mark as paid (idempotent + atomic on a single document)
    const updateResult = await Booking.updateOne(
      { _id: booking._id, paymentStatus: { $ne: 'paid' } },
      {
        $set: {
          paymentStatus: 'paid',
          paymentMethod: 'esewa',
          paymentTransactionId: transaction_code || transaction_uuid,
          paymentDate: new Date(),
          paymentDetails: paymentData,
        }
      }
    );

    if (!updateResult.modifiedCount) {
      const latest = await Booking.findById(booking._id)
        .select('paymentStatus paymentTransactionId');
      if (latest?.paymentStatus === 'paid') {
        return res.status(200).json({
          success: true,
          message: 'Payment already verified',
          data: {
            bookingId: booking._id,
            paymentStatus: 'paid',
            transactionId: latest.paymentTransactionId || transaction_code || transaction_uuid,
            amount: total_amount,
          }
        });
      }
      return res.status(409).json({
        success: false,
        message: 'Payment state changed. Please refresh and try again.'
      });
    }

    // Respond immediately
    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        bookingId: booking._id,
        paymentStatus: 'paid',
        transactionId: transaction_code || transaction_uuid,
        amount: total_amount,
      }
    });

    // Fire-and-forget: email + notification in background
    (async () => {
      try {
        const [tourist, guide] = await Promise.all([
          User.findById(booking.tourist).lean(),
          User.findById(booking.guide).lean(),
        ]);

        if (tourist && guide) {
          const emailPromise = sendEmail(
            tourist.email,
            'Payment Invoice - Yatra Nepal',
            paymentInvoiceTemplate(booking, tourist, guide)
          ).then(() => {
            Booking.updateOne({ _id: booking._id }, { $set: { invoiceSent: true } }).exec();
          }).catch(err => console.error('Failed to send invoice email:', err.message));

          const notifPromise = createAndEmit(
            guide._id.toString(),
            'payment_received',
            'Payment Received',
            `${tourist.name} has paid Rs. ${booking.totalPrice.toLocaleString()} via eSewa`,
            { bookingId: booking._id }
          ).catch(err => console.error('Notification error (payment):', err.message));

          await Promise.all([emailPromise, notifPromise]);
        }
      } catch (bgErr) {
        console.error('Background payment tasks error:', bgErr.message);
      }
    })();

  } catch (error) {
    console.error('Payment verification error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify payment', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Payment verification failed'
    });
  }
};

// @desc    Select cash payment (Tourist marks as pay-by-cash)
// @route   POST /api/payments/cash
// @access  Private (Tourist)
exports.selectCashPayment = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId)
      .populate('guide', 'name email')
      .populate('tourist', 'name email');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.tourist._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: 'Booking must be confirmed before payment' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Already paid' });
    }

    booking.paymentMethod = 'cash';
    booking.paymentStatus = 'pending';
    await booking.save();

    try {
      await createAndEmit(
        booking.guide._id.toString(),
        'payment_received',
        'Cash Payment Selected',
        `${req.user.name} selected cash payment for Rs. ${booking.totalPrice.toLocaleString()}. Collect payment and confirm.`,
        { bookingId: booking._id }
      );
    } catch (notifErr) {
      console.error('Notification error (cash payment):', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Cash payment selected. Please pay the guide directly.',
      data: { bookingId: booking._id, paymentMethod: 'cash', amount: booking.totalPrice }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Confirm cash payment received (Guide confirms)
// @route   POST /api/payments/confirm-cash
// @access  Private (Guide)
exports.confirmCashPayment = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId)
      .populate('tourist', 'name email');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.guide.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Already marked as paid' });
    }

    if (booking.status !== 'confirmed' || booking.paymentMethod !== 'cash') {
      return res.status(400).json({
        success: false,
        message: 'Cash must be selected for a confirmed booking before it can be marked as paid'
      });
    }

    booking.paymentStatus = 'paid';
    booking.paymentMethod = 'cash';
    booking.paymentDate = new Date();
    booking.paymentTransactionId = `CASH-${Date.now()}`;
    await booking.save();

    try {
      await createCommissionForBooking(booking);
    } catch (commErr) {
      console.error('Commission creation error (cash confirmation, non-fatal):', commErr.message);
    }

    try {
      await createAndEmit(
        booking.tourist._id.toString(),
        'payment_received',
        'Payment Confirmed',
        `${req.user.name} confirmed receiving your cash payment of Rs. ${booking.totalPrice.toLocaleString()}`,
        { bookingId: booking._id }
      );
    } catch (notifErr) {
      console.error('Notification error (confirm cash):', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Cash payment confirmed',
      data: { bookingId: booking._id, paymentStatus: 'paid' }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get payment status for a booking
// @route   GET /api/payments/:bookingId/status
// @access  Private
exports.getPaymentStatus = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .select('paymentStatus paymentMethod paymentTransactionId paymentDate totalPrice tourist guide');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // SECURITY: Ensure only booking tourist, booking guide, or admin can access payment status
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (booking.tourist.toString() !== userId && 
        booking.guide.toString() !== userId && 
        userRole !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to view payment status for this booking' 
      });
    }

    res.status(200).json({
      success: true,
      data: {
        paymentStatus: booking.paymentStatus,
        paymentMethod: booking.paymentMethod,
        transactionId: booking.paymentTransactionId,
        paymentDate: booking.paymentDate,
        amount: booking.totalPrice
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
