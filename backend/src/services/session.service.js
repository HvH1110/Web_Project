import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { Session } from '../models/session.model.js';
import { User } from '../models/user.model.js';

export const SESSION_COOKIE = 'sid';
const SESSION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: '/api',
  };
}

// Starts a session for the user and sets its cookie on the response. A new
// token on every login (never reusing `previousToken`) prevents session
// fixation; the previous session in this browser is ended.
export async function startSession(res, userId, previousToken) {
  if (typeof previousToken === 'string' && previousToken !== '') {
    await Session.deleteOne({ tokenHash: hashToken(previousToken) });
  }
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY_MS);
  await Session.create({ tokenHash: hashToken(token), userId, expiresAt });
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), expires: expiresAt });
}

// The session and user for a cookie token, or null when unknown or expired.
export async function findSession(token) {
  if (typeof token !== 'string' || token === '') {
    return null;
  }
  // The TTL index removes expired sessions with a delay, so check the date too.
  const session = await Session.findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } }).lean();
  if (!session) {
    return null;
  }
  const user = await User.findById(session.userId).lean();
  return user ? { session, user } : null;
}

export async function endSession(res, token) {
  if (typeof token === 'string' && token !== '') {
    await Session.deleteOne({ tokenHash: hashToken(token) });
  }
  res.clearCookie(SESSION_COOKIE, cookieOptions());
}

// Logs the user out everywhere except `keepSessionId`.
export async function endOtherSessions(userId, keepSessionId) {
  await Session.deleteMany({ userId, _id: { $ne: keepSessionId } });
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
}
