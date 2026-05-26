const { body, validationResult } = require('express-validator');

// XSS protection middleware
exports.sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    const sanitized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (typeof obj[key] === 'string') {
          // Basic XSS protection - only strip angle brackets to prevent HTML injection
          // Do NOT replace quotes or slashes - they are valid in passwords and URLs
          sanitized[key] = obj[key]
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        } else if (typeof obj[key] === 'object') {
          sanitized[key] = sanitize(obj[key]);
        } else {
          sanitized[key] = obj[key];
        }
      }
    }
    return sanitized;
  };

  // Sanitize request body, query, and params
  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

// Validation error handler
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// Common validation rules
exports.validateRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .escape(),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('country')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Country name must be less than 50 characters')
    .escape(),
  
  body('phone')
    .optional()
    .trim()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number')
];

exports.validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

exports.validateBooking = [
  body('guideId')
    .notEmpty()
    .withMessage('Guide ID is required')
    .isMongoId()
    .withMessage('Invalid guide ID'),
  
  body('destinations')
    .isArray({ min: 1 })
    .withMessage('At least one destination is required'),
  
  body('startDate')
    .isISO8601()
    .withMessage('Invalid start date format'),
  
  body('endDate')
    .isISO8601()
    .withMessage('Invalid end date format'),
  
  body('offeredPrice')
    .isNumeric()
    .withMessage('Offered price must be a number')
    .isFloat({ min: 1 })
    .withMessage('Offered price must be greater than 0'),
  
  body('groupSize')
    .isInt({ min: 1, max: 50 })
    .withMessage('Group size must be between 1 and 50')
];

exports.validateReview = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('text')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Review text must be between 10 and 1000 characters')
    .escape(),
  
  body('tripType')
    .trim()
    .isLength({ max: 50 })
    .withMessage('Trip type must be less than 50 characters')
    .escape()
];

// OTP validation rules
exports.validateOTPRequest = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
];

exports.validateOTPVerify = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers')
    .trim()
];
