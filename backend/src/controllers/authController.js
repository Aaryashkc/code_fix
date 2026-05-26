const crypto = require('crypto');
const User = require('../models/User');
const OTPModel = require('../models/OTP');
const { generateToken } = require('../utils/jwt');
const { generateOTP, hashOTP, verifyOTP: verifyOTPHash } = require('../utils/otp');
const { sendEmail } = require('../utils/email');
const { verificationEmailTemplate, passwordResetTemplate } = require('../utils/emailTemplates');
const { setAuthCookie, clearAuthCookie } = require('../middleware/cookieAuth');
const { createAndEmit } = require('../utils/notificationService');

function disconnectUserSockets(req, userId) {
  const io = req.app.get('io');
  if (io) {
    io.in(`user:${userId}`).disconnectSockets(true);
  }
}

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, ...otherFields } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Check if email was verified with OTP
    const otpRecord = await OTPModel.findOne({
      email,
      purpose: 'registration',
      isUsed: true,
      verified: true,
      expiresAt: { $gt: new Date() }
    });
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Email not verified. Please verify your email with OTP first.'
      });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // SECURITY: Enforce server-side default role for public registration
    // Ignore any role from request body - only admins can assign roles
    const defaultRole = 'tourist';

    // CRITICAL: Remove role from otherFields to prevent override
    const safeOtherFields = { ...otherFields };
    delete safeOtherFields.role;

    // Create user with enforced role. Email is OTP-pre-verified, so set verified:true
    // immediately so the user can login without waiting for the email link.
    const user = await User.create({
      name,
      email,
      password,
      role: defaultRole,        // Server-enforced default role
      verified: true,           // OTP already confirmed ownership of this email
      verificationToken,
      ...safeOtherFields
    });

    // Clean up registration OTP
    await OTPModel.deleteOne({ _id: otpRecord._id });

    // Send verification email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/verify-email/${verificationToken}`;

    try {
      await sendEmail(
        email,
        'Verify your Yatra account',
        verificationEmailTemplate(name, verificationUrl)
      );
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError.message);
    }

    // Generate token with user claims
    const token = generateToken(user._id, user.role, user.email);

    // Set HTTP-only cookie
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email to verify your account.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check for user (include password field)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // SECURITY: Check user account status before allowing login
    if (user.suspended) {
      return res.status(403).json({
        success: false,
        message: 'Account suspended. Please contact support.'
      });
    }

    // Require email verification for every account type.
    if (!user.verified) {
      return res.status(403).json({
        success: false,
        message: 'Email not verified. Please verify your email before logging in.'
      });
    }

    // Generate token with user claims
    const token = generateToken(user._id, user.role, user.email);

    // Set HTTP-only cookie
    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        preferences: user.preferences,
        stats: user.stats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const EXCLUDE_FIELDS = '-verificationToken -resetPasswordToken -resetPasswordExpire -phoneVerificationCode -phoneVerificationExpire';
    const user = await User.findById(req.user.id).select(EXCLUDE_FIELDS);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/me
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    // SECURITY: Use allowlist to prevent mass-assignment of sensitive fields
    const ALLOWED_UPDATE_FIELDS = [
      'name', 'avatar', 'bio', 'country', 'phone',
      'preferences', 'emergencyContact', 'location',
      'experience', 'languages', 'specializations', 'responseTime'
    ];
    const fieldsToUpdate = {};
    for (const key of ALLOWED_UPDATE_FIELDS) {
      if (req.body[key] !== undefined) {
        fieldsToUpdate[key] = req.body[key];
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      fieldsToUpdate,
      { new: true, runValidators: true }
    ).select('-verificationToken -resetPasswordToken -resetPasswordExpire');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    const token = req.cookies?.token;
    
    if (token) {
      const { blacklistToken } = require('../utils/jwt');
      await blacklistToken(token, req.user.id);
    }

    // Clear HTTP-only cookie
    clearAuthCookie(res);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (_error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if user exists
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate cryptographically secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Add timestamp to make tokens unique
    const timestamp = Date.now().toString(36);
    const uniqueToken = `${resetToken}${timestamp}`;
    const hashedUniqueToken = crypto.createHash('sha256').update(uniqueToken).digest('hex');

    user.resetPasswordToken = hashedUniqueToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save({ validateBeforeSave: false });

    // Send email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password/${uniqueToken}`;

    try {
      await sendEmail(
        user.email,
        'Yatra - Password Reset Request',
        passwordResetTemplate(user.name, resetUrl)
      );
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError.message);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'Email could not be sent'
      });
    }

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a password with at least 8 characters'
      });
    }

    // Token from URL includes a timestamp suffix for uniqueness
    const tokenWithTimestamp = req.params.token;
    
    // Hash incoming token to compare against stored hash
    const hashedToken = crypto.createHash('sha256').update(tokenWithTimestamp).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    user.verified = true;
    user.verificationToken = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a verification email has been sent.'
      });
    }

    if (user.verified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    await user.save();

    // Send verification email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    try {
      await sendEmail({
        to: user.email,
        subject: 'Verify Your Email - Yatra Nepal',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background-color: #0D7C66; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">Yatra Nepal</h1>
            </div>
            <div style="background-color: white; padding: 40px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Verify Your Email</h2>
              <p style="color: #666; line-height: 1.6;">Hi ${user.name},</p>
              <p style="color: #666; line-height: 1.6;">Click the button below to verify your email address:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${frontendUrl}/verify-email/${verificationToken}" 
                   style="background-color: #0D7C66; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Verify Email
                </a>
              </div>
              <p style="color: #999; font-size: 14px; line-height: 1.6;">Or copy this link: ${frontendUrl}/verify-email/${verificationToken}</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999; font-size: 12px; line-height: 1.6;">This link expires in 24 hours. If you didn't request this, please ignore this email.</p>
            </div>
          </div>
        `
      });

      res.status(200).json({
        success: true,
        message: 'Verification email sent successfully'
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      res.status(500).json({
        success: false,
        message: 'Failed to send verification email'
      });
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Request OTP for login
// @route   POST /api/auth/request-otp
// @access  Public
exports.requestOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address'
      });
    }
    
    // SECURITY: Use vague message to prevent user enumeration
    // (don't reveal whether the email exists in our system)
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, an OTP has been sent.'
      });
    }
    
    // Check rate limit: prevent OTP spam (max 1 per 2 minutes)
    const recentOTP = await OTPModel.findOne({
      email,
      purpose: 'login',
      isUsed: false,
      createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) }
    });
    if (recentOTP) {
      return res.status(429).json({
        success: false,
        message: 'Please wait 2 minutes before requesting a new OTP'
      });
    }

    // Delete any existing unused login OTPs for this email
    await OTPModel.deleteMany({ email, purpose: 'login', isUsed: false });

    // Generate and hash OTP
    const otp = generateOTP();
    const hashedOtp = hashOTP(otp);

    // Store OTP in database
    await OTPModel.create({
      email,
      otp: hashedOtp,
      userId: user._id,
      purpose: 'login',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Send OTP email
    try {
      const emailResult = await sendEmail({
        to: email,
        subject: 'Your Login OTP - Yatra Nepal',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #0D7C66;">Yatra Nepal Login OTP</h2>
            <p>Hi ${user.name},</p>
            <p>Your login OTP is:</p>
            <div style="background-color: #f0f9f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <h1 style="color: #0D7C66; margin: 0; font-size: 36px; letter-spacing: 5px;">${otp}</h1>
            </div>
            <p style="color: #666;">This code is valid for 10 minutes.</p>
            <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
          </div>
        `
      });

      if (emailResult?.consoleFallback) {
        throw new Error('Email not configured - falling back to console');
      }

      res.status(200).json({
        success: true,
        message: 'OTP sent successfully'
      });
    } catch (emailError) {
      console.error('OTP email delivery failed:', emailError.message);

      // SECURITY: devOtp must ONLY be sent in explicit development mode.
      if (process.env.NODE_ENV === 'development') {
        return res.status(200).json({
          success: true,
          message: 'OTP generated, but email delivery failed in development mode.',
          devOtp: otp,
          // L-8: emailDeliveryFailed removed — field was sent but never read by any frontend component
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to send OTP email'
      });
    }
  } catch (error) {
    console.error('requestOTP error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Verify OTP and login
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and OTP'
      });
    }
    
    // Find active OTP record in database
    const otpRecord = await OTPModel.findOne({
      email,
      purpose: 'login',
      isUsed: false,
      expiresAt: { $gt: new Date() }
    }).sort('-createdAt');

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found or OTP expired. Please request a new code.'
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
        message: 'Invalid OTP'
      });
    }

    // Mark OTP as used
    await OTPModel.updateOne({ _id: otpRecord._id }, { isUsed: true });

    // Get user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // SECURITY: Check user account status before allowing OTP login
    if (user.suspended) {
      return res.status(403).json({
        success: false,
        message: 'Account suspended. Please contact support.'
      });
    }

    // Require email verification for every account type.
    if (!user.verified) {
      return res.status(403).json({
        success: false,
        message: 'Email not verified. Please verify your email before logging in.'
      });
    }

    // Generate token with full claims
    const token = generateToken(user._id, user.role, user.email);
    
    // Set HTTP-only cookie
    setAuthCookie(res, token);
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('verifyOTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user stats (for admin)
// @route   GET /api/auth/users/stats
// @access  Private (Admin)
exports.getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalTourists = await User.countDocuments({ role: 'tourist' });
    const totalGuides = await User.countDocuments({ role: 'guide' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const verifiedUsers = await User.countDocuments({ verified: true });
    const unverifiedUsers = await User.countDocuments({ verified: false });

    res.status(200).json({
      success: true,
      data: {
        total: totalUsers,
        byRole: {
          tourists: totalTourists,
          guides: totalGuides,
          admins: totalAdmins
        },
        verified: verifiedUsers,
        unverified: unverifiedUsers
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// @desc    Get all users (for admin)
// @route   GET /api/auth/users
// @access  Private (Admin)
exports.getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;
    // Pagination support
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = role ? { role } : {};
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// @desc    Create guide account directly by admin
// @route   POST /api/auth/users/create-guide
// @access  Private (Admin)
exports.createGuideByAdmin = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      location,
      bio,
      experience,
      pricePerDay,
      licenseNumber,
      languages,
      specializations
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }

    const userExists = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const guide = await User.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      password,
      role: 'guide',
      verified: true,
      available: true,
      suspended: false,
      phone: phone ? String(phone).trim() : undefined,
      location: location ? String(location).trim() : undefined,
      bio: bio ? String(bio).trim() : undefined,
      experience: experience ? String(experience).trim() : undefined,
      pricePerDay: Number(pricePerDay) || 5000,
      licenseNumber: licenseNumber ? String(licenseNumber).trim() : undefined,
      languages: Array.isArray(languages) ? languages : [],
      specializations: Array.isArray(specializations) ? specializations : [],
      memberSince: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    });

    res.status(201).json({
      success: true,
      message: 'Guide account created successfully',
      user: {
        id: guide._id,
        name: guide.name,
        email: guide.email,
        role: guide.role,
        verified: guide.verified
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// @desc    Verify guide (for admin)
// @route   PATCH /api/auth/users/:id/verify
// @access  Private (Admin)
exports.verifyUser = async (req, res) => {
  try {
    const { verified } = req.body;

    const update = verified
      ? { verified, suspended: false, available: true }
      : { verified };

    const user = await User.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    disconnectUserSockets(req, user._id.toString());

    res.status(200).json({
      success: true,
      message: `User ${verified ? 'verified' : 'unverified'} successfully`,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// @desc    Suspend user (for admin)
// @route   PATCH /api/auth/users/:id/suspend
// @access  Private (Admin)
exports.suspendUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { available: false, verified: false, suspended: true },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    disconnectUserSockets(req, user._id.toString());

    res.status(200).json({
      success: true,
      message: 'User suspended successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// @desc    Send phone verification OTP
// @route   POST /api/auth/send-phone-otp
// @access  Public
exports.sendPhoneOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    
    // H-2: Reject non-digit strings like "AAAAAAAAAA" or "0000000000" with special chars
    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit phone number'
      });
    }
    
    // Check if phone already registered
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already registered'
      });
    }
    
    // Check rate limit: prevent OTP spam (max 1 per 2 minutes)
    const recentOTP = await OTPModel.findOne({
      phone,
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

    // Delete any existing unused phone OTPs
    await OTPModel.deleteMany({ phone, purpose: 'registration', isUsed: false });

    // Generate and hash OTP
    const otp = generateOTP();
    const hashedOtp = hashOTP(otp);

    // Store OTP in database
    await OTPModel.create({
      phone,
      otp: hashedOtp,
      purpose: 'registration',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      ipAddress: req.ip
    });

    // H-1: Guard OTP log — unconditional console.log exposes OTPs in production logs
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PHONE-OTP SIMULATION] OTP for ${phone} is: ${otp}`);
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully to your phone.',
      // SECURITY: devOtp must ONLY be sent in explicit development mode.
      // 'not production' is too broad — it includes staging, test, and undefined.
      ...(process.env.NODE_ENV === 'development' && { devOtp: otp })
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send verification code',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// @desc    Verify phone OTP
// @route   POST /api/auth/verify-phone-otp
// @access  Public
exports.verifyPhoneOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    
    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone number and OTP'
      });
    }
    
    // Find active OTP record in database
    const otpRecord = await OTPModel.findOne({
      phone,
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

    // Mark as used
    await OTPModel.updateOne({ _id: otpRecord._id }, { isUsed: true, verified: true });

    res.status(200).json({
      success: true,
      message: 'Phone number verified successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to verify code',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// @desc    Admin update guide details
// @route   PUT /api/auth/users/:id/admin-update
// @access  Private (Admin)
exports.adminUpdateUser = async (req, res) => {
  try {
    const allowedFields = [
      'name', 'email', 'bio', 'pricePerDay', 'experience',
      'location', 'languages', 'specializations', 'certifications',
      'offerings', 'licenseNumber', 'available', 'verified',
      'phone', 'country', 'role'
    ];

    const updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    disconnectUserSockets(req, user._id.toString());

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// @desc    Revoke guide access (demote to tourist)
// @route   PATCH /api/auth/users/:id/revoke
// @access  Private (Admin)
exports.revokeGuideAccess = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role !== 'guide') {
      return res.status(400).json({
        success: false,
        message: 'User is not a guide'
      });
    }

    user.role = 'tourist';
    user.verified = false;
    user.available = false;
    user.suspended = false;
    await user.save();

    const updatedUser = await User.findById(user._id).select('-password');

    disconnectUserSockets(req, user._id.toString());

    res.status(200).json({
      success: true,
      message: 'Guide access revoked. User demoted to tourist.',
      data: updatedUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// @desc    Admin reset user password
// @route   PATCH /api/auth/users/:id/reset-password
// @access  Private (Admin)
exports.adminResetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }

    const user = await User.findById(req.params.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.password = newPassword;
    await user.save();

    // Notify the user that their password was reset by admin
    await createAndEmit(
      user._id,
      'password_reset_completed',
      'Password Reset',
      'Your password has been reset by an administrator. Please login with your new password.',
      { resetBy: 'admin' }
    );

    res.status(200).json({
      success: true,
      message: `Password reset successfully for ${user.name}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// @desc    Guide/User requests password reset from admin
// @route   POST /api/auth/request-password-reset
// @access  Private
exports.requestPasswordReset = async (req, res) => {
  try {
    const { message } = req.body;
    const user = req.user;

    // Find all admin users
    const admins = await User.find({ role: 'admin' });

    if (admins.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'No admin found to process request'
      });
    }

    // Send notification to all admins
    for (const admin of admins) {
      await createAndEmit(
        admin._id,
        'password_reset_request',
        'Password Reset Request',
        `${user.name} (${user.email}) is requesting a password reset.${message ? ' Reason: ' + message : ''}`,
        {
          requesterId: user._id,
          requesterName: user.name,
          requesterEmail: user.email,
          requesterRole: user.role,
          message: message || ''
        }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Password reset request sent to admin. You will be notified when it is done.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// @desc    Get password reset requests (admin only)
// @route   GET /api/auth/password-reset-requests
// @access  Private (Admin)
exports.getPasswordResetRequests = async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    const requests = await Notification.find({
      user: req.user.id,
      type: 'password_reset_request',
    }).sort('-createdAt').limit(50);

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

