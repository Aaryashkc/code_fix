const Commission = require('../models/Commission');
const PlatformSettings = require('../models/PlatformSettings');
const User = require('../models/User');
const { ensureCommissionsForCompletedBookings, ensureCommissionsForGuide } = require('../utils/commissionBackfill');

function mergeGuideCommissionStats(perGuideStats, guides) {
  const statsByGuideId = new Map(
    perGuideStats.map((entry) => [entry._id.toString(), entry])
  );

  return guides.map((guide) => {
    const guideId = guide._id.toString();
    const existing = statsByGuideId.get(guideId);

    if (existing) {
      return existing;
    }

    return {
      _id: guide._id,
      totalCommission: 0,
      totalEarnings: 0,
      totalBookings: 0,
      avgRate: guide.commissionRate ?? null,
      pendingAmount: 0,
      guide,
    };
  }).sort((left, right) => {
    if (right.totalCommission !== left.totalCommission) {
      return right.totalCommission - left.totalCommission;
    }
    return (left.guide?.name || '').localeCompare(right.guide?.name || '');
  });
}

// @desc    Get commission dashboard (admin overview)
// @route   GET /api/commissions/dashboard
// @access  Private (Admin)
exports.getCommissionDashboard = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    await ensureCommissionsForCompletedBookings();

    const matchStage = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const [summary, perGuideStats, guides] = await Promise.all([
      Commission.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalCommission: { $sum: '$commissionAmount' },
            totalGuideEarnings: { $sum: '$guideEarning' },
            totalBookingAmount: { $sum: '$bookingAmount' },
            count: { $sum: 1 },
            avgRate: { $avg: '$commissionRate' }
          }
        }
      ]),
      Commission.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$guide',
            totalCommission: { $sum: '$commissionAmount' },
            totalEarnings: { $sum: '$guideEarning' },
            totalBookings: { $sum: 1 },
            avgRate: { $avg: '$commissionRate' },
            pendingAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'pending'] }, '$guideEarning', 0]
              }
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'guide',
            pipeline: [
              { $project: { name: 1, email: 1, avatar: 1, commissionRate: 1 } }
            ]
          }
        },
        { $unwind: '$guide' },
        { $sort: { totalCommission: -1 } }
      ]),
      User.find({ role: 'guide' })
        .select('name email avatar commissionRate')
        .sort({ name: 1 })
        .lean()
    ]);

    const totals = summary[0] || {
      totalCommission: 0,
      totalGuideEarnings: 0,
      totalBookingAmount: 0,
      count: 0,
      avgRate: 0
    };

    res.status(200).json({
      success: true,
      data: {
        totals: {
          platformCommission: totals.totalCommission,
          guideEarnings: totals.totalGuideEarnings,
          totalBookingVolume: totals.totalBookingAmount,
          commissionCount: totals.count,
          averageRate: Math.round((totals.avgRate || 0) * 10000) / 100 // percent
        },
        perGuide: mergeGuideCommissionStats(perGuideStats, guides)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get guide's own commissions
// @route   GET /api/commissions/my
// @access  Private (Guide)
exports.getMyCommissions = async (req, res) => {
  try {
    await ensureCommissionsForGuide(req.user.id);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [commissions, total] = await Promise.all([
      Commission.find({ guide: req.user.id })
        .populate('booking', 'startDate endDate totalPrice status completedAt')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit),
      Commission.countDocuments({ guide: req.user.id })
    ]);

    res.status(200).json({
      success: true,
      count: commissions.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: commissions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Set per-guide commission rate override
// @route   PUT /api/commissions/guide/:id/rate
// @access  Private (Admin)
exports.setGuideCommissionRate = async (req, res) => {
  try {
    const { rate } = req.body;

    // rate === null means "clear override, use platform default"
    if (rate !== null) {
      const safeRate = Number(rate);
      if (!Number.isFinite(safeRate) || safeRate < 0 || safeRate > 1) {
        return res.status(400).json({
          success: false,
          message: 'Rate must be a number between 0 and 1 (e.g., 0.15 for 15%), or null to clear'
        });
      }
    }

    const guide = await User.findOne({ _id: req.params.id, role: 'guide' });
    if (!guide) {
      return res.status(404).json({ success: false, message: 'Guide not found' });
    }

    guide.commissionRate = rate === null ? null : Number(rate);
    await guide.save();

    res.status(200).json({
      success: true,
      message: rate === null
        ? 'Guide commission rate reset to platform default'
        : `Guide commission rate set to ${(Number(rate) * 100).toFixed(1)}%`,
      data: { guideId: guide._id, commissionRate: guide.commissionRate }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get global commission rate
// @route   GET /api/commissions/global-rate
// @access  Private (Admin)
exports.getGlobalCommissionRate = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    res.status(200).json({
      success: true,
      data: {
        defaultCommissionRate: settings.defaultCommissionRate,
        snackBufferDistanceKm: settings.snackBufferDistanceKm
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Update global commission rate
// @route   PUT /api/commissions/global-rate
// @access  Private (Admin)
exports.setGlobalCommissionRate = async (req, res) => {
  try {
    const { defaultCommissionRate, snackBufferDistanceKm } = req.body;

    const settings = await PlatformSettings.getSettings();

    if (defaultCommissionRate !== undefined) {
      const safeRate = Number(defaultCommissionRate);
      if (!Number.isFinite(safeRate) || safeRate < 0 || safeRate > 1) {
        return res.status(400).json({
          success: false,
          message: 'Commission rate must be between 0 and 1'
        });
      }
      settings.defaultCommissionRate = safeRate;
    }

    if (snackBufferDistanceKm !== undefined) {
      const safeDist = Number(snackBufferDistanceKm);
      if (!Number.isFinite(safeDist) || safeDist < 0.5 || safeDist > 50) {
        return res.status(400).json({
          success: false,
          message: 'Snack buffer distance must be between 0.5 and 50 km'
        });
      }
      settings.snackBufferDistanceKm = safeDist;
    }

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Platform settings updated',
      data: settings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
