const mongoose = require('mongoose');

const mapPinSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: 500
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      index: '2dsphere'
    }
  },
  category: {
    type: String,
    enum: ['Religious', 'Nature', 'Adventure', 'Cultural', 'Urban'],
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  photos: [String],
  visitDate: {
    type: Date,
    default: Date.now
  },
  visibility: {
    type: String,
    enum: ['private', 'public'],
    default: 'private'
  },
  tags: [String],
  likes: {
    type: Number,
    default: 0
  },
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Create geospatial index
mapPinSchema.index({ location: '2dsphere' });
mapPinSchema.index({ user: 1, visibility: 1 });

// Client-friendly coordinate virtuals
mapPinSchema.virtual('latitude').get(function getLatitude() {
  return this.location?.coordinates?.[1];
});

mapPinSchema.virtual('longitude').get(function getLongitude() {
  return this.location?.coordinates?.[0];
});

mapPinSchema.set('toJSON', { virtuals: true });
mapPinSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('MapPin', mapPinSchema);
