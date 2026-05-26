const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    unique: true // One commission per booking
  },
  guide: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bookingAmount: {
    type: Number,
    required: true,
    min: 0
  },
  commissionRate: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  commissionAmount: {
    type: Number,
    required: true,
    min: 0
  },
  guideEarning: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'paid_out'],
    default: 'pending'
  },
  payout: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payout',
    default: null
  }
}, {
  timestamps: true
});

// Indexes for dashboard aggregations and guide lookups
commissionSchema.index({ guide: 1, status: 1 });
commissionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Commission', commissionSchema);
