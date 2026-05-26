const Notification = require('../models/Notification');

let appInstance = null;

const setApp = (app) => {
  appInstance = app;
};

/**
 * Create a notification in the database and emit it via Socket.io if the user is online.
 *
 * @throws {Error} Re-throws any DB or emit errors so callers can react.
 *   All existing callers already wrap this in try/catch and log errors —
 *   this change makes failures explicit rather than silently returning null.
 *
 * @returns {Promise<Document>} The created Notification document.
 */
const createAndEmit = async (userId, type, title, message, data = {}) => {
  // Create notification in DB — throws on failure so the caller knows
  const notification = await Notification.create({
    user: userId,
    type,
    title,
    message,
    data
  });

  // Emit via Socket.io if user is online — best-effort, log but don't re-throw
  if (appInstance) {
    try {
      const io = appInstance.get('io');
      const userSocketMap = appInstance.get('userSocketMap');

      if (io && userSocketMap) {
        const socketId = userSocketMap.get(userId.toString());
        if (socketId) {
          io.to(socketId).emit('notification', notification);
        }
      }
    } catch (emitErr) {
      // Socket errors are non-fatal — the notification is already persisted in the DB.
      // Log for observability but don't fail the caller.
      console.error(`[notificationService] Socket emit failed for user ${userId}:`, emitErr.message);
    }
  }

  return notification;
};

module.exports = { createAndEmit, setApp };
