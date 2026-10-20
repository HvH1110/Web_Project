import { httpError } from '../utils/http-error.js';

// In-memory fixed-window rate limit: at most `max` requests per `windowMs`
// for each key(req). Counts reset when the server restarts, and each server
// instance counts on its own; enough for a single small deployment.
export function rateLimit({ windowMs, max, key }) {
  const windows = new Map();

  return function rateLimitMiddleware(req, res, next) {
    const id = key(req);
    if (id == null) {
      return next();
    }
    const now = Date.now();
    if (windows.size > 10_000) {
      for (const [k, w] of windows) {
        if (w.resetAt <= now) windows.delete(k);
      }
    }
    let window = windows.get(id);
    if (!window || window.resetAt <= now) {
      window = { count: 0, resetAt: now + windowMs };
      windows.set(id, window);
    }
    window.count += 1;
    if (window.count > max) {
      res.set('Retry-After', String(Math.ceil((window.resetAt - now) / 1000)));
      return next(httpError(429, 'Too many attempts, try again later'));
    }
    next();
  };
}
