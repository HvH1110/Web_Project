import { httpError } from '../utils/http-error.js';

export const BANNED_MESSAGE = 'Your account is banned from posting';

export function isModerator(user) {
  return user.role === 'moderator' || user.role === 'admin';
}

export function isBanned(user) {
  return Boolean(user.bannedAt);
}

// User in docs/API.md. Only ever sent to that user (it includes the email).
export function toUserDto(user) {
  return {
    id: String(user._id),
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    banned: isBanned(user),
    createdAt: user.createdAt,
  };
}

// Turns a duplicate-key error from the users collection into a 409.
export function toConflictError(err) {
  if (err?.code !== 11000) {
    return err;
  }
  if (err.keyPattern?.email) {
    return httpError(409, 'An account with this email already exists');
  }
  if (err.keyPattern?.displayName) {
    return httpError(409, 'This display name is taken');
  }
  return err;
}
