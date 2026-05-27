const mongoose = require('mongoose');

const destinationMediaSchema = new mongoose.Schema({
  publicId: {
    type: String,
    trim: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  }
}, {
  _id: true
});

const destinationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  category: {
    type: String,
    enum: ['Religious', 'Nature', 'Adventure', 'Cultural', 'Urban'],
    required: true
  },
  region: {
    type: String,
    enum: ['Eastern', 'Central', 'Western', 'Far-Western'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  shortDescription: {
    type: String,
    required: true
  },
  images: [String],
  media: [destinationMediaSchema],
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  priceRange: {
    type: String,
    enum: ['Rs', 'Rs Rs', 'Rs Rs Rs'],
    required: true
  },
  bestSeason: String,
  duration: String,
  difficulty: {
    type: String,
    enum: ['Easy', 'Moderate', 'Challenging', 'Expert']
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      index: '2dsphere'
    },
    address: String
  },
  features: [String],
  nearbyAttractions: [String],
  published: {
    type: Boolean,
    default: false
  },
  // New fields for guide submissions
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectionReason: String
}, {
  timestamps: true
});

// Create indexes
destinationSchema.index({ location: '2dsphere' });
destinationSchema.index({ category: 1 });
destinationSchema.index({ rating: -1 });
// M-3: Text index enables $text search instead of $regex full-collection scans
destinationSchema.index({ name: 'text', description: 'text', shortDescription: 'text' });

module.exports = mongoose.model('Destination', destinationSchema);
