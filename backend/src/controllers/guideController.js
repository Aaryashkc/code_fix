const User = require('../models/User');
const Booking = require('../models/Booking');

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// @desc    Get all guides
// @route   GET /api/guides
// @access  Public
exports.getGuides = async (req, res) => {
  try {
    const {
      specialization,
      language,
      minPrice,
      maxPrice,
      available,
      minRating,
      search,
      sort = '-rating',
      page = '1',
      limit = '20'
    } = req.query;

    // Build query
    // Public guide directory should only expose active, bookable guides
    let query = {
      role: 'guide',
      verified: true,
      suspended: false
    };

    if (specialization) {
      query.specializations = new RegExp(`^${escapeRegex(specialization)}$`, 'i');
    }
    if (language) {
      query['languages.name'] = new RegExp(`^${escapeRegex(language)}$`, 'i');
    }
    if (minPrice || maxPrice) {
      query.pricePerDay = {};
      if (minPrice) query.pricePerDay.$gte = Number(minPrice);
      if (maxPrice) query.pricePerDay.$lte = Number(maxPrice);
    }
    if (available !== undefined) query.available = available === 'true';
    if (minRating) query.rating = { $gte: Number(minRating) };
    if (search) {
      const searchExpression = new RegExp(escapeRegex(search.slice(0, 100)), 'i');
      query.$or = [
        { name: searchExpression },
        { bio: searchExpression },
        { location: searchExpression },
        { specializations: searchExpression }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [guides, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: guides.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: guides
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get single guide
// @route   GET /api/guides/:id
// @access  Public
exports.getGuide = async (req, res) => {
  try {
    const guide = await User.findOne({
      _id: req.params.id,
      role: 'guide',
      verified: true,
      suspended: false
    })
      .select('-password');

    if (!guide) {
      return res.status(404).json({
        success: false,
        message: 'Guide not found'
      });
    }

    res.status(200).json({
      success: true,
      data: guide
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update guide availability
// @route   PUT /api/guides/me/availability
// @access  Private (Guide)
exports.updateAvailability = async (req, res) => {
  try {
    const { available } = req.body;

    const guide = await User.findByIdAndUpdate(
      req.user.id,
      { available },
      { new: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Availability updated successfully',
      data: guide
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get guide's recent booking history (public, privacy-safe)
// @route   GET /api/guides/:id/booking-history
// @access  Public
exports.getGuideBookingHistory = async (req, res) => {
  try {
    const guideId = req.params.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 5));
    const skip = (page - 1) * limit;

    // Verify guide exists and is public-facing
    const guide = await User.findOne({
      _id: guideId,
      role: 'guide',
      verified: true,
      suspended: false
    }).select('_id');

    if (!guide) {
      return res.status(404).json({ success: false, message: 'Guide not found' });
    }

    const [bookings, total] = await Promise.all([
      Booking.find({
        guide: guideId,
        status: 'completed'
      })
        .populate({
          path: 'destinations',
          match: { published: true, verificationStatus: 'approved' },
          select: 'name category'
        })
        .populate('tourist', 'country')   // Privacy: only country, never name/email
        .select('destinations startDate endDate numberOfDays review.rating completedAt')
        .sort('-completedAt')
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments({ guide: guideId, status: 'completed' })
    ]);

    // Transform for privacy: extract only safe fields
    const history = bookings.map(b => ({
      id: b._id,
      route: (b.destinations || []).map(d => d.name).join(' → '),
      destinations: (b.destinations || []).map(d => ({
        name: d.name,
        category: d.category
      })),
      date: b.completedAt || b.endDate,
      startDate: b.startDate,
      endDate: b.endDate,
      durationDays: b.numberOfDays,
      rating: b.review?.rating || null,
      customerFrom: b.tourist?.country || 'Nepal'
    }));

    res.status(200).json({
      success: true,
      count: history.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get list of currently online guide IDs (set by Socket.io)
// @route   GET /api/guides/online
// @access  Public
exports.getOnlineGuides = async (req, res) => {
  try {
    const onlineGuides = req.app.get('onlineGuides');
    res.status(200).json({
      success: true,
      data: Array.from(onlineGuides || [])
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
