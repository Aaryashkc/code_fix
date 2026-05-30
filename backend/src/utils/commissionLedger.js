const Commission = require('../models/Commission');
const PlatformSettings = require('../models/PlatformSettings');
const User = require('../models/User');
const { calculateCommission, resolveCommissionRate } = require('./commissionUtils');

async function createCommissionForBooking(booking) {
  const existingCommission = await Commission.findOne({ booking: booking._id });
  if (existingCommission) return existingCommission;

  const settings = await PlatformSettings.getSettings();
  const guide = await User.findById(booking.guide).select('commissionRate');
  const rate = resolveCommissionRate(guide?.commissionRate, settings.defaultCommissionRate);
  const { commissionAmount, guideEarning } = calculateCommission(booking.totalPrice, rate);

  try {
    return await Commission.create({
      booking: booking._id,
      guide: booking.guide,
      bookingAmount: booking.totalPrice,
      commissionRate: rate,
      commissionAmount,
      guideEarning
    });
  } catch (error) {
    if (error.code === 11000) {
      return Commission.findOne({ booking: booking._id });
    }
    throw error;
  }
}

function commissionEligibleBookingFilter(filter = {}) {
  return {
    ...filter,
    paymentStatus: 'paid',
    $or: [
      { status: 'completed' },
      { status: 'confirmed', paymentMethod: 'cash' }
    ]
  };
}

module.exports = {
  createCommissionForBooking,
  commissionEligibleBookingFilter,
};
