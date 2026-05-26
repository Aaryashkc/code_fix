const Destination = require('../models/Destination');

const PUBLIC_DESTINATION_FILTER = {
  published: true,
  verificationStatus: 'approved'
};

const CONTENT_FIELDS = [
  'name',
  'slug',
  'category',
  'region',
  'description',
  'shortDescription',
  'images',
  'priceRange',
  'bestSeason',
  'duration',
  'difficulty',
  'location',
  'features',
  'nearbyAttractions'
];

function pickFields(body, fields) {
  return fields.reduce((result, field) => {
    if (body[field] !== undefined) {
      result[field] = body[field];
    }
    return result;
  }, {});
}

// @desc    Get featured destinations (limited)
// @route   GET /api/destinations?limit=6
// @access  Public
exports.getFeaturedDestinations = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    
    const destinations = await Destination.find(PUBLIC_DESTINATION_FILTER)
      .sort('-rating')
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      count: destinations.length,
      data: destinations
    });
  } catch (_error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all destinations
// @route   GET /api/destinations
// @access  Public
exports.getDestinations = async (req, res) => {
  try {
    const { category, region, difficulty, search, sort = '-rating', limit } = req.query;
    
    // Check if database is connected
    if (!Destination.db || Destination.db.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database temporarily unavailable'
      });
    }
    
    // Build query
    let query = { ...PUBLIC_DESTINATION_FILTER };
    
    if (category) query.category = category;
    if (region) query.region = region;
    if (difficulty) query.difficulty = difficulty;
    if (search) {
      // M-3: Use $text (text index) instead of $regex (full-collection scan)
      // Note: $text is word-boundary aware and case/diacritic insensitive by default.
      query.$text = { $search: search.slice(0, 100) };
    }

    // Build query with limit
    let destinationQuery = Destination.find(query).sort(sort);
    
    // Apply limit if provided
    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        destinationQuery = destinationQuery.limit(limitNum);
      }
    }

    const destinations = await destinationQuery.lean();

    res.status(200).json({
      success: true,
      count: destinations.length,
      data: destinations
    });
  } catch (error) {
    console.error('GetDestinations Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch destinations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get single destination
// @route   GET /api/destinations/:id
// @access  Public
exports.getDestination = async (req, res) => {
  try {
    const destination = await Destination.findOne({
      _id: req.params.id,
      ...PUBLIC_DESTINATION_FILTER
    });

    if (!destination) {
      return res.status(404).json({
        success: false,
        message: 'Destination not found'
      });
    }

    res.status(200).json({
      success: true,
      data: destination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get personalized recommendations
// @route   GET /api/destinations/recommendations
// @access  Private (Tourist)
exports.getRecommendations = async (req, res) => {
  try {
    const user = req.user;
    let query = { ...PUBLIC_DESTINATION_FILTER };

    // Filter by user preferences
    if (user.preferences && user.preferences.categories && user.preferences.categories.length > 0) {
      query.category = { $in: user.preferences.categories };
    }

    // Sort by rating and get top 12
    const recommendations = await Destination.find(query)
      .sort('-rating')
      .limit(12);

    res.status(200).json({
      success: true,
      count: recommendations.length,
      data: recommendations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create destination
// @route   POST /api/destinations
// @access  Private (Admin)
exports.createDestination = async (req, res) => {
  try {
    const destinationData = pickFields(req.body, CONTENT_FIELDS);

    if (req.user.role === 'guide') {
      destinationData.addedBy = req.user.id;
      destinationData.published = false;
      destinationData.verificationStatus = 'pending';
    } else {
      destinationData.published = req.body.published !== undefined ? Boolean(req.body.published) : true;
      destinationData.verificationStatus = req.body.verificationStatus || 'approved';
    }

    const destination = await Destination.create(destinationData);

    res.status(201).json({
      success: true,
      message: 'Destination created successfully',
      data: destination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update destination
// @route   PUT /api/destinations/:id
// @access  Private (Admin)
exports.updateDestination = async (req, res) => {
  try {
    // SECURITY: Only admins can update destinations
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update destinations'
      });
    }

    const destinationData = pickFields(req.body, [
      ...CONTENT_FIELDS,
      'published',
      'verificationStatus',
      'rejectionReason'
    ]);

    const destination = await Destination.findByIdAndUpdate(
      req.params.id,
      destinationData,
      { new: true, runValidators: true }
    );

    if (!destination) {
      return res.status(404).json({
        success: false,
        message: 'Destination not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Destination updated successfully',
      data: destination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete destination
// @route   DELETE /api/destinations/:id
// @access  Private (Admin)
exports.deleteDestination = async (req, res) => {
  try {
    const destination = await Destination.findByIdAndDelete(req.params.id);

    if (!destination) {
      return res.status(404).json({
        success: false,
        message: 'Destination not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Destination deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get nearby destinations (within radius)
// @route   GET /api/destinations/nearby
// @access  Public
exports.getNearbyDestinations = async (req, res) => {
  try {
    const { lat, lng, radius = 50 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Please provide latitude and longitude'
      });
    }

    // Convert radius to meters (MongoDB uses meters for geospatial queries)
    const radiusInMeters = radius * 1000;

    const destinations = await Destination.find({
      ...PUBLIC_DESTINATION_FILTER,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: radiusInMeters
        }
      }
    });

    res.status(200).json({
      success: true,
      count: destinations.length,
      data: destinations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Search destinations
// @route   GET /api/destinations/search
// @access  Public
exports.searchDestinations = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Please provide search query'
      });
    }

    // M-3: Use $text (text index) instead of $regex (full-collection scan).
    // Limit the query length server-side to prevent abuse.
    const searchQuery = q.slice(0, 100);
    const destinations = await Destination.find({
      ...PUBLIC_DESTINATION_FILTER,
      $text: { $search: searchQuery }
    }).limit(20);

    res.status(200).json({
      success: true,
      count: destinations.length,
      data: destinations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Verify/approve destination (for guide submissions)
// @route   PATCH /api/destinations/:id/verify
// @access  Private (Admin)
exports.verifyDestination = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid status (approved or rejected)'
      });
    }

    const updateData = {
      verificationStatus: status,
      published: status === 'approved'
    };

    if (status === 'rejected' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const destination = await Destination.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!destination) {
      return res.status(404).json({
        success: false,
        message: 'Destination not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `Destination ${status} successfully`,
      data: destination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get my submitted places (for guides)
// @route   GET /api/destinations/my-places
// @access  Private (Guide)
exports.getMyPlaces = async (req, res) => {
  try {
    const destinations = await Destination.find({ addedBy: req.user.id });

    res.status(200).json({
      success: true,
      count: destinations.length,
      data: destinations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get destination stats (for admin)
// @route   GET /api/destinations/stats
// @access  Private (Admin)
exports.getDestinationStats = async (req, res) => {
  try {
    const total = await Destination.countDocuments();
    const pending = await Destination.countDocuments({ verificationStatus: 'pending' });
    const approved = await Destination.countDocuments({ verificationStatus: 'approved' });
    const rejected = await Destination.countDocuments({ verificationStatus: 'rejected' });

    const byCategoryStats = await Destination.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const byRegionStats = await Destination.aggregate([
      { $group: { _id: '$region', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        pending,
        approved,
        rejected,
        byCategory: byCategoryStats,
        byRegion: byRegionStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
