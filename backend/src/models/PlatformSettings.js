const mongoose = require('mongoose');

const platformSettingsSchema = new mongoose.Schema({
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
      snackBufferDistanceKm: Number(process.env.SNACK_BUFFER_DISTANCE_KM) || 5
    });
  }
  return settings;
};

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
