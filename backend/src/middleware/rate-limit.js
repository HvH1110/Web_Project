import crypto from 'node:crypto';
import { httpError } from '../utils/http-error.js';

// Keys come from the request, so an attacker chooses them: both how many there
// are and how long they get.
const MAX_KEYS = 10_000;
const MAX_KEY_LENGTH = 200;

function boundedKey(id) {
  const text = String(id);
  return text.length <= MAX_KEY_LENGTH ? text : crypto.createHash('sha256').update(text).digest('hex');
}

// In-memory fixed-window rate limit: at most `max` requests per `windowMs`
// for each key(req). Counts reset when the server restarts, and each server
// instance counts on its own; enough for a single small deployment.
// `store` lets tests look at the counters.
export function rateLimit({ windowMs, max, key, store: windows = new Map() }) {
  return function rateLimitMiddleware(req, res, next) {
    const id = key(req);
    if (id == null) {
      return next();
    }
    const boundedId = boundedKey(id);
    const now = Date.now();
    let window = windows.get(boundedId);
    if (!window || window.resetAt <= now) {
      // New windows go last, so the Map stays ordered oldest first. Over the cap
      // the oldest windows are forgotten, even unfinished ones: their keys start
      // counting again, which is better than running out of memory.
      windows.delete(boundedId);
      for (const [oldId, old] of windows) {
        if (old.resetAt > now && windows.size < MAX_KEYS) {
          break;
        }
        windows.delete(oldId);
      }
      window = { count: 0, resetAt: now + windowMs };
      windows.set(boundedId, window);
    }
    window.count += 1;
    if (window.count > max) {
      res.set('Retry-After', String(Math.ceil((window.resetAt - now) / 1000)));
      return next(httpError(429, 'Too many attempts, try again later'));
    }
    next();
  };
}
