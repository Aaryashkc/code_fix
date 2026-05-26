// Cookie configuration for HTTP-only authentication
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  // Allow cookies on top-level return navigation from payment gateways like eSewa.
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/'
};

// Set auth cookie helper
exports.setAuthCookie = (res, token) => {
  res.cookie('token', token, cookieOptions);
};

// Clear auth cookie helper  
exports.clearAuthCookie = (res) => {
  res.cookie('token', '', { ...cookieOptions, maxAge: 0 });
};
