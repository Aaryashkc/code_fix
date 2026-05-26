const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB connected: ${conn.connection.host}`);

    // Old deployments may contain a TTL index that incorrectly deletes bookings.
    try {
      const bookingsCollection = conn.connection.collection('bookings');
      const indexes = await bookingsCollection.indexes();
      const ttlIndex = indexes.find(
        (idx) => idx.expireAfterSeconds !== undefined && idx.key && idx.key.expiresAt !== undefined
      );

      if (ttlIndex) {
        await bookingsCollection.dropIndex(ttlIndex.name);
        console.log('Dropped old TTL index on bookings collection');
      }
    } catch (_idxErr) {
      // The collection or index might not exist on a new development database.
    }
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
