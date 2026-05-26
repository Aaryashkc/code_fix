const crypto = require('crypto');

// Generate secure 6-digit OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Hash OTP for secure storage
const hashOTP = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

// Verify OTP against hash
const verifyOTP = (inputOTP, hashedOTP) => {
  const inputHash = crypto.createHash('sha256').update(inputOTP).digest('hex');
  return inputHash === hashedOTP;
};

// Generate unique session token for OTP requests
const generateSessionToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Check if OTP request is allowed (rate limiting)
const isOTPRequestAllowed = async (email, purpose) => {
  const OTP = require('../models/OTP');
  
  // Check if there's an unused OTP sent in the last 2 minutes
  const recentOTP = await OTP.findOne({
    email,
    purpose,
    isUsed: false,
    createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) }
  });
  
  return !recentOTP;
};

// Clean up used OTPs for a user
const cleanupUsedOTPs = async (email) => {
  const OTP = require('../models/OTP');
  await OTP.deleteMany({
    email,
    isUsed: true
  });
};

module.exports = {
  generateOTP,
  hashOTP,
  verifyOTP,
  generateSessionToken,
  isOTPRequestAllowed,
  cleanupUsedOTPs
};
