const AUTH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function getCookieOptions(persistent = false) {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    // Production deploys serve the frontend and API from separate sites.
    // Cross-site credentialed API requests require SameSite=None + Secure.
    sameSite: isProduction ? 'none' : 'lax',
    ...(persistent && { maxAge: AUTH_COOKIE_MAX_AGE }),
    path: '/'
  };
}

// Set auth cookie helper
exports.setAuthCookie = (res, token, persistent = false) => {
  res.cookie('token', token, getCookieOptions(persistent));
};

// Clear auth cookie helper  
exports.clearAuthCookie = (res) => {
  res.cookie('token', '', { ...getCookieOptions(), maxAge: 0 });
};
