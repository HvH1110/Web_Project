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
  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
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
