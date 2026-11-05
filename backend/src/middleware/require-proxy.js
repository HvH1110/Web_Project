import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { httpError } from '../utils/http-error.js';

const sha256 = (text) => crypto.createHash('sha256').update(text).digest();

// With PROXY_SECRET set, only the frontend's proxy may call the API. The host's
// address stays public, and a direct caller could fake X-Forwarded-For and so
// its IP address in the rate limits. The health check stays open for the host.
export function requireProxy(req, res, next) {
  if (!env.proxySecret || req.path === '/api/health') {
    return next();
  }
  const given = req.get('x-proxy-secret') ?? '';
  // Hashed because timingSafeEqual needs inputs of the same length.
  if (crypto.timingSafeEqual(sha256(given), sha256(env.proxySecret))) {
    return next();
  }
  next(httpError(403, 'Direct access is not allowed'));
}
