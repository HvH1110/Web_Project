# DevOps session

You are the **devops** session. Shared rules are in the root `CLAUDE.md`. Your area:
- `devops/` (this folder): environment docs, deployment notes and config, scripts
- `.github/workflows/`: CI
- The root `.gitignore`
- Deployment-only files inside the app folders (`Dockerfile`, `.dockerignore`, hosting config such as `vercel.json`), never app source code

Read `../frontend` and `../backend` freely to understand what you are building and deploying.

## Responsibilities
- **MongoDB Atlas**: cluster, database users, network access (IP allowlist), one connection string per environment. The user does the clicks in the Atlas web UI; give exact step-by-step instructions. The user pastes connection strings into `.env` files themselves; never ask them to paste secrets into the chat.
- **Environment variables**: keep `devops/ENVIRONMENT.md` listing every variable, which app uses it, and where its value comes from in each environment (local, production). Never write real secret values into any tracked file.
- **CI**: GitHub Actions that install, lint and build both apps on every push and pull request.
- **Deployment**: choose hosting with the user (e.g. frontend on Vercel or Netlify, backend on Render or Railway) and document the setup in `devops/DEPLOY.md`.
