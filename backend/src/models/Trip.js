const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  places: [{
    destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination' },
    day: Number,
    order: Number
  }],
  snackStops: [{
    name: { type: String, required: true, trim: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    type: { type: String, enum: ['cafe', 'fast_food', 'restaurant', 'hotel', 'guest_house', 'hostel'] },
    overpassId: Number,
    orderAlongRoute: { type: Number, default: 0 }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Trip', tripSchema);
