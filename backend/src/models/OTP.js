const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  otp: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  purpose: {
    type: String,
    enum: ['login', 'registration', 'password_reset'],
    default: 'login'
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  expiresAt: {
    type: Date,
    required: true
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  verified: {
    type: Boolean,
    default: false
  },
  ipAddress: String,
  userAgent: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// TTL index to automatically remove expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for efficient lookups
otpSchema.index({ email: 1, purpose: 1, isUsed: 1 });
otpSchema.index({ phone: 1, purpose: 1, isUsed: 1 });

// Validate that at least one of email or phone is provided
otpSchema.pre('validate', async function () {
  if (!this.email && !this.phone) {
    throw new Error('Either email or phone is required');
  }
});

module.exports = mongoose.model('OTP', otpSchema);
