import mongoose from 'mongoose';

// Connects to MongoDB. Never throws: without a working connection the API
// still runs and /api/health reports db "disconnected".
export async function connectDB(uri) {
  if (!uri) {
    console.warn('MONGODB_URI is not set; running without a database.');
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected');
  } catch (err) {
    // Log only the message: the error object can carry connection details.
    console.error(`MongoDB connection failed: ${err.message}`);
  }
}

export function dbStatus() {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected
    ? 'connected'
    : 'disconnected';
}
