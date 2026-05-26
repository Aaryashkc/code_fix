const mongoose = require('mongoose');
const Review = require('../models/Review');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Destination = require('../models/Destination');
const { createAndEmit } = require('../utils/notificationService');

// @desc    Create review
// @route   POST /api/reviews
// @access  Private
exports.createReview = async (req, res) => {
  try {
    const { bookingId, rating, categoryRatings, comment, photos } = req.body;

    // Verify booking exists and is completed
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only review completed bookings'
      });
    }

    // H-6/C-3: Only tourists may review (guide → tourist direction disabled to prevent retaliation)
    if (booking.tourist.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the tourist can leave a review for this booking'
      });
    }

    // Tourist always reviews the guide
    const revieweeId = booking.guide;

    // Check if already reviewed
    const existingReview = await Review.findOne({
      reviewer: req.user.id,
      booking: bookingId
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this booking'
      });
    }

    // M-2: Validate comment before hitting Mongoose (avoids 500 from ValidationError)
    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Comment is required' });
    }

    // Create review
    const review = await Review.create({
      reviewer: req.user.id,
      reviewee: revieweeId,
      booking: bookingId,
      rating,
      categoryRatings,
      comment,
      photos: photos || [],
      verified: true
    });

    // Update reviewee's rating
    await updateUserRating(revieweeId);

    // Notify reviewee of new review
    await createAndEmit(
      revieweeId,
      'review_received',
      'New Review Received',
      `${req.user.name} left a ${rating}-star review`,
      { bookingId, rating }
    );

    await review.populate('reviewer', 'name avatar country');
    await review.populate('reviewee', 'name avatar');

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: review
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get reviews for a guide
// @route   GET /api/reviews/guide/:guideId
// @access  Public
exports.getGuideReviews = async (req, res) => {
  try {
    // H-5: Paginate — no unbounded fetch
    const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
    const filter = { reviewee: req.params.guideId };

    const total   = await Review.countDocuments(filter);
    const reviews = await Review.find(filter)
      .populate('reviewer', 'name avatar country')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Mark review as helpful
// @route   PUT /api/reviews/:id/helpful
// @access  Private
exports.markHelpful = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    const userId = req.user.id;

    // Prevent self-voting
    if (review.reviewer.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot mark your own review as helpful'
      });
    }

    // M-7: Use a DB-level exists check instead of loading the whole voters array into memory
    const alreadyVoted = await Review.exists({ _id: review._id, helpfulVoters: req.user.id });
    if (alreadyVoted) {
      return res.status(400).json({
        success: false,
        message: 'You have already marked this review as helpful'
      });
    }

    review.helpful += 1;
    review.helpfulVoters.push(userId);
    await review.save();

    res.status(200).json({
      success: true,
      data: { helpful: review.helpful }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};


// @desc    Respond to review (Guide)
// @route   POST /api/reviews/:id/response
// @access  Private (Guide)
exports.respondToReview = async (req, res) => {
  try {
    const { text } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if reviewee is responding
    if (review.reviewee.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the reviewee can respond'
      });
    }

    review.response = {
      text,
      createdAt: Date.now()
    };

    await review.save();

    res.status(200).json({
      success: true,
      message: 'Response added successfully',
      data: review
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// C-1/C-2: Use aggregation — avoids loading the entire review collection into memory,
// and stores rating as a Number (not a string from toFixed)
async function updateUserRating(userId) {
  const agg = await Review.aggregate([
    { $match: { reviewee: new mongoose.Types.ObjectId(userId), rating: { $exists: true, $ne: null } } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  const { avg = 0, count = 0 } = agg[0] || {};
  await User.findByIdAndUpdate(userId, {
    rating: Math.round(avg * 10) / 10,
    reviewCount: count
  });
}

// @desc    Add review to destination
// @route   POST /api/reviews/destination/:destinationId
// @access  Private (Tourist, Guide)
exports.addDestinationReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const { destinationId } = req.params;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid rating (1-5)'
      });
    }

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a comment'
      });
    }

    // Check if destination exists
    const destination = await Destination.findById(destinationId);
    if (!destination) {
      return res.status(404).json({
        success: false,
        message: 'Destination not found'
      });
    }

    // Check if user already reviewed this destination
    const existingReview = await Review.findOne({
      reviewer: req.user.id,
      destination: destinationId
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this destination'
      });
    }

    // Create review
    const review = await Review.create({
      reviewer: req.user.id,
      destination: destinationId,
      rating,
      comment,
      verified: true
    });

    await review.populate('reviewer', 'name avatar');

    // Update destination rating
    await updateDestinationRating(destinationId);

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: review
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get reviews for a destination
// @route   GET /api/reviews/destination/:destinationId
// @access  Public
exports.getDestinationReviews = async (req, res) => {
  try {
    // L-7: Paginate — same pattern as getGuideReviews
    const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
    const filter = { destination: req.params.destinationId };

    const total   = await Review.countDocuments(filter);
    const reviews = await Review.find(filter)
      .populate('reviewer', 'name avatar')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// C-1: Use aggregation for destination rating too — same N+1 issue as updateUserRating
async function updateDestinationRating(destinationId) {
  const agg = await Review.aggregate([
    { $match: { destination: new mongoose.Types.ObjectId(destinationId), rating: { $exists: true, $ne: null } } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  const { avg = 0, count = 0 } = agg[0] || {};
  await Destination.findByIdAndUpdate(destinationId, {
    rating: Math.round(avg * 10) / 10,
    reviewCount: count
  });
}
