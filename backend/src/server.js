const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const http = require('http');
const app = require('./app');
const connectDB = require('./config/database');
const { Server } = require('socket.io');
const { verifyToken } = require('./utils/jwt');
const { getAccountRestrictionMessage } = require('./middleware/auth');
const { validateEnv } = require('./config/envValidation');
const { registerLocationHandlers } = require('./sockets/locationHandler');
const cron = require('node-cron');
const Booking = require('./models/Booking');
const User = require('./models/User');
const { createAndEmit } = require('./utils/notificationService');

// Validate environment variables before starting
validateEnv();

const PORT = process.env.PORT || 5001;

// Connect to database

// ─── Scheduled Jobs ──────────────────────────────────────────────────────────

// M-4: Expire stale pending/negotiating bookings every 15 minutes.
// Without this, phantom bookings only expire when a party hits getMyBookings/getMyRequests.
cron.schedule('*/15 * * * *', async () => {
  try {
    await Booking.expireStaleBookings();
  } catch (err) {
    console.error('Cron (expireStaleBookings) error:', err.message);
  }
});

// L-2: Fire pre-trip reminders for confirmed bookings starting within the next 24 hours.
// Runs every hour. Uses reminderSent flag to prevent duplicate notifications.
cron.schedule('0 * * * *', async () => {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcomingBookings = await Booking.find({
      status: 'confirmed',
      startDate: { $gte: now, $lte: in24h },
      reminderSent: { $ne: true }
    }).select('_id tourist guide startDate');

    for (const booking of upcomingBookings) {
      const startStr = new Date(booking.startDate).toLocaleDateString();
      await Promise.allSettled([
        createAndEmit(
          booking.tourist.toString(),
          'trip_reminder',
          'Trip Reminder',
          `Your trip starts tomorrow (${startStr}). Have a great journey!`,
          { bookingId: booking._id }
        ),
        createAndEmit(
          booking.guide.toString(),
          'trip_reminder',
          'Trip Reminder',
          `You have a trip starting tomorrow (${startStr}). Be prepared!`,
          { bookingId: booking._id }
        )
      ]);
      await Booking.updateOne({ _id: booking._id }, { $set: { reminderSent: true } });
    }

    if (upcomingBookings.length > 0) {
      console.log(`⏰ Sent pre-trip reminders for ${upcomingBookings.length} booking(s)`);
    }
  } catch (err) {
    console.error('Cron (tripReminders) error:', err.message);
  }
});

// ─────────────────────────────────────────────────────────────────────────────

// Create HTTP server
const server = http.createServer(app);

// Parse allowed origins the same way the HTTP CORS config does
const allowedSocketOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedSocketOrigins.includes(origin)) return callback(null, true);
      // In dev mode allow any localhost origin
      if (
        process.env.NODE_ENV === 'development' &&
        (origin.includes('localhost') || origin.includes('127.0.0.1'))
      ) {
        return callback(null, true);
      }
      callback(new Error(`Socket CORS: origin '${origin}' not allowed`));
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Map of userId -> socketId for targeted notifications
const userSocketMap = new Map();
// Track online guides for real-time status
const onlineGuides = new Set();

function getCookieValue(header, name) {
  if (!header) return null;

  for (const item of header.split(';')) {
    const separatorIndex = item.indexOf('=');
    if (separatorIndex < 0) continue;

    const cookieName = item.slice(0, separatorIndex).trim();
    if (cookieName !== name) continue;

    try {
      return decodeURIComponent(item.slice(separatorIndex + 1).trim());
    } catch (_error) {
      return null;
    }
  }

  return null;
}

async function loadSocketUser(userId) {
  const user = await User.findById(userId).select('-password');
  if (!user) {
    throw new Error('User not found');
  }

  const restrictionMessage = getAccountRestrictionMessage(user);
  if (restrictionMessage) {
    throw new Error(restrictionMessage);
  }

  return user;
}

