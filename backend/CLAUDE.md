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
- Crawler collections (`products`, `offers`, `price_points`, `fx_rates`, see `../docs/DATA.md`) are read-only here. Define their models with `readOnlySchema` (`src/models/read-only-schema.js`): no auto-created collections or indexes, and any write throws. The backend owns `brands`, `users`, `sessions`, `forum_topics`, `forum_replies` and `uploads`.

## Environment
Real values go in `backend/.env` (gitignored). Document every variable in `backend/.env.example`.
- `PORT`: default `5000`
- `MONGODB_URI`: Atlas connection string. The user pastes it in; never print, log or commit it.
- `CLIENT_ORIGIN`: default `http://localhost:5173`. Also the only origin allowed to send non-GET requests (CSRF check).
- `COOKIE_SECURE` (default `false`), `COOKIE_SAME_SITE` (default `lax`): session cookie flags. Production needs `COOKIE_SECURE=true`.
- `TRUST_PROXY`: number of proxies in front of the app (default `0`), so rate limits see the client IP.
- `UPLOAD_STORAGE`: `local` (default, files in `UPLOADS_DIR`, default `uploads/`, gitignored, served at `/api/uploads`) or `s3` (any S3-compatible bucket: `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`). `UPLOADS_PUBLIC_URL`: base URL of the files (required for `s3`). Never print the S3 keys.

## Accounts
- Passwords: scrypt via `src/services/password.service.js`. Never store, log or return a password or `passwordHash`.
- Sessions: random token in the httpOnly `sid` cookie (path `/api`); the `sessions` collection stores only its SHA-256. Routes that need the user mount `loadUser` (`src/middleware/auth.js`) and use `requireUser`.
- `role` (`member` / `moderator` / `admin`) is there for forum moderation. Set it with `npm run set-role`; there is no API for it.

## Forum
- Everything under `/api/forum` is login-only. Permission rules live in `src/services/forum.service.js` (`editRefusal`, `replyRefusal`, `canDelete`, `visibleFilter`); responses carry the resulting `permissions`, so keep them in one place.
- Text is plain text, cleaned by `src/utils/forum-fields.js`; the frontend renders it as text, never HTML.
- Images: `POST /api/forum/uploads` re-encodes with sharp to WebP (strips EXIF/GPS) via `src/services/uploads.service.js`, then posts attach upload IDs. Files go to `src/services/storage/` (never MongoDB: the free cluster has 512 MB). `server.js` purges unused uploads hourly.
- `replyCount` counts visible replies only: keep it in step when creating, deleting, hiding or unhiding replies.

## API contract
Whenever you add or change an endpoint, update `../docs/API.md` in the same change: method, path, request body, response, error cases. The frontend session codes against that file.

## Commands
Run from `backend/`. Requires Node >= 20.19 (Mongoose 9).
- `npm install`
- `npm run dev`: run with auto-restart (`node --watch`) on http://localhost:5000
- `npm start`: run without auto-restart
- `npm run seed:brands`: upsert the 8 brands from `scripts/data/brands.js` into `brands` (by slug, safe to re-run; the file is the source of truth)
- `npm run set-role -- <email> <member|moderator|admin>`: change a member's role (e.g. make a moderator)
- `npm run lint`: ESLint (flat config in `eslint.config.js`: `js.configs.recommended` + Node globals). Keep it passing.
- Smoke check: `curl http://localhost:5000/api/health`
- No tests yet.

## Notes
- `Dockerfile` / `.dockerignore` in this folder, if they exist, belong to the devops session.
