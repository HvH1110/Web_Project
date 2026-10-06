# Web_Project

Full-stack web app: React + shadcn/ui frontend, Node.js + Express backend, MongoDB Atlas database.

```
Web_Project/
├── CLAUDE.md        shared rules, loaded by every Claude session
├── docs/API.md      API contract between frontend and backend
├── frontend/        React (Vite) + Tailwind + shadcn/ui    → frontend session
├── backend/         Node.js + Express + Mongoose           → backend session
└── devops/          Atlas, env vars, CI/CD, deployment     → devops session
```

## Working with three Claude Code sessions in parallel

Each session is started inside its own folder. Claude Code loads the `CLAUDE.md` in that folder plus the root `CLAUDE.md`, so each session knows its role, what it owns, and the shared rules.

### 1. Open three terminals and start one session in each

Windows Terminal: open three tabs, or split panes with `Alt+Shift+=` / `Alt+Shift+-`. The VS Code integrated terminal works too.

```powershell
# Terminal 1: frontend
cd C:\DAIHOC\Web_Project\frontend
claude --add-dir ..\docs

# Terminal 2: backend
cd C:\DAIHOC\Web_Project\backend
claude --add-dir ..\docs

# Terminal 3: devops
cd C:\DAIHOC\Web_Project\devops
claude --add-dir ..
```

`--add-dir` gives a session access to a folder outside the one it started in: frontend and backend need `docs/` for the API contract, devops needs the whole repo.

To come back to a session later, run `claude --continue` in the same folder.

### 2. First-time kickoff prompts

**Backend**
```
Set up the Express backend in this folder following CLAUDE.md: package.json with dev and start scripts, Express app with CORS and JSON parsing, Mongoose connection using MONGODB_URI, GET /api/health exactly as described in ../docs/API.md, an error-handling middleware, and .env.example. The server should still start if MONGODB_URI is missing (health then reports db "disconnected"). Fill in the Commands section of CLAUDE.md. No features yet.
```

**Frontend**
```
Set up the frontend in this folder following CLAUDE.md: Vite + React (JavaScript), Tailwind CSS and shadcn/ui following the official shadcn Vite guide, React Router, src/lib/api.js using VITE_API_URL, and .env.example. Make the home page call GET /api/health (see ../docs/API.md) and show the status and db fields in a shadcn Card, with loading and error states. Fill in the Commands section of CLAUDE.md.
```

**DevOps**
```
Walk me through setting up MongoDB Atlas for this project one step at a time: free cluster, database user, network access, and getting the connection string. I will paste the connection string into backend/.env myself. Then create devops/ENVIRONMENT.md documenting every environment variable.
```

Once the frontend and backend are scaffolded, ask devops for CI:
```
Both apps are scaffolded now. Add a GitHub Actions workflow that installs, lints and builds frontend and backend on every push and pull request.
```

### 3. Check that everything is connected

Run the dev servers yourself, in two more terminals:

```powershell
cd C:\DAIHOC\Web_Project\backend;  npm run dev    # http://localhost:5000
cd C:\DAIHOC\Web_Project\frontend; npm run dev    # http://localhost:5173
```

Open http://localhost:5173. The card should show `status: ok` and `db: connected`, which proves frontend → backend → Atlas works.

### Day-to-day rules

- **One area per session.** Sessions only edit their own folder. If one needs something from another (e.g. frontend needs a new endpoint), it tells you, and you pass the request to the right session.
- **The API contract is the hand-off.** Backend updates `docs/API.md` with every endpoint change. Then tell the frontend session: "docs/API.md changed, re-read it".
- **Run dev servers yourself.** Only one process can use port 5000 or 5173, so keep the servers in your own terminals instead of having several sessions start them.
- **Commit per area.** All sessions share one checkout and one branch. Ask a session to commit and it commits only its own folder (`git commit -- backend/`). Never let a session run `git add .`, `git stash` or switch branches.
- **Secrets stay in `.env`.** `backend/.env` and `frontend/.env` are gitignored. Paste the Atlas connection string there yourself, not into a chat.
