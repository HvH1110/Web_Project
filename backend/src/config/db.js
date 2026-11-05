import mongoose from 'mongoose';

// How long requests may wait for the first connection after a start. A host
// that sleeps wakes on a request, which shouldn't get an error for arriving early.
const STARTUP_WAIT_MS = 20_000;
const RETRY_MS = 5_000;

// Set during the startup wait: resolves on connecting or when the wait is over.
let startupWait = null;

function beginStartupWait() {
  startupWait = new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      mongoose.connection.off('connected', finish);
      startupWait = null;
      resolve();
    };
    const timer = setTimeout(finish, STARTUP_WAIT_MS);
    mongoose.connection.once('connected', finish);
  });
}

// Connects to MongoDB, retrying until it works, because a failed first attempt
// never reconnects by itself. Never throws: without a working connection the
// API still runs and /api/health reports db "disconnected".
export async function connectDB(uri) {
  if (!uri) {
    console.warn('MONGODB_URI is not set; running without a database.');
    return;
  }

  beginStartupWait();
  for (;;) {
    try {
      await mongoose.connect(uri);
      console.log('MongoDB connected');
      return;
    } catch (err) {
      // Log only the message: the error object can carry connection details.
      console.error(`MongoDB connection failed: ${err.message}`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
    }
  }
}

export function dbStatus() {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected
    ? 'connected'
    : 'disconnected';
}

// Resolves when requests should stop waiting for the database: at once, except
// during the startup wait.
export function waitForStartup() {
  return startupWait ?? Promise.resolve();
}
