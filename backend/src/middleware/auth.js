import { SESSION_COOKIE, clearSessionCookie, findSession } from '../services/session.service.js';
import { httpError } from '../utils/http-error.js';

// Sets req.user and req.sessionId from the session cookie (both null when not
// logged in). Clears a cookie whose session no longer exists.
export async function loadUser(req, res, next) {
  req.user = null;
  req.sessionId = null;
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) {
    const found = await findSession(token);
    if (found) {
      req.user = found.user;
      req.sessionId = found.session._id;
    } else {
      clearSessionCookie(res);
    }
  }
  next();
}

// After loadUser: 401 unless logged in.
export function requireUser(req, res, next) {
  next(req.user ? undefined : httpError(401, 'Log in required'));
}
