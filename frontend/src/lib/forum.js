// Rules and helpers for the forum, mirroring "Forum" in ../docs/API.md so
// mistakes show before a request. The backend still has the final say.

export const MAX_IMAGES = 4
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
// With this list, Safari on iPhone usually converts HEIC photos to JPEG.
export const IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/gif,image/avif'

export const TITLE_MAX = 120
export const TOPIC_BODY_MAX = 10000
export const REPLY_BODY_MAX = 5000

export const topicPath = (id) => `/community/${id}`

// Lengths count characters, not UTF-16 units.
const length = (text) => [...text.trim()].length

export function checkTitle(value) {
  if (!value.trim()) return 'Enter a title.'
  if (length(value) < 5) return 'Use at least 5 characters.'
  if (length(value) > TITLE_MAX) return `Use at most ${TITLE_MAX} characters.`
  return null
}

export function checkTopicBody(value) {
  if (!value.trim()) return 'Write something for your topic.'
  if (length(value) > TOPIC_BODY_MAX) return `Use at most ${TOPIC_BODY_MAX.toLocaleString('en-US')} characters.`
  return null
}

// A reply needs text unless it has an image.
export const checkReplyBody = (imageCount) => (value) => {
  if (!value.trim() && !imageCount) return 'Write a reply or add an image.'
  if (length(value) > REPLY_BODY_MAX) return `Use at most ${REPLY_BODY_MAX.toLocaleString('en-US')} characters.`
  return null
}

export const POST_FIELDS = [
  [/title/i, 'title'],
  [/body|reply needs/i, 'body'],
]

// The label for a staff role; other members have none.
export const roleLabel = (role) => ({ moderator: 'Moderator', admin: 'Admin' })[role]

export const authorName = (author) => author?.displayName ?? 'Former member'

// Whether `viewer` may try to ban `author`; the server checks again.
export const canBan = (viewer, author) =>
  Boolean(author) &&
  author.id !== viewer.id &&
  author.role !== 'admin' &&
  (author.role !== 'moderator' || viewer.role === 'admin')
