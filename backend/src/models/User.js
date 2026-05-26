const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false
  },
  role: {
    type: String,
    enum: ['tourist', 'guide', 'admin'],
    default: 'tourist'
  },
  avatar: {
    type: String,
    default: ''
  },
  verified: {
    type: Boolean,
    default: false
  },
  
  // Tourist-specific fields
  country: String,
  emergencyContact: {
    name: String,
    phone: String
  },
  preferences: {
    categories: [String],
    budget: {
      type: String,
      enum: ['Budget', 'Mid-range', 'Luxury']
    },
    fitness: {
      type: String,
      enum: ['Low', 'Medium', 'High']
    },
    travelStyle: {
      type: String,
      enum: ['Solo', 'Group', 'Family']
    },
    duration: String
  },
  stats: {
    placesVisited: { type: Number, default: 0 },
    pinsCreated: { type: Number, default: 0 },
    upcomingTrips: { type: Number, default: 0 }
  },
  
  // Guide-specific fields
  location: String,
  memberSince: String,
  totalTrips: { type: Number, default: 0 },
  experience: String,
  successRate: { type: Number, default: 0 },
  responseTime: String,
  languages: [{
    code: String,
    name: String
  }],
  specializations: [String],
  certifications: [String],
  bio: String,
  pricePerDay: Number,
  available: { type: Boolean, default: true },
  suspended: { type: Boolean, default: false },
  offerings: [String],
  licenseNumber: String,
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  // Per-guide commission override (null = use platform default from PlatformSettings)
  commissionRate: { type: Number, min: 0, max: 1, default: null },
  
  // Phone verification fields
  phone: {
    type: String,
    unique: true,
    sparse: true
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  phoneVerificationCode: String,
  phoneVerificationExpire: Date,
  
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
