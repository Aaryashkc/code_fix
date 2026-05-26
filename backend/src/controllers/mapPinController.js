const MapPin = require('../models/MapPin');
const User = require('../models/User');

// @desc    Create map pin
// @route   POST /api/map-pins
// @access  Private (Tourist)
exports.createPin = async (req, res) => {
  try {
    const {
      title, category, description, latitude, longitude,
      rating, photos, dateVisited, tags, visibility
    } = req.body;

    // Validate coordinates (Nepal bounding box)
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (isNaN(lat) || isNaN(lng) || lat < 26.3 || lat > 30.5 || lng < 79.9 || lng > 88.3) {
      return res.status(400).json({
        success: false,
        message: 'Coordinates must be within Nepal (lat 26.3–30.5, lng 79.9–88.3)'
      });
    }

    if (!title || !category || rating === undefined || rating === null) {
      return res.status(400).json({
        success: false,
        message: 'Title, category, rating, latitude and longitude are required'
      });
    }

    // SECURITY: Use explicit field list — never spread req.body directly
    const pinData = {
      title,
      category,
      description,
      location: {
        type: 'Point',
        coordinates: [lng, lat]
      },
      rating,
      photos: photos || [],
      visitDate: dateVisited || req.body.visitDate,
      tags: tags || [],
      visibility: visibility || 'private',
      user: req.user.id
    };

    const pin = await MapPin.create(pinData);

    // Update user stats
    await User.findByIdAndUpdate(req.user.id, { $inc: { 'stats.pinsCreated': 1 } });

    res.status(201).json({
      success: true,
      message: 'Pin created successfully',
      data: pin
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get my pins
// @route   GET /api/map-pins/my-pins
// @access  Private
exports.getMyPins = async (req, res) => {
  try {
    const pins = await MapPin.find({ user: req.user.id })
      .sort('-createdAt')
      .populate('user', 'name avatar');

    res.status(200).json({
      success: true,
      count: pins.length,
      data: pins
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get public pins
// @route   GET /api/map-pins/public
// @access  Public
exports.getPublicPins = async (req, res) => {
  try {
    const { category, limit = 50 } = req.query;
    
    let query = { visibility: 'public' };
    if (category) query.category = category;

    const pins = await MapPin.find(query)
      .limit(Number(limit))
      .sort('-createdAt')
      .populate('user', 'name avatar country');

    res.status(200).json({
      success: true,
      count: pins.length,
      data: pins
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get nearby pins
// @route   GET /api/map-pins/nearby
// @access  Public
exports.getNearbyPins = async (req, res) => {
  try {
    const { lng, lat, maxDistance = 10000 } = req.query;

    if (!lng || !lat) {
      return res.status(400).json({
        success: false,
        message: 'Please provide longitude and latitude'
      });
    }

    const pins = await MapPin.find({
      visibility: 'public',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [Number(lng), Number(lat)]
          },
          $maxDistance: Number(maxDistance)
        }
      }
    }).populate('user', 'name avatar');

    res.status(200).json({
      success: true,
      count: pins.length,
      data: pins
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get single pin
// @route   GET /api/map-pins/:id
// @access  Public
exports.getPin = async (req, res) => {
  try {
    const pin = await MapPin.findById(req.params.id)
      .populate('user', 'name avatar country')
      .populate('comments.user', 'name avatar');

    if (!pin) {
      return res.status(404).json({
        success: false,
        message: 'Pin not found'
      });
    }

    // Private pins are accessible only through authenticated "my pins" flow.
    if (pin.visibility === 'private') {
      return res.status(404).json({
        success: false,
        message: 'Pin not found'
      });
    }

    res.status(200).json({
      success: true,
      data: pin
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update pin
// @route   PUT /api/map-pins/:id
// @access  Private
exports.updatePin = async (req, res) => {
  try {
    let pin = await MapPin.findById(req.params.id);

    if (!pin) {
      return res.status(404).json({
        success: false,
        message: 'Pin not found'
      });
    }

    // Check ownership
    if (pin.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this pin'
      });
    }

    // SECURITY: allowlist updatable fields — never pass raw req.body to DB update
    const ALLOWED_FIELDS = ['title', 'category', 'description', 'rating', 'photos', 'tags', 'visibility'];
    const updates = {};
    for (const key of ALLOWED_FIELDS) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    // Optional visit date alias support from client payload
    if (req.body.dateVisited !== undefined) {
      updates.visitDate = req.body.dateVisited;
    }

    // Optional coordinate update
    const hasLat = req.body.latitude !== undefined;
    const hasLng = req.body.longitude !== undefined;
    if (hasLat || hasLng) {
      const lat = Number(hasLat ? req.body.latitude : pin.location.coordinates[1]);
      const lng = Number(hasLng ? req.body.longitude : pin.location.coordinates[0]);
      if (isNaN(lat) || isNaN(lng) || lat < 26.3 || lat > 30.5 || lng < 79.9 || lng > 88.3) {
        return res.status(400).json({
          success: false,
          message: 'Coordinates must be within Nepal (lat 26.3–30.5, lng 79.9–88.3)'
        });
      }
      updates.location = {
        type: 'Point',
        coordinates: [lng, lat]
      };
    }

    pin = await MapPin.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Pin updated successfully',
      data: pin
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete pin
// @route   DELETE /api/map-pins/:id
// @access  Private
exports.deletePin = async (req, res) => {
  try {
    const pin = await MapPin.findById(req.params.id);

    if (!pin) {
      return res.status(404).json({
        success: false,
        message: 'Pin not found'
      });
    }

    // Check ownership
    if (pin.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this pin'
      });
    }

    await pin.deleteOne();

    // Update user stats
    await User.findByIdAndUpdate(req.user.id, { $inc: { 'stats.pinsCreated': -1 } });

    res.status(200).json({
      success: true,
      message: 'Pin deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Add comment to pin
// @route   POST /api/map-pins/:id/comments
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !String(text).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required'
      });
    }

    const pin = await MapPin.findById(req.params.id);

    if (!pin) {
      return res.status(404).json({
        success: false,
        message: 'Pin not found'
      });
    }

    pin.comments.push({
      user: req.user.id,
      text
    });

    await pin.save();

    res.status(200).json({
      success: true,
      message: 'Comment added successfully',
      data: pin
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
