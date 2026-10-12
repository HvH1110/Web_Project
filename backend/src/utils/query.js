import { httpError } from './http-error.js';

// Helpers to read and validate req.query. Each one throws a 400 on bad input.

// A single text value; undefined when missing or blank.
export function stringParam(query, name) {
  const value = query[name];
  if (Array.isArray(value)) {
    throw httpError(400, `${name} must be given only once`);
  }
  const text = value === undefined ? '' : String(value).trim();
  return text === '' ? undefined : text;
}

// A comma-separated list (?brand=a,b); repeated params (?brand=a&brand=b) work too.
// Undefined when empty.
export function listParam(query, name) {
  const value = query[name];
  if (value === undefined) {
    return undefined;
  }
  const items = [value]
    .flat()
    .flatMap((item) => String(item).split(','))
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? [...new Set(items)] : undefined;
}

export function enumParam(query, name, allowed, fallback) {
  const value = stringParam(query, name);
  if (value === undefined) {
    return fallback;
  }
  if (!allowed.includes(value)) {
    throw httpError(400, `${name} must be one of: ${allowed.join(', ')}`);
  }
  return value;
}

export function intParam(query, name, { min = 1, max = Number.MAX_SAFE_INTEGER, fallback }) {
  const value = stringParam(query, name);
  if (value === undefined) {
    return fallback;
  }
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    const bounds = max === Number.MAX_SAFE_INTEGER ? `>= ${min}` : `from ${min} to ${max}`;
    throw httpError(400, `${name} must be an integer ${bounds}`);
  }
  return number;
}

export function nonNegativeNumberParam(query, name) {
  const value = stringParam(query, name);
  if (value === undefined) {
    return undefined;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw httpError(400, `${name} must be a number >= 0`);
  }
  return number;
}
