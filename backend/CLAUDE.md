# Backend session

You are the **backend** session. Your area is `backend/` (this folder) plus `docs/API.md`. Shared rules are in the root `CLAUDE.md`.

## Stack
- Node.js with ES modules (`"type": "module"`) + Express
- MongoDB Atlas via Mongoose
- Config from environment variables (`dotenv`)

## Conventions
- Layout: `src/server.js` (connects DB, starts server), `src/app.js` (Express app), `src/config/db.js`, `src/routes/`, `src/controllers/`, `src/models/`, `src/middleware/`, `src/services/` (logic shared by controllers), `src/utils/`. Scripts in `scripts/`.
- All routes are under `/api`.
- Errors: proper status code with body `{ "error": { "message": "..." } }`, produced by one error-handling middleware. Throw `httpError(status, message)` from `src/utils/http-error.js`.
- CORS: allow the origin in `CLIENT_ORIGIN`.
- Crawler collections (`products`, `offers`, `price_points`, `fx_rates`, see `../docs/DATA.md`) are read-only here. Define their models with `readOnlySchema` (`src/models/read-only-schema.js`): no auto-created collections or indexes, and any write throws. The backend owns `brands`.

## Environment
Real values go in `backend/.env` (gitignored). Document every variable in `backend/.env.example`.
- `PORT`: default `5000`
- `MONGODB_URI`: Atlas connection string. The user pastes it in; never print, log or commit it.
- `CLIENT_ORIGIN`: default `http://localhost:5173`. Also the only origin allowed to send non-GET requests (CSRF check).
- `COOKIE_SECURE` (default `false`), `COOKIE_SAME_SITE` (default `lax`): session cookie flags. Production needs `COOKIE_SECURE=true`.
- `TRUST_PROXY`: number of proxies in front of the app (default `0`), so rate limits see the client IP.

## Accounts
- Passwords: scrypt via `src/services/password.service.js`. Never store, log or return a password or `passwordHash`.
- Sessions: random token in the httpOnly `sid` cookie (path `/api`); the `sessions` collection stores only its SHA-256. Routes that need the user mount `loadUser` (`src/middleware/auth.js`) and use `requireUser`.
- `role` (`member` / `moderator` / `admin`) is there for forum moderation.

## API contract
Whenever you add or change an endpoint, update `../docs/API.md` in the same change: method, path, request body, response, error cases. The frontend session codes against that file.

## Commands
Run from `backend/`. Requires Node >= 20.19 (Mongoose 9).
- `npm install`
- `npm run dev`: run with auto-restart (`node --watch`) on http://localhost:5000
- `npm start`: run without auto-restart
- `npm run seed:brands`: upsert the 8 brands from `scripts/data/brands.js` into `brands` (by slug, safe to re-run; the file is the source of truth)
- `npm run lint`: ESLint (flat config in `eslint.config.js`: `js.configs.recommended` + Node globals). Keep it passing.
- Smoke check: `curl http://localhost:5000/api/health`
- No tests yet.

## Notes
- `Dockerfile` / `.dockerignore` in this folder, if they exist, belong to the devops session.
