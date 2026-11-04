// All backend calls go through this module. Endpoints are defined in ../docs/API.md.

export const API_URL = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'
).replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    // HTTP status, or 0 when the request never reached the server.
    this.status = status
  }
}

async function request(path, { body, headers, ...options } = {}) {
  const isForm = body instanceof FormData
  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      // The session cookie (see Auth in ../docs/API.md) is only stored and
      // sent with credentials, so every request includes them.
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        // A FormData body sets its own Content-Type, with the boundary.
        ...(body !== undefined && !isForm && { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body === undefined || isForm ? body : JSON.stringify(body),
    })
  } catch (err) {
    // Cancelled or timed out by the caller's signal: let the caller handle it.
    if (options.signal?.aborted) throw err
    throw new ApiError(`Could not reach the API at ${API_URL}`, 0)
  }

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    // Error body per contract: { "error": { "message": "..." } }
    throw new ApiError(
      data?.error?.message ?? `Request failed with status ${res.status}`,
      res.status,
    )
  }
  return data
}

// GET /api/health -> { status: "ok", db: "connected" | "disconnected" }
export function getHealth({ signal } = {}) {
  return request('/health', { signal })
}

// "?a=1&b=x,y" from { a: 1, b: ['x', 'y'], c: undefined }. Arrays are sent
// comma-separated; empty values are left out.
function toQuery(params) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    const text = Array.isArray(value) ? value.join(',') : value
    if (text !== undefined && text !== null && text !== '') search.set(key, String(text))
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

// GET /api/brands/:slug -> { brand }. 404 when there is no such brand.
export function getBrand(slug, { signal } = {}) {
  return request(`/brands/${encodeURIComponent(slug)}`, { signal })
}

// GET /api/products -> { items, page, limit, total, totalPages, fx }
// `params`: q, brand, category, collection, market, minPriceVnd, maxPriceVnd,
// sort, page, limit (see ../docs/API.md).
export function getProducts(params = {}, { signal } = {}) {
  return request(`/products${toQuery(params)}`, { signal })
}

const productUrl = (brand, ref) =>
  `/products/${encodeURIComponent(brand)}/${encodeURIComponent(ref)}`

// GET /api/products/:brand/:ref -> { product, fx }. 404 when there is no such product.
export function getProduct(brand, ref, { signal } = {}) {
  return request(productUrl(brand, ref), { signal })
}

// GET /api/products/:brand/:ref/history?range=1y|5y|all
// -> { range, from, to, series: [{ market, source, currency, lastSeenAt, points, vnd }] }
export function getProductHistory(brand, ref, range, { signal } = {}) {
  return request(`${productUrl(brand, ref)}/history${toQuery({ range })}`, { signal })
}

// GET /api/brands -> { items: [Brand] }, in home page order.
export function getBrands({ category, signal } = {}) {
  return request(`/brands${toQuery({ category })}`, { signal })
}

// GET /api/deals?period=today|month|year&type=market|drop&page&limit
// -> { period, since, items: [Deal], page, limit, total, totalPages, fx }
export function getDeals(params = {}, { signal } = {}) {
  return request(`/deals${toQuery(params)}`, { signal })
}

// Accounts. Register and login set the httpOnly session cookie; logout clears it.

// POST /api/auth/register { email, password, displayName } -> { user }
export function register(fields) {
  return request('/auth/register', { method: 'POST', body: fields })
}

// POST /api/auth/login { email, password } -> { user }
export function login(fields) {
  return request('/auth/login', { method: 'POST', body: fields })
}

// POST /api/auth/logout -> 204. Safe to call when not logged in.
export function logout() {
  return request('/auth/logout', { method: 'POST' })
}

// GET /api/me -> { user }, with user null when not logged in.
export function getMe({ signal } = {}) {
  return request('/me', { signal })
}

// PATCH /api/me { displayName } -> { user }
export function updateMe(fields) {
  return request('/me', { method: 'PATCH', body: fields })
}

// PUT /api/me/password { currentPassword, newPassword } -> 204. Ends the
// member's other sessions; this one stays logged in.
export function changePassword(fields) {
  return request('/me/password', { method: 'PUT', body: fields })
}

// Forum (members only). Shapes in "Forum" in ../docs/API.md.

// GET /api/forum/topics?q&brand&author&sort=activity|newest&page&limit
// -> { items: [TopicSummary], page, limit, total, totalPages }
export function getForumTopics(params = {}, { signal } = {}) {
  return request(`/forum/topics${toQuery(params)}`, { signal })
}

// POST /api/forum/topics { title, body, brand?, images? } -> { topic }
export function createForumTopic(fields) {
  return request('/forum/topics', { method: 'POST', body: fields })
}

const topicUrl = (id) => `/forum/topics/${encodeURIComponent(id)}`
const replyUrl = (id) => `/forum/replies/${encodeURIComponent(id)}`

// GET /api/forum/topics/:id -> { topic }
export function getForumTopic(id, { signal } = {}) {
  return request(topicUrl(id), { signal })
}

// PATCH /api/forum/topics/:id { title?, body?, brand?, images? } -> { topic }
export function updateForumTopic(id, fields) {
  return request(topicUrl(id), { method: 'PATCH', body: fields })
}

// DELETE /api/forum/topics/:id -> 204, with its replies and images.
export function deleteForumTopic(id) {
  return request(topicUrl(id), { method: 'DELETE' })
}

// GET /api/forum/topics/:id/replies?page&limit
// -> { items: [Reply], page, limit, total, totalPages }, oldest first.
export function getForumReplies(id, params = {}, { signal } = {}) {
  return request(`${topicUrl(id)}/replies${toQuery(params)}`, { signal })
}

// POST /api/forum/topics/:id/replies { body?, images? } -> { reply }
export function createForumReply(id, fields) {
  return request(`${topicUrl(id)}/replies`, { method: 'POST', body: fields })
}

// PATCH /api/forum/replies/:id { body?, images? } -> { reply }
export function updateForumReply(id, fields) {
  return request(replyUrl(id), { method: 'PATCH', body: fields })
}

// DELETE /api/forum/replies/:id -> 204
export function deleteForumReply(id) {
  return request(replyUrl(id), { method: 'DELETE' })
}

// POST /api/forum/uploads, multipart with the file in `image` -> { upload }
export function uploadForumImage(file) {
  const body = new FormData()
  body.append('image', file)
  return request('/forum/uploads', { method: 'POST', body })
}

// PATCH /api/forum/topics/:id/moderation { pinned?, locked?, hidden?, reason? } -> { topic }
export function moderateForumTopic(id, fields) {
  return request(`${topicUrl(id)}/moderation`, { method: 'PATCH', body: fields })
}

// PATCH /api/forum/replies/:id/moderation { hidden, reason? } -> { reply }
export function moderateForumReply(id, fields) {
  return request(`${replyUrl(id)}/moderation`, { method: 'PATCH', body: fields })
}

// PATCH /api/forum/members/:id/moderation { banned, reason? } -> { member }
export function moderateForumMember(id, fields) {
  return request(`/forum/members/${encodeURIComponent(id)}/moderation`, { method: 'PATCH', body: fields })
}
