// Production-safe error response utility
const getSafeError = (error, defaultMessage = 'Server error') => {
  if (process.env.NODE_ENV === 'development') {
    return error.message;
  }
  
  // Log full error in production for debugging
  console.error('Production error:', error);
  
  return defaultMessage;
};

module.exports = { getSafeError };