// Authenticate sockets from the same HTTP-only cookie used by protected API routes.
io.use(async (socket, next) => {
  try {
    const token = getCookieValue(socket.request.headers.cookie, 'token');
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return next(new Error('Invalid token'));
    }

    const user = await loadSocketUser(decoded.id);
    socket.userId = user.id;
    socket.userRole = user.role;
    next();
  } catch (_err) {
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  userSocketMap.set(socket.userId, socket.id);
  socket.join(`user:${socket.userId}`);

  if (socket.userRole === 'admin') {
    socket.join('admins');
  }

  if (socket.userRole === 'guide') {
    socket.join(`guide:${socket.userId}`);
  }

  // Suspensions and verification changes take effect on already connected sockets.
  socket.use(async (_event, next) => {
    try {
      const user = await loadSocketUser(socket.userId);
      socket.userRole = user.role;
      next();
    } catch (error) {
      next(new Error(error.message));
      socket.disconnect(true);
    }
  });

  // Guide goes online/offline
  socket.on('guide:toggle-online', (payload) => {
    if (socket.userRole !== 'guide') return;

    const isOnline = typeof payload === 'boolean'
      ? payload
      : Boolean(payload?.online ?? payload?.isOnline);

    if (isOnline) {
      onlineGuides.add(socket.userId);
    } else {
      onlineGuides.delete(socket.userId);
    }
    // Broadcast to all connected clients
    io.emit('guide:online-status', {
      guideId: socket.userId,
      isOnline
    });
  });

  // Get list of currently online guides
  socket.on('guides:get-online', () => {
    socket.emit('guides:online-list', Array.from(onlineGuides));
  });

  // Booking negotiation events — validate all payloads before relaying
  const mongoose = require('mongoose');

  async function getNegotiationAccess(data) {
    const bookingId = String(data?.bookingId || '');
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return null;
    }

    const booking = await Booking.findById(bookingId).select(
      'tourist guide status agreedPrice negotiationHistory'
    );
    if (!booking) {
      return null;
    }

    const isTourist = booking.tourist.toString() === socket.userId;
    const isGuide = booking.guide.toString() === socket.userId;
    if (!isTourist && !isGuide) {
      return null;
    }

    return {
      booking,
      isGuide,
      targetUserId: isTourist ? booking.guide.toString() : booking.tourist.toString()
    };
  }

  socket.on('booking:counter-offer', async (data) => {
    if (!data || typeof data !== 'object') return;
    const { bookingId } = data;
    const access = await getNegotiationAccess(data).catch(() => null);
    if (!access) return;
    const { booking, targetUserId } = access;
    const lastEntry = booking.negotiationHistory[booking.negotiationHistory.length - 1];
    if (booking.status !== 'negotiating' || !lastEntry || lastEntry.by !== socket.userRole) return;

    // Validate bookingId is a valid Mongo ObjectId
    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) return;
    // Validate price is a finite positive number — rejects NaN, Infinity, strings
    const safePrice = Number(lastEntry.price);
    if (!Number.isFinite(safePrice) || safePrice <= 0) return;
    // Validate targetUserId exists and is not the caller (prevents self-routing)
    if (!targetUserId || targetUserId === socket.userId) return;

    const targetSocketId = userSocketMap.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('booking:counter-offer', {
        bookingId,
        price: safePrice,
        message: typeof lastEntry.message === 'string' ? lastEntry.message.slice(0, 500) : '',
        from: socket.userId
      });
    }
  });

  socket.on('booking:accept-price', async (data) => {
    if (!data || typeof data !== 'object') return;
    const { bookingId } = data;
    const access = await getNegotiationAccess(data).catch(() => null);
    if (!access) return;
    const { booking, targetUserId } = access;
    if (booking.status !== 'confirmed') return;

    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) return;
    const safeAgreed = Number(booking.agreedPrice);
    if (!Number.isFinite(safeAgreed) || safeAgreed <= 0) return;
    if (!targetUserId || targetUserId === socket.userId) return;

    const targetSocketId = userSocketMap.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('booking:price-accepted', {
        bookingId,
        agreedPrice: safeAgreed,
        from: socket.userId
      });
    }
  });

  socket.on('booking:decline', async (data) => {
    if (!data || typeof data !== 'object') return;
    const { bookingId } = data;
    const access = await getNegotiationAccess(data).catch(() => null);
    if (!access) return;
    const { booking, isGuide, targetUserId } = access;
    if (!isGuide || booking.status !== 'declined') return;

    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) return;
    if (!targetUserId || targetUserId === socket.userId) return;

    const targetSocketId = userSocketMap.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('booking:declined', {
        bookingId,
        from: socket.userId
      });
    }
  });

  registerLocationHandlers({ io, socket });

  socket.on('disconnect', () => {
    if (userSocketMap.get(socket.userId) === socket.id) {
      userSocketMap.delete(socket.userId);
    }

    // Auto-offline guide on disconnect
    if (onlineGuides.has(socket.userId)) {
      onlineGuides.delete(socket.userId);
      io.emit('guide:online-status', {
        guideId: socket.userId,
        isOnline: false
      });
    }
  });
});

// Make io, userSocketMap, and onlineGuides accessible to other modules
app.set('io', io);
app.set('userSocketMap', userSocketMap);
app.set('onlineGuides', onlineGuides);

// Start accepting requests only after the database connection succeeds.
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});
