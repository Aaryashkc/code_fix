const { generateOTP, hashOTP, verifyOTP: verifyOTPHash } = require('../utils/otp');
const OTPModel = require('../models/OTP');
const { sendEmail } = require('../utils/email');

// @desc    Send OTP for registration
// @route   POST /api/auth/send-registration-otp
// @access  Public
exports.sendRegistrationOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address'
      });
    }
    
    // Check if user already exists
    const User = require('../models/User');
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }
    
    // Check rate limit: prevent OTP spam (max 1 per 2 minutes)
    const recentOTP = await OTPModel.findOne({
      email,
      purpose: 'registration',
      isUsed: false,
      createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) }
    });
    if (recentOTP) {
      return res.status(429).json({
        success: false,
        message: 'Please wait 2 minutes before requesting a new code'
      });
    }

    // Delete any existing unused registration OTPs for this email
    await OTPModel.deleteMany({ email, purpose: 'registration', isUsed: false });

    // Generate and hash OTP
    const otp = generateOTP();
    const hashedOtp = hashOTP(otp);

    // Store OTP in database
    await OTPModel.create({
      email,
      otp: hashedOtp,
      purpose: 'registration',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Send OTP email
    try {
      const emailResult = await sendEmail({
        to: email,
        subject: 'Yatra Nepal - Email Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #0D7C66; margin-bottom: 20px;">Yatra Nepal - Verify Your Email</h2>
            <p style="margin-bottom: 20px;">Thank you for signing up! Please use the verification code below to complete your registration:</p>
            <div style="background-color: #f0f9f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <h1 style="color: #0D7C66; margin: 0; font-size: 36px; letter-spacing: 5px;">${otp}</h1>
            </div>
            <p style="color: #666; font-size: 14px;">This code is valid for 10 minutes.</p>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">If you didn't request this, please ignore this email.</p>
          </div>
        `
      });

      if (emailResult?.consoleFallback) {
        throw new Error('Email not configured - falling back to console');
      }

      res.status(200).json({
        success: true,
        message: 'Verification code sent successfully'
      });
    } catch (emailError) {
      console.error('Registration OTP email delivery failed:', emailError.message);

      if (process.env.NODE_ENV !== 'production') {
        return res.status(200).json({
          success: true,
          message: 'Verification code generated, but email delivery failed in non-production mode.',
          emailDeliveryFailed: true,
          devOtp: otp,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to send verification code'
      });
    }
  } catch (error) {
    console.error('sendRegistrationOTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Verify OTP for registration
// @route   POST /api/auth/verify-registration-otp
// @access  Public
exports.verifyRegistrationOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and verification code'
      });
    }
    
    // Find active OTP record in database
    const otpRecord = await OTPModel.findOne({
      email,
      purpose: 'registration',
      isUsed: false,
      expiresAt: { $gt: new Date() }
    }).sort('-createdAt');

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'No verification code found or code expired. Please request a new code.'
      });
    }

    // Check max attempts
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      await OTPModel.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new code.'
      });
    }

    // Verify OTP hash
    if (!verifyOTPHash(otp, otpRecord.otp)) {
      await OTPModel.updateOne({ _id: otpRecord._id }, { $inc: { attempts: 1 } });
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    // Mark as verified but not used (will be used during registration)
    await OTPModel.updateOne({ _id: otpRecord._id }, { 
      isUsed: true, 
      verified: true,
      verifiedAt: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now complete your registration.'
    });
  } catch (error) {
    console.error('verifyRegistrationOTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
