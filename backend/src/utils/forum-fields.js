import { httpError } from './http-error.js';

// Validators for forum request bodies. Each one throws a 400 on bad input.

export const OBJECT_ID = /^[0-9a-f]{24}$/i;

// Control characters other than tab and newline, and bidirectional overrides
// (which can make text display in a misleading order).
// eslint-disable-next-line no-control-regex
const UNWANTED_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g;

function cleanText(value) {
  return value
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(UNWANTED_CHARS, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function checkLength(text, name, min, max) {
  const length = [...text].length;
  if (length < min || length > max) {
    throw httpError(400, min > 0 ? `${name} must be ${min} to ${max} characters` : `${name} must be at most ${max} characters`);
  }
  return text;
}

// Plain text (no HTML or Markdown), newlines kept. Undefined when missing and
// `optional`.
export function parseText(body, name, { min, max, optional = false }) {
  const value = body?.[name];
  if (value === undefined && optional) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw httpError(400, min > 0 ? `${name} is required` : `${name} must be text`);
  }
  return checkLength(cleanText(value), name, min, max);
}

export function parseTitle(body, { optional = false } = {}) {
  const value = body?.title;
  if (value === undefined && optional) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw httpError(400, 'title is required');
  }
  return checkLength(cleanText(value).replace(/\s+/g, ' '), 'title', 5, 120);
}

// Upload IDs, in display order. Undefined when missing.
export function parseImageIds(body, max) {
  const value = body?.images;
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || value.length > max) {
    throw httpError(400, `images must be a list of at most ${max} upload ids`);
  }
  if (!value.every((id) => typeof id === 'string' && OBJECT_ID.test(id))) {
    throw httpError(400, 'images must contain upload ids');
  }
  if (new Set(value.map((id) => id.toLowerCase())).size !== value.length) {
    throw httpError(400, 'images must not repeat an upload');
  }
  return value.map((id) => id.toLowerCase());
}

// A moderator's note; null when missing or blank.
export function parseReason(body) {
  const value = body?.reason;
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw httpError(400, 'reason must be text');
  }
  const reason = checkLength(cleanText(value).replace(/\s+/g, ' '), 'reason', 0, 200);
  return reason === '' ? null : reason;
}

export function parseBoolean(body, name) {
  const value = body?.[name];
  if (value !== undefined && typeof value !== 'boolean') {
    throw httpError(400, `${name} must be true or false`);
  }
  return value;
}
