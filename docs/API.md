# API Contract

The single source of truth between `frontend/` and `backend/`.

- **Owner:** backend session. It updates this file whenever an endpoint is added or changed.
- **Reader:** frontend session. It codes against this file.

## Conventions
- Base URL: `http://localhost:5000/api` locally. The frontend reads it from `VITE_API_URL`.
- Paths below include the `/api` prefix.
- JSON request and response bodies.
- Errors: non-2xx status with body `{ "error": { "message": "Human-readable message" } }`.
- Auth: not decided yet.

## Endpoints

### `GET /api/health`
Health check. Also reports whether the backend is connected to MongoDB Atlas.

**Response 200**
```json
{ "status": "ok", "db": "connected" }
```
`db` is `"connected"` or `"disconnected"`.
