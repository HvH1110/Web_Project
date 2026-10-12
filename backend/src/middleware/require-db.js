import { dbStatus } from '../config/db.js';
import { httpError } from '../utils/http-error.js';

// For routes that need MongoDB: answer 503 right away while disconnected,
// instead of letting Mongoose buffer the query until it times out.
export function requireDb(req, res, next) {
  next(dbStatus() === 'connected' ? undefined : httpError(503, 'Database unavailable'));
}
