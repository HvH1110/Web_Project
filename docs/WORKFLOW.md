# Working with four Claude Code sessions

This project is built with four Claude Code sessions running in parallel, one per area. Each session is started inside its own folder. Claude Code loads the `CLAUDE.md` in that folder plus the root `CLAUDE.md`, so each session knows its role, what it owns, and the shared rules.

## Starting the sessions

Windows Terminal: open four tabs, or split panes with `Alt+Shift+=` / `Alt+Shift+-`. The VS Code integrated terminal works too.

```powershell
# Terminal 1: frontend
cd C:\DAIHOC\Web_Project\frontend
claude --add-dir ..\docs

# Terminal 2: backend
cd C:\DAIHOC\Web_Project\backend
claude --add-dir ..\docs

# Terminal 3: crawler
cd C:\DAIHOC\Web_Project\crawler
claude --add-dir ..\docs

# Terminal 4: devops
cd C:\DAIHOC\Web_Project\devops
claude --add-dir ..
```

`--add-dir` gives a session access to a folder outside the one it started in: frontend, backend and crawler need `docs/` for the spec and contracts, devops needs the whole repo.

To come back to a session later, add `--continue` to the same command, in the same folder.

## Day-to-day rules

- **One area per session.** Sessions only edit their own folder. If one needs something from another (e.g. frontend needs a new endpoint), it says so, and the request goes to the right session.
- **The contracts are the hand-off.** Backend updates `docs/API.md` with every endpoint change, and crawler updates `docs/DATA.md` with every data change.
- **Run dev servers yourself.** Only one process can use port 5000 or 5173, so keep the servers in your own terminals instead of having several sessions start them.
- **Commit per area.** All sessions share one checkout and one branch. Ask a session to commit and it commits only its own folder (`git commit -- backend/`). Never let a session run `git add .`, `git stash` or switch branches.
- **Secrets stay in `.env`.** The `.env` files are gitignored. Paste the Atlas connection string there yourself, not into a chat.
