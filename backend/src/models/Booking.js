const mongoose = require('mongoose');

const negotiationEntrySchema = new mongoose.Schema({
  price: { type: Number, required: true },
  by: { type: String, enum: ['tourist', 'guide'], required: true },
  message: String,
  at: { type: Date, default: Date.now }
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  tourist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  guide: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  destinations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Destination'
  }],
  customDestinations: [{
    name: {
      type: String,
      trim: true,
      maxlength: 120
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number]
      },
      address: String
    }
  }],
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  numberOfDays: {
    type: Number,
    required: true
  },
  packageType: {
    type: String,
    enum: ['Half Day Tour', 'Full Day Adventure', 'Multi-Day Expedition'],
    required: true
  },
  addOns: [String],
  groupSize: {
    type: Number,
    required: true,
    min: 1
  },
  specialRequirements: String,

  // Price negotiation (InDrive style)
  offeredPrice: {
    type: Number,
    required: true
  },
  counterPrice: Number,
  agreedPrice: Number,
  totalPrice: {
    type: Number,
    required: true
  },
  negotiationHistory: [negotiationEntrySchema],

  status: {
    type: String,
    enum: ['pending', 'negotiating', 'confirmed', 'declined', 'completed', 'cancelled', 'expired'],
    default: 'pending'
  },

  // Expiry for pending/negotiating bookings
  expiresAt: Date,

  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['khalti', 'esewa', 'cash'],
  },
  paymentTransactionId: String,
  paymentPidx: String,
  paymentDate: Date,
  paymentDetails: {
    type: mongoose.Schema.Types.Mixed
  },
  invoiceSent: {
    type: Boolean,
    default: false
  },
  respondedAt: Date,
  completedAt: Date,
  completionRequestedBy: {
    type: String,
    enum: ['tourist', 'guide']
  },
  completionRequestedAt: Date,
  touristCompletedAt: Date,
  guideCompletedAt: Date,
  cancellationReason: String,
  // Review from tourist (C-3: kept for backward compat read, but writes go to Review collection)
  review: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: Date
  },
  // L-2: Flag to prevent duplicate pre-trip reminder notifications from the cron job
  reminderSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for faster queries
bookingSchema.index({ tourist: 1, status: 1 });
bookingSchema.index({ guide: 1, status: 1 });
bookingSchema.index({ startDate: 1, endDate: 1 });
bookingSchema.index({ expiresAt: 1, status: 1 });
bookingSchema.index({ paymentPidx: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

// ─── Status State Machine ────────────────────────────────────────────────────
// Defines the only valid status transitions. Terminal states are immutable.
const VALID_TRANSITIONS = {
  pending:     new Set(['negotiating', 'confirmed', 'declined', 'cancelled', 'expired']),
  negotiating: new Set(['confirmed', 'declined', 'cancelled', 'expired']),
  confirmed:   new Set(['completed', 'cancelled']),
  // Terminal states — no further transitions allowed
  completed:   new Set(),
  cancelled:   new Set(),
  declined:    new Set(),
  expired:     new Set(),
};

// Snapshot the persisted status before Mongoose hydrates _doc.
// pre('init') receives the raw DB object, so this is the only reliable
// place to read the old value — by the time pre('save') runs, _doc
// already reflects whatever the caller wrote.
bookingSchema.pre('init', function(data) {
  this._prevStatus = data.status;
});

bookingSchema.pre('save', function(next) {
  // Only validate transitions for existing documents whose status changed.
  if (!this.isNew && this.isModified('status')) {
    const prev = this._prevStatus;
    // _prevStatus is set by pre('init'); if somehow absent, allow the save.
    if (prev && prev !== this.status) {
      const allowed = VALID_TRANSITIONS[prev];
      if (!allowed) {
        return next(new Error(`Unknown source status: ${prev}`));
      }
      if (!allowed.has(this.status)) {
        return next(new Error(`Invalid status transition: ${prev} → ${this.status}`));
      }
    }
  }
  next();
});

// Auto-expire stale bookings (called before key queries, avoids pre-find recursion)
Booking.expireStaleBookings = async function() {
  try {
    const result = await this.updateMany(
      {
        status: { $in: ['pending', 'negotiating'] },
        expiresAt: { $exists: true, $lte: new Date() }
      },
      { $set: { status: 'expired' }, $unset: { expiresAt: 1 } }
    );
    if (result.modifiedCount > 0) {
      console.log(`⏰ Auto-expired ${result.modifiedCount} stale bookings`);
    }
  } catch (err) {
    console.error('Auto-expire bookings error:', err.message);
  }
};

module.exports = Booking;
