import { env } from '../config/env.js';
import { httpError } from '../utils/http-error.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// CSRF protection for the session cookie: refuse state-changing requests sent
// by a page on another origin. Browsers always set Origin on those; requests
// without it (curl, server-to-server) carry no browser cookies to abuse.
export function checkOrigin(req, res, next) {
  const origin = req.get('origin');
  if (SAFE_METHODS.has(req.method) || !origin || origin === env.clientOrigin) {
    return next();
  }
  next(httpError(403, 'Cross-origin request refused'));
}
