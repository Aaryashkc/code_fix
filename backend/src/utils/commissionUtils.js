/**
 * Pure commission calculation functions.
 * Kept free of Mongoose dependencies so they can be unit-tested in isolation.
 */

/**
 * Calculate commission breakdown for a booking.
 *
 * @param {number} bookingAmount - The total booking price
 * @param {number} commissionRate - Decimal rate (e.g., 0.15 for 15%)
 * @returns {{ commissionAmount: number, guideEarning: number }}
 */
function calculateCommission(bookingAmount, commissionRate) {
  if (!Number.isFinite(bookingAmount) || bookingAmount < 0) {
    throw new Error('bookingAmount must be a non-negative finite number');
  }
  if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 1) {
    throw new Error('commissionRate must be between 0 and 1');
  }

  const commissionAmount = Math.round(bookingAmount * commissionRate * 100) / 100;
  const guideEarning = Math.round((bookingAmount - commissionAmount) * 100) / 100;

  return { commissionAmount, guideEarning };
}

/**
 * Resolve the effective commission rate for a guide.
 * Uses per-guide override if set, otherwise falls back to platform default.
 *
 * @param {number|null|undefined} guideRate - Per-guide override (nullable)
 * @param {number} defaultRate - Platform default rate
 * @returns {number}
 */
function resolveCommissionRate(guideRate, defaultRate = 0.15) {
  if (guideRate !== null && guideRate !== undefined && Number.isFinite(guideRate)) {
    return guideRate;
  }
  return defaultRate;
}

module.exports = { calculateCommission, resolveCommissionRate };
