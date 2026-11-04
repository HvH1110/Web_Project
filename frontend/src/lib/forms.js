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
  return error?.message ?? 'Something went wrong. Please try again.'
}

// For a 400 or 409, the form field its message is about: the first of
// `fields` ([pattern, name] pairs) whose pattern matches, else null.
export function fieldFromMessage(error, fields) {
  if (error?.status !== 400 && error?.status !== 409) return null
  return fields.find(([pattern]) => pattern.test(error.message))?.[1] ?? null
}
