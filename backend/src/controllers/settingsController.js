const PlatformSettings = require('../models/PlatformSettings');

// @desc    Get all platform settings
// @route   GET /api/settings
// @access  Private (Admin)
exports.getSettings = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Update platform settings
// @route   PUT /api/settings
// @access  Private (Admin)
exports.updateSettings = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    
    // List of allowed keys to update
    const allowedKeys = [
      'defaultCommissionRate',
      'snackBufferDistanceKm',
      'siteName',
      'siteEmail',
      'timezone',
      'currency',
      'maintenanceMode',
      'allowRegistration',
      'emailVerification',
      'paymentGateway',
      'maxBookingDays',
      'autoConfirmBookings'
    ];

    allowedKeys.forEach(key => {
      if (req.body[key] !== undefined) {
        settings[key] = req.body[key];
      }
    });

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Platform settings updated successfully',
      data: settings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
