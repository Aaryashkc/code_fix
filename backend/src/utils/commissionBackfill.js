const Booking = require('../models/Booking');
const Commission = require('../models/Commission');
const PlatformSettings = require('../models/PlatformSettings');
const User = require('../models/User');
const { calculateCommission, resolveCommissionRate } = require('./commissionUtils');
const { commissionEligibleBookingFilter } = require('./commissionLedger');

async function ensureCommissionsForGuide(guideId) {
  const completedBookings = await Booking.find(
    commissionEligibleBookingFilter({ guide: guideId })
  ).select('_id guide totalPrice');

  if (completedBookings.length === 0) {
    return;
  }

  const existingCommissions = await Commission.find({
    booking: { $in: completedBookings.map((booking) => booking._id) }
  }).select('booking');

  const existingBookingIds = new Set(
    existingCommissions.map((commission) => commission.booking.toString())
  );

  const missingBookings = completedBookings.filter(
    (booking) => !existingBookingIds.has(booking._id.toString())
  );

  if (missingBookings.length === 0) {
    return;
  }

  const settings = await PlatformSettings.getSettings();
  const guide = await User.findById(guideId).select('commissionRate');
  const rate = resolveCommissionRate(guide?.commissionRate, settings.defaultCommissionRate);

  for (const booking of missingBookings) {
    const { commissionAmount, guideEarning } = calculateCommission(booking.totalPrice, rate);
    try {
      await Commission.create({
        booking: booking._id,
        guide: booking.guide,
        bookingAmount: booking.totalPrice,
        commissionRate: rate,
        commissionAmount,
        guideEarning
      });
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }
    }
  }
}

async function ensureCommissionsForCompletedBookings(filter = {}) {
  const completedBookings = await Booking.find(
    commissionEligibleBookingFilter(filter)
  ).select('_id guide totalPrice');

  if (completedBookings.length === 0) {
    return;
  }

  const existingCommissions = await Commission.find({
    booking: { $in: completedBookings.map((booking) => booking._id) }
  }).select('booking');

  const existingBookingIds = new Set(
    existingCommissions.map((commission) => commission.booking.toString())
  );

  const missingBookings = completedBookings.filter(
    (booking) => !existingBookingIds.has(booking._id.toString())
  );

  if (missingBookings.length === 0) {
    return;
  }

  const settings = await PlatformSettings.getSettings();
  const guideIds = [...new Set(missingBookings.map((booking) => booking.guide.toString()))];
  const guides = await User.find({ _id: { $in: guideIds } }).select('commissionRate').lean();
  const rateByGuideId = new Map(
    guides.map((guide) => [
      guide._id.toString(),
      resolveCommissionRate(guide.commissionRate, settings.defaultCommissionRate)
    ])
  );

  for (const booking of missingBookings) {
    const rate = rateByGuideId.get(booking.guide.toString()) || settings.defaultCommissionRate;
    const { commissionAmount, guideEarning } = calculateCommission(booking.totalPrice, rate);
    try {
      await Commission.create({
        booking: booking._id,
        guide: booking.guide,
        bookingAmount: booking.totalPrice,
        commissionRate: rate,
        commissionAmount,
        guideEarning
      });
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }
    }
  }
}

module.exports = {
  ensureCommissionsForGuide,
  ensureCommissionsForCompletedBookings,
};
