import { httpError } from './http-error.js';

// Validators for account request bodies. Each one throws a 400 on bad input.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DISPLAY_NAME = /^[\p{L}\p{N}](?:[\p{L}\p{N} ._-]*[\p{L}\p{N}])?$/u;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

export function requiredString(body, name) {
  const value = body?.[name];
  if (typeof value !== 'string' || value.trim() === '') {
    throw httpError(400, `${name} is required`);
  }
  return value;
}

export function parseEmail(body) {
  const email = requiredString(body, 'email').trim().toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) {
    throw httpError(400, 'email is not a valid address');
  }
  return email;
}

// A password being set. Not trimmed: spaces are part of it.
export function parseNewPassword(body, name) {
  const password = requiredString(body, name);
  const length = [...password].length;
  if (length < PASSWORD_MIN || length > PASSWORD_MAX) {
    throw httpError(400, `${name} must be ${PASSWORD_MIN} to ${PASSWORD_MAX} characters`);
  }
  return password;
}

export function parseDisplayName(body) {
  const name = requiredString(body, 'displayName').normalize('NFC').trim().replace(/\s+/g, ' ');
  const length = [...name].length;
  if (length < 2 || length > 30 || !DISPLAY_NAME.test(name)) {
    throw httpError(
      400,
      'displayName must be 2 to 30 characters: letters, digits, spaces, ".", "_" or "-", starting and ending with a letter or digit',
    );
  }
  return name;
}
