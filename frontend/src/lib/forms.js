// Helpers shared by the account and forum forms.

export const checkRequired = (message) => (value) => (value ? null : message)

// { field: message } for the fields that fail, or null when all pass.
// `rules`: { field: check(value) }.
export function validate(values, rules) {
  const errors = {}
  for (const [field, check] of Object.entries(rules)) {
    const message = check(values[field])
    if (message) errors[field] = message
  }
  return Object.keys(errors).length ? errors : null
}

// What to tell the member when a request fails. The API's own messages are
// written for people, so those are shown as they are.
export function describeError(error) {
  if (error?.status === 0) return 'We can’t reach the server right now. Please try again in a moment.'
  if (error?.status === 503) return 'This is temporarily unavailable. Please try again in a moment.'
  // "Too many attempts, try again later" becomes "Too many attempts. Please
  // try again in 12 minutes." when the API said how long.
  if (error?.status === 429 && error.retryAfter != null) {
    const what = (error.message ?? '').replace(/[,.]?\s*try again.*$/i, '') || 'Too many attempts'
    return `${what}. Please try again in ${waitText(error.retryAfter)}.`
  }
  return error?.message ?? 'Something went wrong. Please try again.'
}

// Seconds from a Retry-After header (seconds, or an HTTP date), or null.
export function parseRetryAfter(value, now = Date.now()) {
  if (!value) return null
  const text = value.trim()
  const seconds = /^\d+$/.test(text) ? Number(text) : (Date.parse(text) - now) / 1000
  return Number.isFinite(seconds) ? Math.max(Math.ceil(seconds), 0) : null
}

// "10 seconds", "a minute", "12 minutes", "2 hours".
export function waitText(seconds) {
  if (seconds <= 1) return 'a second'
  if (seconds < 60) return `${seconds} seconds`
  const minutes = Math.ceil(seconds / 60)
  if (minutes === 1) return 'a minute'
  if (minutes < 120) return `${minutes} minutes`
  return `${Math.ceil(minutes / 60)} hours`
}

// For a 400 or 409, the form field its message is about: the first of
// `fields` ([pattern, name] pairs) whose pattern matches, else null.
export function fieldFromMessage(error, fields) {
  if (error?.status !== 400 && error?.status !== 409) return null
  return fields.find(([pattern]) => pattern.test(error.message))?.[1] ?? null
}
