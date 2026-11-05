import { dbStatus, waitForStartup } from '../config/db.js';
import { httpError } from '../utils/http-error.js';

// For routes that need MongoDB. Right after a start, waits for the connection
// (config/db.js sets the limit). Otherwise answers 503 right away while
// disconnected, instead of letting Mongoose buffer the query until it times out.
export async function requireDb(req, res, next) {
  await waitForStartup();
  next(dbStatus() === 'connected' ? undefined : httpError(503, 'Database unavailable'));
}
