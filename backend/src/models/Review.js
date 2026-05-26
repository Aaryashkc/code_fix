const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviewee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  destination: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Destination'
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  categoryRatings: {
    professionalism: { type: Number, min: 1, max: 5 },
    communication: { type: Number, min: 1, max: 5 },
    knowledge: { type: Number, min: 1, max: 5 },
    value: { type: Number, min: 1, max: 5 }
  },
  comment: {
    type: String,
    required: true
  },
  photos: [String],
  helpful: {
    type: Number,
    default: 0
  },
  helpfulVoters: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  response: {
    text: String,
    createdAt: Date
  },
  verified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Unique index for guide reviews (one per booking)
reviewSchema.index({ reviewer: 1, booking: 1 }, { unique: true, partialFilterExpression: { booking: { $exists: true } } });
// Unique index for destination reviews (one per user per destination)
reviewSchema.index({ reviewer: 1, destination: 1 }, { unique: true, partialFilterExpression: { destination: { $exists: true } } });
reviewSchema.index({ reviewee: 1, rating: -1 });
reviewSchema.index({ destination: 1, rating: -1 });

module.exports = mongoose.model('Review', reviewSchema);
