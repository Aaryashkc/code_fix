const mongoose = require('mongoose');

const liveTripEventSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['trip_joined', 'trip_left', 'location_update', 'sos_triggered'],
    required: true,
    index: true,
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  actorRole: {
    type: String,
    enum: ['tourist', 'guide', 'admin'],
  },
  message: String,
  location: {
    lat: Number,
    lng: Number,
    accuracy: Number,
    heading: Number,
    speed: Number,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

liveTripEventSchema.index({ booking: 1, createdAt: -1 });
liveTripEventSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('LiveTripEvent', liveTripEventSchema);
