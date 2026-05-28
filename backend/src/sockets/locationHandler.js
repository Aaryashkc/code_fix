const {
  getLiveTripSnapshot,
  joinTripSession,
  leaveTripSession,
  stopTripLocation,
  triggerTripSOS,
  updateTripLocation,
} = require('./liveTripState');
const { getAccessibleBooking } = require('../utils/liveTripAccess');
const { recordLiveTripEvent, recordLocationMilestone } = require('../utils/liveTripEvents');

function emitTripSnapshot(io, bookingId) {
  const snapshot = getLiveTripSnapshot(bookingId);
  if (snapshot) {
    io.to(snapshot.room).to('admins').emit('liveTripState', snapshot);
  }
}

function registerLocationHandlers({ io, socket }) {
  socket.data.joinedTripRooms = socket.data.joinedTripRooms || new Set();

  const recordEventSafely = (eventPayload) => {
    void recordLiveTripEvent(eventPayload).catch((error) => {
      console.error(`Live trip event persistence failed: ${error.message}`);
    });
  };

  socket.on('joinTripRoom', async (payload = {}, acknowledge) => {
    try {
      const bookingId = String(payload.bookingId || '');
      if (!bookingId) {
        throw new Error('Booking ID is required');
      }

      const access = await getAccessibleBooking(bookingId, {
        id: socket.userId,
        role: socket.userRole,
      });

      socket.join(access.metadata.room);
      socket.data.joinedTripRooms.add(bookingId);

      const snapshot = joinTripSession(bookingId, access.metadata, {
        socketId: socket.id,
        role: socket.userRole,
        userId: socket.userId,
      });

      recordEventSafely({
        bookingId,
        type: 'trip_joined',
        actorId: socket.userId,
        actorRole: socket.userRole,
        message: `${socket.userRole} joined live trip monitoring`,
      });

      io.to(snapshot.room).to('admins').emit('liveTripState', snapshot);
      if (typeof acknowledge === 'function') {
        acknowledge({ success: true, data: snapshot });
      }
    } catch (error) {
      if (typeof acknowledge === 'function') {
        acknowledge({ success: false, message: error.message });
      }
      socket.emit('liveTrip:error', { message: error.message });
    }
  });

  socket.on('leaveTripRoom', async (payload = {}, acknowledge) => {
    try {
      const bookingId = String(payload.bookingId || '');
      if (!bookingId) {
        throw new Error('Booking ID is required');
      }

      await getAccessibleBooking(bookingId, {
        id: socket.userId,
        role: socket.userRole,
      });

      socket.leave(`trip:${bookingId}`);
      socket.data.joinedTripRooms.delete(bookingId);
      const snapshot = leaveTripSession(bookingId, socket.id);

      recordEventSafely({
        bookingId,
        type: 'trip_left',
        actorId: socket.userId,
        actorRole: socket.userRole,
        message: `${socket.userRole} left live trip monitoring`,
      });

      if (snapshot) {
        io.to(snapshot.room).to('admins').emit('liveTripState', snapshot);
      }

      if (typeof acknowledge === 'function') {
        acknowledge({ success: true });
      }
    } catch (error) {
      if (typeof acknowledge === 'function') {
        acknowledge({ success: false, message: error.message });
      }
      socket.emit('liveTrip:error', { message: error.message });
    }
  });

  socket.on('updateLocation', async (payload = {}, acknowledge) => {
    try {
      const bookingId = String(payload.bookingId || '');
      if (!bookingId) {
        throw new Error('Booking ID is required');
      }

      const lat = Number(payload.lat);
      const lng = Number(payload.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error('Valid latitude and longitude are required');
      }

      const access = await getAccessibleBooking(bookingId, {
        id: socket.userId,
        role: socket.userRole,
      });

      if (!access.permissions.isTourist && !access.permissions.isAdmin) {
        throw new Error('Only tourists can broadcast trip location');
      }

      const snapshot = updateTripLocation(bookingId, access.metadata, {
        lat,
        lng,
        accuracy: Number(payload.accuracy) || null,
        heading: Number(payload.heading) || null,
        speed: Number(payload.speed) || null,
        updatedAt: new Date().toISOString(),
        userId: socket.userId,
      });

      const locationEvent = await recordLocationMilestone({
        socket,
        bookingId,
        actorId: socket.userId,
        actorRole: socket.userRole,
        location: snapshot.latestLocation,
      });

      if (locationEvent) {
        io.to(snapshot.room).to('admins').emit('liveTripEventRecorded', {
          bookingId,
          event: locationEvent,
        });
      }

      io.to(snapshot.room).to('admins').emit('tripLocationUpdated', {
        bookingId,
        latestLocation: snapshot.latestLocation,
      });
      io.to(snapshot.room).to('admins').emit('liveTripState', snapshot);

      if (typeof acknowledge === 'function') {
        acknowledge({ success: true, data: snapshot.latestLocation });
      }
    } catch (error) {
      if (typeof acknowledge === 'function') {
        acknowledge({ success: false, message: error.message });
      }
      socket.emit('liveTrip:error', { message: error.message });
    }
  });

  socket.on('stopLocationSharing', async (payload = {}, acknowledge) => {
    try {
      const bookingId = String(payload.bookingId || '');
      if (!bookingId) {
        throw new Error('Booking ID is required');
      }

      const access = await getAccessibleBooking(bookingId, {
        id: socket.userId,
        role: socket.userRole,
      });

      if (!access.permissions.isTourist && !access.permissions.isAdmin) {
        throw new Error('Only tourists can stop trip location sharing');
      }

      const snapshot = stopTripLocation(bookingId, access.metadata);
      recordEventSafely({
        bookingId,
        type: 'trip_left',
        actorId: socket.userId,
        actorRole: socket.userRole,
        message: `${socket.userRole} stopped live location sharing`,
        metadata: { locationSharingStopped: true },
      });

      io.to(snapshot.room).to('admins').emit('tripLocationUpdated', {
        bookingId,
        latestLocation: null,
      });
      io.to(snapshot.room).to('admins').emit('liveTripState', snapshot);

      if (typeof acknowledge === 'function') {
        acknowledge({ success: true, data: snapshot });
      }
    } catch (error) {
      if (typeof acknowledge === 'function') {
        acknowledge({ success: false, message: error.message });
      }
      socket.emit('liveTrip:error', { message: error.message });
    }
  });

  socket.on('triggerSOS', async (payload = {}, acknowledge) => {
    try {
      const bookingId = String(payload.bookingId || '');
      if (!bookingId) {
        throw new Error('Booking ID is required');
      }

      const access = await getAccessibleBooking(bookingId, {
        id: socket.userId,
        role: socket.userRole,
      });

      if (!access.permissions.isTourist && !access.permissions.isGuide && !access.permissions.isAdmin) {
        throw new Error('Not authorized to trigger SOS');
      }

      const snapshot = triggerTripSOS(bookingId, access.metadata, {
        message: payload.message || 'Emergency assistance requested',
        triggeredAt: new Date().toISOString(),
        lat: Number(payload.lat),
        lng: Number(payload.lng),
        userId: socket.userId,
        triggeredBy: socket.userRole,
      });

      const alertPayload = {
        bookingId,
        message: snapshot.lastSOS?.message,
        triggeredAt: snapshot.lastSOS?.triggeredAt,
        lat: snapshot.lastSOS?.lat,
        lng: snapshot.lastSOS?.lng,
        triggeredBy: socket.userRole,
        tourist: snapshot.tourist,
        guide: snapshot.guide,
      };

      const sosEvent = await recordLiveTripEvent({
        bookingId,
        type: 'sos_triggered',
        actorId: socket.userId,
        actorRole: socket.userRole,
        message: alertPayload.message,
        location: {
          lat: alertPayload.lat,
          lng: alertPayload.lng,
        },
        metadata: {
          tourist: alertPayload.tourist,
          guide: alertPayload.guide,
        },
      });

      alertPayload.event = sosEvent;

      io.to(snapshot.room).to('admins').emit('SOS_ALERT', alertPayload);
      io.to(snapshot.room).to('admins').emit('liveTripEventRecorded', {
        bookingId,
        event: sosEvent,
      });
      if (snapshot.guide?.id) {
        io.to(`guide:${snapshot.guide.id}`).emit('SOS_ALERT', alertPayload);
      }
      emitTripSnapshot(io, bookingId);

      if (typeof acknowledge === 'function') {
        acknowledge({ success: true, data: alertPayload });
      }
    } catch (error) {
      if (typeof acknowledge === 'function') {
        acknowledge({ success: false, message: error.message });
      }
      socket.emit('liveTrip:error', { message: error.message });
    }
  });

  socket.on('disconnect', () => {
    for (const bookingId of socket.data.joinedTripRooms || []) {
      const snapshot = leaveTripSession(bookingId, socket.id);
      recordEventSafely({
        bookingId,
        type: 'trip_left',
        actorId: socket.userId,
        actorRole: socket.userRole,
        message: `${socket.userRole} disconnected from live trip monitoring`,
      });
      if (snapshot) {
        io.to(snapshot.room).to('admins').emit('liveTripState', snapshot);
      }
    }
  });
}

module.exports = {
  registerLocationHandlers,
};
