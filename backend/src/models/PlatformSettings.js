const mongoose = require('mongoose');

const platformSettingsSchema = new mongoose.Schema({
  // Existing revenue split settings
  defaultCommissionRate: {
    type: Number,
    required: true,
    default: 0.15,
    min: 0,
    max: 1
  },
  snackBufferDistanceKm: {
    type: Number,
    required: true,
    default: 5,
    min: 0.5,
    max: 50
  },
  // Site settings
  siteName: {
    type: String,
    required: true,
    default: 'Yatra Nepal'
  },
  siteEmail: {
    type: String,
    required: true,
    default: 'info@yatra.com.np'
  },
  timezone: {
    type: String,
    required: true,
    default: 'Asia/Kathmandu'
  },
  currency: {
    type: String,
    required: true,
    default: 'NPR'
  },
  // Security settings
  maintenanceMode: {
    type: Boolean,
    required: true,
    default: false
  },
  allowRegistration: {
    type: Boolean,
    required: true,
    default: true
  },
  emailVerification: {
    type: Boolean,
    required: true,
    default: true
  },
  // Booking & payment settings
  paymentGateway: {
    type: String,
    required: true,
    default: 'esewa'
  },
  maxBookingDays: {
    type: Number,
    required: true,
    default: 30,
    min: 1
  },
  autoConfirmBookings: {
    type: Boolean,
    required: true,
    default: false
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists (singleton pattern)
platformSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      defaultCommissionRate: Number(process.env.DEFAULT_COMMISSION_RATE) || 0.15,
      snackBufferDistanceKm: Number(process.env.SNACK_BUFFER_DISTANCE_KM) || 5,
      siteName: 'Yatra Nepal',
      siteEmail: 'info@yatra.com.np',
      timezone: 'Asia/Kathmandu',
      currency: 'NPR',
      maintenanceMode: false,
      allowRegistration: true,
      emailVerification: true,
      paymentGateway: 'esewa',
      maxBookingDays: 30,
      autoConfirmBookings: false
    });
  }
  return settings;
};

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
