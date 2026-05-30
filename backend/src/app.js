const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middleware/errorHandler');
const { sanitizeInput } = require('./middleware/validation');

// Import routes
const authRoutes = require('./routes/authRoutes');
const destinationRoutes = require('./routes/destinationRoutes');
const guideRoutes = require('./routes/guideRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const mapPinRoutes = require('./routes/mapPinRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const tripRoutes = require('./routes/tripRoutes');
const aiRoutes = require('./routes/aiRoutes');
const liveTripRoutes = require('./routes/liveTripRoutes');
const commissionRoutes = require('./routes/commissionRoutes');
const payoutRoutes = require('./routes/payoutRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const notificationService = require('./utils/notificationService');

// Validate critical environment variables at startup
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET is missing or too short (must be at least 32 characters)');
  process.exit(1);
}

// SECURITY: Warn loudly if NODE_ENV is not explicitly set in prod-like environments.
// Auth rate limits are 5x looser in dev mode — a misconfigured prod deploy would be dangerously permissive.
if (!process.env.NODE_ENV) {
  console.warn(
    '[SECURITY WARNING] NODE_ENV is not set. Defaulting to "development" — ' +
    'auth rate limits are in LENIENT mode. Set NODE_ENV=production in your deployment.'
  );
}

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
const isDev = process.env.NODE_ENV === 'development';
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const isLocalDevRequest = (req) => {
  if (!isDev) return false;
  const ip = req.ip || '';
  const host = req.hostname || req.headers.host || '';
  return (
    ip.includes('127.0.0.1') ||
    ip.includes('::1') ||
    host.includes('localhost') ||
    host.includes('127.0.0.1')
  );
};

app.use(cors({
  origin: (origin, callback) => {
    // No-origin requests (curl, Postman, server-to-server) are allowed in dev only.
    // In production, state-changing methods without an Origin are blocked below.
    if (!origin) return callback(null, true);
    // In dev mode, allow any localhost origin
    if (isDev && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.log(`CORS blocked: ${origin}`);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true
}));

// SECURITY: Reject state-changing requests without an Origin header in production.
// This prevents CSRF via no-origin bypass even when cookies are sent.
if (!isDev && process.env.NODE_ENV !== 'test') {
  const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
  app.use((req, res, next) => {
    if (UNSAFE_METHODS.has(req.method) && !req.headers.origin && !req.headers.referer) {
      return res.status(403).json({ success: false, message: 'Forbidden: missing Origin header' });
    }
    next();
  });
}

// Rate limiting — global
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  // Local navigation and hot reloads can easily exhaust this quota while developing.
  skip: (req) => isLocalDevRequest(req),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});
app.use('/api/', limiter);

// Stricter rate limiting for auth endpoints
const authRateLimitWindowMs = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || (isDev ? 5 * 60 * 1000 : 15 * 60 * 1000);
const authRateLimitMax = Number(process.env.AUTH_RATE_LIMIT_MAX) || (isDev ? 50 : 10);

const authLimiter = rateLimit({
  windowMs: authRateLimitWindowMs,
  max: authRateLimitMax,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  // Do not punish users for successful login/verification flow.
  skipSuccessfulRequests: true,
  // Avoid counting auth "status" checks like GET /api/auth/me and don't
  // double-rate-limit OTP endpoints (they have dedicated otpLimiter below).
  skip: (req) => (
    req.method === 'GET' ||
    req.path === '/request-otp' ||
    req.path === '/send-registration-otp' ||
    isLocalDevRequest(req)
  ),
  standardHeaders: true,
  legacyHeaders: false,
});

// Even stricter rate limiting for OTP requests
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 OTP requests per window
  message: {
    success: false,
    message: 'Too many OTP requests. Please wait before trying again.'
  },
  // Keep local development friction-free for demos; production still limited.
  skip: (req) => isLocalDevRequest(req),
  standardHeaders: true,
  legacyHeaders: false,
});

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser (must be before routes so req.cookies is populated)
app.use(cookieParser());

// Input sanitization
app.use(sanitizeInput);

// API Routes
app.use('/api/auth/request-otp', otpLimiter);
app.use('/api/auth/send-registration-otp', otpLimiter);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/guides', guideRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/map-pins', mapPinRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/live-trips', liveTripRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/settings', settingsRoutes);

// Initialize notification service with app reference
notificationService.setApp(app);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
