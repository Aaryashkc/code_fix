const Destination = require('../models/Destination');
const { uploadToCloudinary, deleteFromCloudinary } = require('../middleware/upload');

const PUBLIC_DESTINATION_FILTER = {
  published: true,
  verificationStatus: 'approved'
};
const MAX_DESTINATION_IMAGES = 10;

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

function getDestinationMedia(destination) {
  if (destination.media && destination.media.length > 0) {
    return destination.media.map((asset) => ({
      _id: asset._id,
      publicId: asset.publicId,
      url: asset.url
    }));
  }

  return (destination.images || []).map((url) => ({ url }));
}

function setDestinationMedia(destination, media) {
  destination.media = media;
  destination.images = media.map((asset) => asset.url);
}

async function cleanupCloudinaryMedia(media) {
  await Promise.all(media.filter((asset) => asset.publicId).map((asset) => deleteFromCloudinary(asset.publicId)));
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

// @desc    Get all destinations for administration
// @route   GET /api/destinations/admin
// @access  Private (Admin)
exports.getAdminDestinations = async (req, res) => {
  try {
    const { verificationStatus, region, search, sort = '-createdAt', page, limit } = req.query;
    const query = {};

    if (verificationStatus && ['pending', 'approved', 'rejected'].includes(verificationStatus)) {
      query.verificationStatus = verificationStatus;
    }
    if (region && ['Eastern', 'Central', 'Western', 'Far-Western'].includes(region)) {
      query.region = region;
    }

    if (search) {
      query.$text = { $search: search.slice(0, 100) };
    }

    const shouldPaginate = page !== undefined || limit !== undefined;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    let destinationQuery = Destination.find(query)
      .populate('addedBy', 'name email')
      .sort(sort);

    if (shouldPaginate) {
      destinationQuery = destinationQuery.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const [destinations, total] = await Promise.all([
      destinationQuery.lean(),
      Destination.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: destinations.length,
      total,
      page: shouldPaginate ? pageNum : 1,
      pages: shouldPaginate ? Math.ceil(total / limitNum) : 1,
      data: destinations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin destinations',
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
      ...CONTENT_FIELDS.filter((field) => field !== 'images'),
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

// @desc    Upload destination photos
// @route   POST /api/destinations/:id/media
// @access  Private (Admin or submitting guide while pending)
exports.uploadDestinationMedia = async (req, res) => {
  const uploadedMedia = [];

  try {
    const destination = await Destination.findById(req.params.id);

    if (!destination) {
      return res.status(404).json({ success: false, message: 'Destination not found' });
    }

    if (
      req.user.role === 'guide' &&
      (
        destination.addedBy?.toString() !== req.user.id ||
        destination.verificationStatus !== 'pending'
      )
    ) {
      return res.status(403).json({
        success: false,
        message: 'Guides can only upload photos to their own pending places'
      });
    }

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ success: false, message: 'Please upload at least one image' });
    }

    const currentMedia = getDestinationMedia(destination);
    if (currentMedia.length + files.length > MAX_DESTINATION_IMAGES) {
      return res.status(400).json({
        success: false,
        message: `A destination can have at most ${MAX_DESTINATION_IMAGES} images`
      });
    }

    for (const file of files) {
      const uploadResult = await uploadToCloudinary(file.buffer, `yatra/destinations/${destination._id}`);
      uploadedMedia.push({
        publicId: uploadResult.public_id,
        url: uploadResult.secure_url
      });
    }

    setDestinationMedia(destination, [...currentMedia, ...uploadedMedia]);
    await destination.save();

    return res.status(201).json({
      success: true,
      message: 'Destination photos uploaded successfully',
      data: destination
    });
  } catch (error) {
    await cleanupCloudinaryMedia(uploadedMedia);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload destination photos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Reorder photos, select the first image as cover, or remove photos
// @route   PUT /api/destinations/:id/media
// @access  Private (Admin)
exports.updateDestinationMedia = async (req, res) => {
  try {
    if (!Array.isArray(req.body.media) || req.body.media.length > MAX_DESTINATION_IMAGES) {
      return res.status(400).json({
        success: false,
        message: `Media must be an array with at most ${MAX_DESTINATION_IMAGES} images`
      });
    }

    const destination = await Destination.findById(req.params.id);
    if (!destination) {
      return res.status(404).json({ success: false, message: 'Destination not found' });
    }

    const currentMedia = getDestinationMedia(destination);
    const usedKeys = new Set();
    const nextMedia = req.body.media.map((asset) => {
      const match = currentMedia.find((current) => (
        asset.publicId ? current.publicId === asset.publicId : !current.publicId && current.url === asset.url
      ));
      const key = match && (match.publicId || match.url);

      if (!match || usedKeys.has(key)) {
        return null;
      }

      usedKeys.add(key);
      return match;
    });

    if (nextMedia.some((asset) => !asset)) {
      return res.status(400).json({ success: false, message: 'Media list includes an invalid image' });
    }

    const removedMedia = currentMedia.filter((asset) => !usedKeys.has(asset.publicId || asset.url));
    setDestinationMedia(destination, nextMedia);
    await destination.save();
    await cleanupCloudinaryMedia(removedMedia);

    return res.status(200).json({
      success: true,
      message: 'Destination gallery updated successfully',
      data: destination
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update destination gallery',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Replace one uploaded destination photo
// @route   POST /api/destinations/:id/media/:index/replace
// @access  Private (Admin)
exports.replaceDestinationMedia = async (req, res) => {
  let uploadedMedia;

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image' });
    }

    const destination = await Destination.findById(req.params.id);
    if (!destination) {
      return res.status(404).json({ success: false, message: 'Destination not found' });
    }

    const currentMedia = getDestinationMedia(destination);
    const replacementIndex = Number(req.params.index);
    if (!Number.isInteger(replacementIndex) || replacementIndex < 0 || replacementIndex >= currentMedia.length) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }

    const result = await uploadToCloudinary(req.file.buffer, `yatra/destinations/${destination._id}`);
    uploadedMedia = { publicId: result.public_id, url: result.secure_url };
    const replacedMedia = currentMedia[replacementIndex];
    currentMedia[replacementIndex] = uploadedMedia;
    setDestinationMedia(destination, currentMedia);
    await destination.save();
    await cleanupCloudinaryMedia([replacedMedia]);

    return res.status(200).json({
      success: true,
      message: 'Destination photo replaced successfully',
      data: destination
    });
  } catch (error) {
    if (uploadedMedia) await cleanupCloudinaryMedia([uploadedMedia]);
    return res.status(500).json({
      success: false,
      message: 'Failed to replace destination photo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Remove one uploaded destination photo
// @route   DELETE /api/destinations/:id/media/:index
// @access  Private (Admin)
exports.deleteDestinationMedia = async (req, res) => {
  try {
    const destination = await Destination.findById(req.params.id);
    if (!destination) {
      return res.status(404).json({ success: false, message: 'Destination not found' });
    }

    const currentMedia = getDestinationMedia(destination);
    const removedIndex = Number(req.params.index);
    if (!Number.isInteger(removedIndex) || removedIndex < 0 || removedIndex >= currentMedia.length) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }

    const removedMedia = currentMedia[removedIndex];
    setDestinationMedia(destination, currentMedia.filter((_asset, index) => index !== removedIndex));
    await destination.save();
    await cleanupCloudinaryMedia([removedMedia]);

    return res.status(200).json({
      success: true,
      message: 'Destination photo removed successfully',
      data: destination
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to remove destination photo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    await cleanupCloudinaryMedia(destination.media || []);

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
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 8));
    const filter = { addedBy: req.user.id };
    const [destinations, total] = await Promise.all([
      Destination.find(filter)
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(limit),
      Destination.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      count: destinations.length,
      total,
      page,
      pages: Math.ceil(total / limit),
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
    const [
      total,
      pending,
      approved,
      rejected,
      byCategoryStats,
      byRegionStats,
      pendingByRegionStats
    ] = await Promise.all([
      Destination.countDocuments(),
      Destination.countDocuments({ verificationStatus: 'pending' }),
      Destination.countDocuments({ verificationStatus: 'approved' }),
      Destination.countDocuments({ verificationStatus: 'rejected' }),
      Destination.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      Destination.aggregate([{ $group: { _id: '$region', count: { $sum: 1 } } }]),
      Destination.aggregate([
        { $match: { verificationStatus: 'pending' } },
        { $group: { _id: '$region', count: { $sum: 1 } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        pending,
        approved,
        rejected,
        byCategory: byCategoryStats,
        byRegion: byRegionStats,
        pendingByRegion: pendingByRegionStats
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
