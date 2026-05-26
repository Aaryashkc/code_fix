const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  logout,
  getUserStats,
  getAllUsers,
  createGuideByAdmin,
  verifyUser,
  suspendUser,
  adminUpdateUser,
  revokeGuideAccess,
  adminResetPassword,
  requestPasswordReset,
  getPasswordResetRequests,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  requestOTP,
  verifyOTP,
  sendPhoneOTP,
  verifyPhoneOTP
} = require('../controllers/authController');
const {
  sendRegistrationOTP,
  verifyRegistrationOTP
} = require('../controllers/registration-otp');
const { protect, authorize } = require('../middleware/auth');
const { validateRegistration, validateLogin, validateOTPRequest, validateOTPVerify, handleValidationErrors } = require('../middleware/validation');

// Public routes
router.post('/register', validateRegistration, handleValidationErrors, register);
router.post('/login', validateLogin, handleValidationErrors, login);
router.post('/request-otp', validateOTPRequest, handleValidationErrors, requestOTP);
router.post('/verify-otp', validateOTPVerify, handleValidationErrors, verifyOTP);
router.post('/send-phone-otp', sendPhoneOTP);
router.post('/verify-phone-otp', verifyPhoneOTP);
router.post('/send-registration-otp', sendRegistrationOTP);
router.post('/verify-registration-otp', verifyRegistrationOTP);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerification);

// Protected routes
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);
router.post('/logout', protect, logout);
router.post('/request-password-reset', protect, requestPasswordReset);

// Admin routes
router.get('/users/stats', protect, authorize('admin'), getUserStats);
router.get('/users', protect, authorize('admin'), getAllUsers);
router.post('/users/create-guide', protect, authorize('admin'), createGuideByAdmin);
router.patch('/users/:id/verify', protect, authorize('admin'), verifyUser);
router.patch('/users/:id/suspend', protect, authorize('admin'), suspendUser);
router.put('/users/:id/admin-update', protect, authorize('admin'), adminUpdateUser);
router.patch('/users/:id/revoke', protect, authorize('admin'), revokeGuideAccess);
router.patch('/users/:id/reset-password', protect, authorize('admin'), adminResetPassword);
router.get('/password-reset-requests', protect, authorize('admin'), getPasswordResetRequests);

module.exports = router;
