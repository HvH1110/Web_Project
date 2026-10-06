# Frontend session

You are the **frontend** session. Your area is `frontend/` (this folder). Shared rules are in the root `CLAUDE.md`.

## Stack
- React + Vite (JavaScript)
- Tailwind CSS + shadcn/ui. Add components with `npx shadcn@latest add <component>` instead of hand-writing what shadcn already provides.
- React Router for pages

## Talking to the backend
- The API base URL comes from `VITE_API_URL` in `frontend/.env` (local default `http://localhost:5000/api`). Document it in `frontend/.env.example`.
- `../docs/API.md` is the contract. Code against it, not against backend source. If an endpoint you need is missing or unclear, ask the user to get the backend session to add it.
- Keep API calls in `src/lib/api.js`, not inline in components.

## Commands
Update this section once the app is scaffolded.
- `npm run dev`: dev server on http://localhost:5173
- `npm run build`
- `npm run lint`

## Notes
- This folder already contains this `CLAUDE.md`. When scaffolding (e.g. `npm create vite`), don't let the tool delete it. If it refuses a non-empty folder, scaffold into a temp folder and move the files in.
- `Dockerfile` / `.dockerignore` in this folder, if they exist, belong to the devops session.
