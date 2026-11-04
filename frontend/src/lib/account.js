// Account form rules, mirroring "User" and "Accounts" in ../docs/API.md so
// mistakes show before a request. The backend still has the final say.

// Trimmed and composed (NFC), so "Nguyễn" typed with combining marks
// counts and compares as the same name.
export const normalizeName = (value) => value.normalize('NFC').trim()

// 2 to 30 letters (any language), digits, spaces, ".", "_" or "-", starting
// and ending with a letter or digit.
const DISPLAY_NAME = /^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,28}[\p{L}\p{N}]$/u

export function checkDisplayName(value) {
  const name = normalizeName(value)
  if (!name) return 'Enter a display name.'
  if (name.length < 2 || name.length > 30) return 'Use 2 to 30 characters.'
  if (!DISPLAY_NAME.test(name)) {
    return 'Use letters, digits, spaces, “.”, “_” or “-”, starting and ending with a letter or digit.'
  }
  return null
}

// Deliberately loose: one "@" with something either side and a dot in the
// domain. The backend decides what is valid.
export function checkEmail(value) {
  const email = value.trim()
  if (!email) return 'Enter your email address.'
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Enter a valid email address, like an@example.com.'
  }
  return null
}

export function checkNewPassword(value) {
  if (!value) return 'Enter a password.'
  if (value.length < 8) return 'Use at least 8 characters.'
  if (value.length > 128) return 'Use at most 128 characters.'
  return null
}

// Only paths on this site, so ?next= can't send anyone elsewhere, and not
// the log in or register pages, which would send a member straight back.
export function safeNext(next) {
  const onSite = next?.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')
  return onSite && !/^\/account\/(login|register)\b/.test(next) ? next : '/account'
}

// /account/login, remembering where to go back to.
export function accountPath(page, next) {
  const back = safeNext(next)
  return back === '/account' ? `/account/${page}` : `/account/${page}?next=${encodeURIComponent(back)}`
}
