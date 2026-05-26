const Wishlist = require('../models/Wishlist');

// @desc    Get my wishlist
// @route   GET /api/wishlist
// @access  Private
exports.getWishlist = async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user.id })
      .populate('destinations', 'name images location rating priceRange');

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user.id, destinations: [] });
    }

    res.status(200).json({
      success: true,
      data: wishlist
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Add destination to wishlist
// @route   POST /api/wishlist/:destinationId
// @access  Private
exports.addToWishlist = async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user.id });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: req.user.id,
        destinations: [req.params.destinationId]
      });
    } else {
      // Check if already in wishlist
      if (wishlist.destinations.includes(req.params.destinationId)) {
        return res.status(400).json({
          success: false,
          message: 'Destination already in wishlist'
        });
      }

      wishlist.destinations.push(req.params.destinationId);
      await wishlist.save();
    }

    await wishlist.populate('destinations', 'name images location rating');

    res.status(200).json({
      success: true,
      message: 'Added to wishlist',
      data: wishlist
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Remove destination from wishlist
// @route   DELETE /api/wishlist/:destinationId
// @access  Private
exports.removeFromWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.id });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
      });
    }

    wishlist.destinations = wishlist.destinations.filter(
      dest => dest.toString() !== req.params.destinationId
    );

    await wishlist.save();
    await wishlist.populate('destinations', 'name images location rating');

    res.status(200).json({
      success: true,
      message: 'Removed from wishlist',
      data: wishlist
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
