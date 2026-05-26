const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

const getTokenFromRequest = (req) => {
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  return null;
};

const getAccountRestrictionMessage = (user) => {
  if (user.suspended) {
    return 'Account suspended. Please contact support.';
  }

  if (!user.verified) {
    return 'Email not verified. Please verify your email before continuing.';
  }

  return null;
};

exports.protect = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    const decoded = await verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const restrictionMessage = getAccountRestrictionMessage(req.user);
    if (restrictionMessage) {
      return res.status(403).json({
        success: false,
        message: restrictionMessage
      });
    }

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Not authorized',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Authentication failed'
    });
  }
};

exports.optionalProtect = async (req, _res, next) => {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return next();
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return next();
    }

    const user = await User.findById(decoded.id).select('-password');
    if (user && !getAccountRestrictionMessage(user)) {
      req.user = user;
    }
  } catch (_error) {
    // Payment/provider callbacks should still proceed if session restore fails.
  }

  next();
};

exports.getAccountRestrictionMessage = getAccountRestrictionMessage;

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};
