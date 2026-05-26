const jwt = require('jsonwebtoken');
const TokenBlacklist = require('../models/TokenBlacklist');

// Generate JWT Token with user claims
exports.generateToken = (userId, userRole, userEmail) => {
  const tokenExpiry = process.env.JWT_EXPIRE || '7d';

  return jwt.sign({ 
    id: userId,
    role: userRole,
    email: userEmail
  }, process.env.JWT_SECRET, {
    expiresIn: tokenExpiry
  });
};

// Verify JWT Token (with blacklist check)
exports.verifyToken = async (token) => {
  try {
    // First check if token is blacklisted
    const blacklisted = await TokenBlacklist.findOne({ token });
    if (blacklisted) {
      return null;
    }
    
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (_error) {
    return null;
  }
};

// Blacklist a token
exports.blacklistToken = async (token, userId) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const expiresAt = new Date(decoded.exp * 1000); // Convert UNIX timestamp to Date
    
    await TokenBlacklist.create({
      token,
      userId,
      expiresAt
    });
    
    return true;
  } catch (error) {
    console.error('Error blacklisting token:', error.message);
    return false;
  }
};
