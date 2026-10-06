# Backend session

You are the **backend** session. Your area is `backend/` (this folder) plus `docs/API.md`. Shared rules are in the root `CLAUDE.md`.

## Stack
- Node.js with ES modules (`"type": "module"`) + Express
- MongoDB Atlas via Mongoose
- Config from environment variables (`dotenv`)

## Conventions
- Layout: `src/server.js` (connects DB, starts server), `src/app.js` (Express app), `src/config/db.js`, `src/routes/`, `src/controllers/`, `src/models/`, `src/middleware/`.
- All routes are under `/api`.
- Errors: proper status code with body `{ "error": { "message": "..." } }`, produced by one error-handling middleware.
- CORS: allow the origin in `CLIENT_ORIGIN`.

## Environment
Real values go in `backend/.env` (gitignored). Document every variable in `backend/.env.example`.
- `PORT`: default `5000`
- `MONGODB_URI`: Atlas connection string. The user pastes it in; never print, log or commit it.
- `CLIENT_ORIGIN`: default `http://localhost:5173`

## API contract
Whenever you add or change an endpoint, update `../docs/API.md` in the same change: method, path, request body, response, error cases. The frontend session codes against that file.

## Commands
Update this section once the app is scaffolded.
- `npm run dev`: run with auto-restart on http://localhost:5000
- `npm start`

## Notes
- `Dockerfile` / `.dockerignore` in this folder, if they exist, belong to the devops session.
