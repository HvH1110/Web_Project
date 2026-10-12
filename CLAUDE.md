# Web_Project

A website for looking up official prices and price history of luxury products (Louis Vuitton, Dior, Chanel, Cartier, Van Cleef & Arpels, Rolex, Omega, IWC) in Vietnam, Singapore and Hong Kong. **Read `docs/PRODUCT.md` before starting a feature**: it is the product spec.

The repo is split into four areas. Each area is worked on by its own Claude Code session, running in parallel.

| Area     | Folder      | Stack                                                    |
|----------|-------------|----------------------------------------------------------|
| Frontend | `frontend/` | React (Vite) + Tailwind CSS + shadcn/ui                  |
| Backend  | `backend/`  | Node.js + Express + Mongoose                             |
| Crawler  | `crawler/`  | Node.js + Mongoose, cheerio / Playwright                 |
| DevOps   | `devops/`   | MongoDB Atlas, env config, CI/CD, schedules, deployment  |

Each folder has its own `CLAUDE.md` saying which session owns it and what that session is responsible for.

## Ownership rules
- Only edit files in your own area. Reading other areas is fine.
- If you need a change in another area, don't make it yourself. Tell the user exactly what is needed so they can pass it to the session that owns it.
- `docs/PRODUCT.md` is the product spec. Only change it when the user asks.
- `docs/API.md` is the contract between frontend and backend. The backend session updates it whenever an endpoint is added or changed. The frontend session codes against it, not against backend source.
- `docs/DATA.md` is the contract between crawler and backend: the catalog collections in MongoDB. The crawler session writes those collections and updates the file; the backend only reads them.

## Git: one shared checkout, one branch
All sessions work in the same folder on the same branch, so:
- Only commit when the user asks.
- Stage and commit only your own area, e.g. `git add backend/ && git commit -m "backend: add auth routes" -- backend/`
- Prefix commit messages with the area: `frontend:`, `backend:`, `crawler:`, `devops:`.
- Never run commands that touch the whole tree: `git add -A`, `git add .`, `git stash`, `git reset --hard`, `git checkout -- .`, `git clean`, or switching branches.

## Local dev ports
- Frontend (Vite): http://localhost:5173
- Backend (Express): http://localhost:5000, all routes under `/api`

The user usually runs the dev servers in their own terminals. Check whether a port is already in use before starting a server on it.

## Secrets
- Real secrets live only in `.env` files, which are gitignored. Never commit them and never print their values.
- Each app documents its variables in its own `.env.example`.
