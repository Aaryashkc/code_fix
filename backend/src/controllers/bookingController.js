const Booking = require('../models/Booking');
const User = require('../models/User');
const Commission = require('../models/Commission');
const PlatformSettings = require('../models/PlatformSettings');
const mongoose = require('mongoose');
const { createAndEmit } = require('../utils/notificationService');
const { calculateCommission, resolveCommissionRate } = require('../utils/commissionUtils');

const BOOKING_EXPIRY_MINUTES = 30;

// @desc    Create booking request (InDrive style - tourist proposes price)
// @route   POST /api/bookings
// @access  Private (Tourist)
exports.createBooking = async (req, res) => {
  try {
    const {
      guideId,
      destinations,
      startDate,
      endDate,
      packageType,
      addOns,
      groupSize,
      specialRequirements,
      offeredPrice,
      message
    } = req.body;

    // Validate and calculate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format' });
    }
    if (start < today) {
      return res.status(400).json({ success: false, message: 'Start date cannot be in the past' });
    }
    if (end < start) {
      return res.status(400).json({ success: false, message: 'End date must be on or after start date' });
    }

    const numberOfDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Validate guide exists
    const guide = await User.findById(guideId);
    if (!guide || guide.role !== 'guide') {
      return res.status(404).json({
        success: false,
        message: 'Guide not found'
      });
    }

    if (!guide.verified || guide.suspended || !guide.available) {
      return res.status(400).json({
        success: false,
        message: 'This guide is not accepting bookings right now'
      });
    }

    if (!offeredPrice || offeredPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid offer price'
      });
    }

    if (specialRequirements && specialRequirements.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Special requirements must be 1000 characters or less'
      });
    }

    // Set expiry time (30 minutes from now)
    const expiresAt = new Date(Date.now() + BOOKING_EXPIRY_MINUTES * 60 * 1000);

    // Create booking with negotiation
    const booking = await Booking.create({
      tourist: req.user.id,
      guide: guideId,
      destinations,
      startDate,
      endDate,
      numberOfDays,
      packageType,
      addOns: addOns || [],
      groupSize,
      specialRequirements,
      offeredPrice,
      totalPrice: offeredPrice,
      expiresAt,
      negotiationHistory: [{
        price: offeredPrice,
        by: 'tourist',
        message: message || `I'd like to offer Rs. ${offeredPrice.toLocaleString()} for ${numberOfDays} days`,
        at: new Date()
      }]
    });

    // Populate guide and tourist details
    await booking.populate('guide', 'name email avatar pricePerDay');
    await booking.populate('tourist', 'name email avatar country');

    // Notify guide of new booking request
    await createAndEmit(
      guideId,
      'booking_request',
      'New Booking Request!',
      `${req.user.name} wants to hire you for ${numberOfDays} days at Rs. ${offeredPrice.toLocaleString()}`,
      { bookingId: booking._id, offeredPrice, guideRate: guide.pricePerDay * numberOfDays }
    );

    res.status(201).json({
      success: true,
      message: 'Booking request sent! Waiting for guide response.',
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Counter offer (Guide proposes different price)
// @route   PUT /api/bookings/:id/counter-offer
// @access  Private (Guide)
exports.counterOffer = async (req, res) => {
  try {
    const { price, message } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.guide.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!['pending', 'negotiating'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Cannot negotiate on this booking' });
    }

    // SECURITY: Enforce booking expiry — expired bookings cannot be negotiated
    if (booking.expiresAt && booking.expiresAt < new Date()) {
      booking.status = 'expired';
      booking.expiresAt = undefined;
      await booking.save();
      return res.status(400).json({ success: false, message: 'This booking has expired. Please create a new request.' });
    }

    // SECURITY: Number.isFinite rejects NaN, Infinity, -Infinity, and string coercions
    // that would bypass a simple <= 0 check and corrupt the database.
    const safePrice = Number(price);
    if (!Number.isFinite(safePrice) || safePrice <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid counter price' });
    }

    // Cap negotiation history to prevent document bloat from offer spam
    const MAX_NEGOTIATION_ROUNDS = 20;
    if (booking.negotiationHistory.length >= MAX_NEGOTIATION_ROUNDS) {
      return res.status(400).json({
        success: false,
        message: `Maximum negotiation rounds (${MAX_NEGOTIATION_ROUNDS}) reached. Please accept or decline.`
      });
    }

    booking.status = 'negotiating';
    booking.counterPrice = safePrice;
    booking.negotiationHistory.push({
      price: safePrice,
      by: 'guide',
      message: message || `I'd like to counter with Rs. ${safePrice.toLocaleString()}`,
      at: new Date()
    });
    // Extend expiry on counter-offer
    booking.expiresAt = new Date(Date.now() + BOOKING_EXPIRY_MINUTES * 60 * 1000);
    await booking.save();

    await booking.populate('guide', 'name email avatar');
    await booking.populate('tourist', 'name email avatar country');

    // Notify tourist
    try {
      await createAndEmit(
        booking.tourist._id.toString(),
        'booking_counter',
        'Counter Offer Received!',
        `${req.user.name} has counter-offered Rs. ${safePrice.toLocaleString()}`,
        { bookingId: booking._id, counterPrice: safePrice }
      );
    } catch (notifErr) {
      console.error('Notification error (counter offer):', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Counter offer sent',
      data: booking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Tourist revises offer during negotiation
// @route   PUT /api/bookings/:id/revise-offer
// @access  Private (Tourist)
exports.reviseOffer = async (req, res) => {
  try {
    const { price, message } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.tourist.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!['pending', 'negotiating'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Cannot negotiate on this booking' });
    }

    // SECURITY: Enforce booking expiry
    if (booking.expiresAt && booking.expiresAt < new Date()) {
      booking.status = 'expired';
      booking.expiresAt = undefined;
      await booking.save();
      return res.status(400).json({ success: false, message: 'This booking has expired. Please create a new request.' });
    }

    // Cap negotiation history to prevent document bloat from offer spam
    const MAX_NEGOTIATION_ROUNDS = 20;
    if (booking.negotiationHistory.length >= MAX_NEGOTIATION_ROUNDS) {
      return res.status(400).json({
        success: false,
        message: `Maximum negotiation rounds (${MAX_NEGOTIATION_ROUNDS}) reached. Please accept or decline.`
      });
    }

    // SECURITY: validate price type before writing to DB
    const safeRevisePrice = Number(price);
    if (!Number.isFinite(safeRevisePrice) || safeRevisePrice <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid offer price' });
    }

    booking.offeredPrice = safeRevisePrice;
    booking.negotiationHistory.push({
      price: safeRevisePrice,
      by: 'tourist',
      message: message || `Revised offer: Rs. ${safeRevisePrice.toLocaleString()}`,
      at: new Date()
    });
    booking.expiresAt = new Date(Date.now() + BOOKING_EXPIRY_MINUTES * 60 * 1000);
    await booking.save();


    await booking.populate('guide', 'name email avatar');
    await booking.populate('tourist', 'name email avatar country');

    // Notify guide
    try {
      await createAndEmit(
        booking.guide._id.toString(),
        'booking_revised',
        'Revised Offer!',
        `${req.user.name} revised their offer to Rs. ${safeRevisePrice.toLocaleString()}`,
        { bookingId: booking._id, offeredPrice: safeRevisePrice }
      );
    } catch (notifErr) {
      console.error('Notification error (revised offer):', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Offer revised',
      data: booking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Accept current price (either party)
// @route   PUT /api/bookings/:id/accept-price
// @access  Private (Tourist or Guide)
exports.acceptPrice = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const isGuide = booking.guide.toString() === req.user.id;
    const isTourist = booking.tourist.toString() === req.user.id;

    if (!isGuide && !isTourist) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!['pending', 'negotiating'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Cannot accept this booking' });
    }

    // SECURITY: Enforce booking expiry — cannot accept an expired booking
    if (booking.expiresAt && booking.expiresAt < new Date()) {
      booking.status = 'expired';
      await booking.save();
      return res.status(400).json({ success: false, message: 'This booking has expired. Please create a new request.' });
    }

    // Determine agreed price (last offered/counter price)
    const lastEntry = booking.negotiationHistory[booking.negotiationHistory.length - 1];
    const agreedPrice = lastEntry ? lastEntry.price : booking.offeredPrice;

    booking.agreedPrice = agreedPrice;
    booking.totalPrice = agreedPrice;
    booking.status = 'confirmed';
    booking.respondedAt = Date.now();
    booking.expiresAt = undefined;
    await booking.save();

    await booking.populate('guide', 'name email avatar');
    await booking.populate('tourist', 'name email avatar country');

    // Notify the other party
    const targetId = isGuide ? booking.tourist._id.toString() : booking.guide._id.toString();
    await createAndEmit(
      targetId,
      'booking_accepted',
      'Price Accepted!',
      `Booking confirmed at Rs. ${agreedPrice.toLocaleString()}. Proceed with payment.`,
      { bookingId: booking._id, agreedPrice }
    );

    res.status(200).json({
      success: true,
      message: `Booking confirmed at Rs. ${agreedPrice.toLocaleString()}`,
      data: booking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get my bookings (Tourist)
// @route   GET /api/bookings/my-bookings
// @access  Private (Tourist)
exports.getMyBookings = async (req, res) => {
  try {
    await Booking.expireStaleBookings();
    const bookings = await Booking.find({ tourist: req.user.id })
      .populate('guide', 'name email avatar rating pricePerDay')
      .populate('destinations', 'name images location')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get booking requests (Guide)
// @route   GET /api/bookings/my-requests
// @access  Private (Guide)
exports.getMyRequests = async (req, res) => {
  try {
    await Booking.expireStaleBookings();
    const bookings = await Booking.find({ guide: req.user.id })
      .populate('tourist', 'name email avatar country')
      .populate('destinations', 'name images location')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('guide', 'name email avatar rating pricePerDay')
      .populate('tourist', 'name email avatar country')
      .populate('destinations', 'name images location');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    if (
      booking.tourist._id.toString() !== req.user.id &&
      booking.guide._id.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this booking'
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Accept booking (Guide) - direct accept without counter
// @route   PUT /api/bookings/:id/accept
// @access  Private (Guide)
exports.acceptBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.guide.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!['pending', 'negotiating'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Booking already responded to' });
    }

    booking.status = 'confirmed';
    booking.agreedPrice = booking.offeredPrice;
    booking.totalPrice = booking.offeredPrice;
    booking.respondedAt = Date.now();
    booking.expiresAt = undefined;
    await booking.save();

    await createAndEmit(
      booking.tourist.toString(),
      'booking_accepted',
      'Booking Confirmed!',
      `${req.user.name} accepted your offer of Rs. ${booking.offeredPrice.toLocaleString()}`,
      { bookingId: booking._id, agreedPrice: booking.offeredPrice }
    );

    res.status(200).json({
      success: true,
      message: 'Booking accepted successfully',
      data: booking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Decline booking (Guide)
// @route   PUT /api/bookings/:id/decline
// @access  Private (Guide)
exports.declineBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.guide.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!['pending', 'negotiating'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Booking already responded to' });
    }

    booking.status = 'declined';
    booking.respondedAt = Date.now();
    booking.expiresAt = undefined;
    await booking.save();

    await createAndEmit(
      booking.tourist.toString(),
      'booking_declined',
      'Booking Declined',
      `${req.user.name} has declined your booking request`,
      { bookingId: booking._id }
    );

    res.status(200).json({
      success: true,
      message: 'Booking declined',
      data: booking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Cancel booking (Tourist)
// @route   PUT /api/bookings/:id/cancel
// @access  Private (Tourist)
exports.cancelBooking = async (req, res) => {
  try {
    const { cancellationReason } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.tourist.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // M-6: Block all terminal statuses with a clear 400 (not a confusing 500 from state-machine rejection)
    if (['completed', 'cancelled', 'declined', 'expired'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a booking with status '${booking.status}'`
      });
    }

    // H-3: Block cancellation after the trip has already started
    if (booking.status === 'confirmed' && new Date(booking.startDate) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a booking after the trip has already started'
      });
    }

    booking.status = 'cancelled';
    booking.cancellationReason = cancellationReason;
    booking.expiresAt = undefined;

    // If the tourist already paid via eSewa, flag it for a manual refund.
    // Cash bookings: no money was collected by the platform, nothing to refund.
    if (booking.paymentStatus === 'paid' && booking.paymentMethod === 'esewa') {
      booking.paymentStatus = 'refunded'; // marks refund as initiated — admin processes manually
    }

    await booking.save();

    // Notify guide of cancellation
    await createAndEmit(
      booking.guide.toString(),
      'booking_cancelled',
      'Booking Cancelled',
      `Tourist has cancelled the booking. Reason: ${cancellationReason || 'No reason provided'}`,
      { bookingId: booking._id }
    );

    res.status(200).json({
      success: true,
      message: booking.paymentStatus === 'refunded'
        ? 'Booking cancelled. A refund will be processed to your eSewa account within 3–5 business days.'
        : 'Booking cancelled successfully',
      data: booking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Complete booking
// @route   PUT /api/bookings/:id/complete
// @access  Private (Guide)
exports.completeBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.guide.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // SECURITY: Prevent completing a booking where cash payment hasn't been confirmed yet.
    // A guide who selected cash but hasn't called confirm-cash cannot use this to bypass payment.
    const isEsewaPaid  = booking.paymentStatus === 'paid' && booking.paymentMethod === 'esewa';
    const isCashPaid   = booking.paymentStatus === 'paid' && booking.paymentMethod === 'cash';
    const isCashPending = booking.paymentMethod === 'cash' && booking.paymentStatus !== 'paid';

    if (!isEsewaPaid && !isCashPaid) {
      const msg = isCashPending
        ? 'Cash payment has not been confirmed yet. Please confirm cash receipt first.'
        : 'Cannot complete an unpaid booking';
      return res.status(400).json({ success: false, message: msg });
    }

    booking.status = 'completed';
    booking.completedAt = Date.now();
    await booking.save();

    await User.findByIdAndUpdate(req.user.id, { $inc: { totalTrips: 1 } });

    // Auto-create commission record on completion
    try {
      const existingCommission = await Commission.findOne({ booking: booking._id });
      if (!existingCommission) {
        const settings = await PlatformSettings.getSettings();
        const guide = await User.findById(booking.guide).select('commissionRate');
        const rate = resolveCommissionRate(guide?.commissionRate, settings.defaultCommissionRate);
        const { commissionAmount, guideEarning } = calculateCommission(booking.totalPrice, rate);
        await Commission.create({
          booking: booking._id,
          guide: booking.guide,
          bookingAmount: booking.totalPrice,
          commissionRate: rate,
          commissionAmount,
          guideEarning
        });
      }
    } catch (commErr) {
      console.error('Commission creation error (non-fatal):', commErr.message);
    }

    await createAndEmit(
      booking.tourist.toString(),
      'booking_completed',
      'Trip Completed',
      `Your trip with ${req.user.name} has been marked as completed. Leave a review!`,
      { bookingId: booking._id }
    );

    res.status(200).json({
      success: true,
      message: 'Booking marked as completed',
      data: booking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Respond to booking (accept/reject) - for guide dashboard
// @route   PATCH /api/bookings/:id/respond
// @access  Private (Guide)
exports.respondToBooking = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['confirmed', 'declined'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid status (confirmed or declined)'
      });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.guide.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!['pending', 'negotiating'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Booking already responded to' });
    }

    booking.status = status;
    booking.respondedAt = Date.now();
    booking.expiresAt = undefined;
    if (status === 'confirmed') {
      booking.agreedPrice = booking.counterPrice || booking.offeredPrice;
      booking.totalPrice = booking.agreedPrice;
    }
    await booking.save();

    const notifType = status === 'confirmed' ? 'booking_accepted' : 'booking_declined';
    const notifTitle = status === 'confirmed' ? 'Booking Confirmed!' : 'Booking Declined';
    const notifMsg = status === 'confirmed'
      ? `${req.user.name} has accepted your booking. Please proceed with payment.`
      : `${req.user.name} has declined your booking request`;

    await createAndEmit(
      booking.tourist.toString(),
      notifType,
      notifTitle,
      notifMsg,
      { bookingId: booking._id }
    );

    res.status(200).json({
      success: true,
      message: `Booking ${status} successfully`,
      data: booking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get guide dashboard stats
// @route   GET /api/bookings/guide/stats
// @access  Private (Guide)
exports.getGuideStats = async (req, res) => {
  try {
    const guideObjectId = new mongoose.Types.ObjectId(req.user.id);
    const totalBookings = await Booking.countDocuments({ guide: req.user.id });
    const pendingBookings = await Booking.countDocuments({ guide: req.user.id, status: { $in: ['pending', 'negotiating'] } });
    const completedBookings = await Booking.countDocuments({ guide: req.user.id, status: 'completed' });

    // H-4: Sum guideEarning from Commission (net after platform fee), not totalPrice from Booking (gross)
    const earningsResult = await Commission.aggregate([
      { $match: { guide: guideObjectId } },
      { $group: { _id: null, totalEarnings: { $sum: '$guideEarning' } } }
    ]);

    const totalEarnings = earningsResult.length > 0 ? earningsResult[0].totalEarnings : 0;

    const recentBookings = await Booking.find({ guide: req.user.id })
      .populate('tourist', 'name email')
      .populate('destinations', 'name')
      .sort('-createdAt')
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        totalBookings,
        pendingBookings,
        completedBookings,
        totalEarnings,
        recentBookings
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get booking stats (for admin)
// @route   GET /api/bookings/stats
// @access  Private (Admin)
exports.getBookingStats = async (req, res) => {
  try {
    const total = await Booking.countDocuments();
    const pending = await Booking.countDocuments({ status: 'pending' });
    const negotiating = await Booking.countDocuments({ status: 'negotiating' });
    const confirmed = await Booking.countDocuments({ status: 'confirmed' });
    const completed = await Booking.countDocuments({ status: 'completed' });
    const cancelled = await Booking.countDocuments({ status: 'cancelled' });

    const revenueResult = await Booking.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, revenue: { $sum: '$totalPrice' } } }
    ]);

    const revenue = revenueResult.length > 0 ? revenueResult[0].revenue : 0;

    res.status(200).json({
      success: true,
      data: { total, pending, negotiating, confirmed, completed, cancelled, revenue }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get all bookings (for admin)
// @route   GET /api/bookings
// @access  Private (Admin)
exports.getAllBookings = async (req, res) => {
  try {
    // Pagination
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip  = (page - 1) * limit;

    const total = await Booking.countDocuments();
    const bookings = await Booking.find()
      .populate('tourist', 'name email')
      .populate('guide',   'name email')
      .populate('destinations', 'name')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: bookings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
