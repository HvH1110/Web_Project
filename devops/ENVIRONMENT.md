# Environment variables

Every environment variable the project uses, which app reads it, and where its value comes from in each environment.

Maintained by the devops session. **Never write real secret values in this file** or any other tracked file. Real values live only in gitignored `.env` files (local) and in the hosting provider's dashboard (production).

## Variables

| Variable        | App      | Secret? | Local (`.env`)                                                        | Production                                                    |
|-----------------|----------|---------|-----------------------------------------------------------------------|---------------------------------------------------------------|
| `MONGODB_URI`   | backend  | **Yes** | Atlas connection string for user `webproject-dev`, database `webproject_dev`. You paste it into `backend/.env` yourself. | Atlas connection string for a separate production user and database, set in the backend host's dashboard. Host not chosen yet. |
| `PORT`          | backend  | No      | `5000` (the default if unset)                                         | Usually injected by the host (Render and Railway both set it). Don't set it by hand unless the host asks you to. |
| `CLIENT_ORIGIN` | backend  | No      | `http://localhost:5173` (the default if unset)                        | The deployed frontend URL, e.g. `https://<app>.vercel.app`     |
| `VITE_API_URL`  | frontend | No      | `http://localhost:5000/api`                                           | The deployed backend URL plus `/api`                           |

### Notes per variable

- **`MONGODB_URI`**: format, with placeholders only:
  ```
  mongodb+srv://<user>:<password>@web-project.<id>.mongodb.net/<database>?retryWrites=true&w=majority&appName=web-project
  ```
  - Replace `<password>` including the angle brackets.
  - The database name goes between `.mongodb.net/` and `?`. Without it, Mongoose silently uses a database called `test`.
  - If a password contains `@ : / ? # % [ ]`, those characters must be percent-encoded. Atlas's auto-generated passwords avoid them.
  - The backend must never log or print this value.
- **`PORT`**: the backend must read `process.env.PORT`, because hosts assign their own port.
- **`CLIENT_ORIGIN`**: used for CORS. It must match the frontend's origin exactly: scheme, host and port, with no trailing slash.
- **`VITE_API_URL`**: anything prefixed `VITE_` is **embedded in the built JavaScript and visible to every visitor**, so never put a secret in a frontend variable. Vite reads it at startup and build time, so restart `npm run dev` or rebuild after changing it.

### CI (GitHub Actions)

`.github/workflows/ci.yml` sets **no variables and uses no secrets**. The frontend builds with the default `VITE_API_URL`. The backend smoke test runs with only `PORT=5000` and no `MONGODB_URI`, so `/api/health` reports `db: "disconnected"` and CI never touches Atlas.

## Where the files are

| File                    | Tracked? | Contents                                    | Owner            |
|-------------------------|----------|---------------------------------------------|------------------|
| `backend/.env`          | No       | Real local values                           | You              |
| `backend/.env.example`  | Yes      | Variable names and safe defaults/placeholders | Backend session  |
| `frontend/.env`         | No       | Real local values                           | You              |
| `frontend/.env.example` | Yes      | Variable names and safe defaults            | Frontend session |

The root `.gitignore` ignores `.env`, `.env.*` and `*.env` (e.g. `atlas-credentials.env`) but keeps `.env.example`. Even so, keep credential files outside the project folder.

## MongoDB Atlas

| Item           | Value                                                               |
|----------------|---------------------------------------------------------------------|
| Cluster        | `web-project`, Free tier (M0), AWS **Singapore (ap-southeast-1)**    |
| Database users | `webproject-dev`, role `readWriteAnyDatabase`, used for local development |
| Databases      | `webproject_dev` (local development)                                |
| Network access | The current IP of the development machine (added automatically at setup) |

Atlas website access is through your Atlas account login. Database users are only for apps connecting to the cluster, so no database user has admin rights.

### Production (decide when choosing hosting, see `DEPLOY.md`)

The plan is to stay on the free cluster:
- A separate database `webproject_prod` and a separate user `webproject-prod` with **Specific Privileges** `readWrite` on `webproject_prod` only.
- At the same time, restrict `webproject-dev` to `readWrite` on `webproject_dev` so development credentials can't touch production data.
- Network access depends on the backend host. Hosts without fixed outbound IPs (e.g. Render's free tier) need `0.0.0.0/0` on the allowlist, which leaves the strong password as the only protection.
- Put the backend host in Singapore too, close to the cluster.

## Troubleshooting

| Symptom | Likely cause and fix |
|---------|----------------------|
| `/api/health` shows `db: "disconnected"`, or `MongoServerSelectionError` / timeout | Your IP changed (new Wi-Fi or network). In Atlas, go to **Network Access** and click **Add Current IP Address**. |
| `bad auth : authentication failed` | Wrong password, the `<db_password>` placeholder is still in the string, or the password has special characters that aren't encoded. |
| Data shows up in a database called `test` | The database name is missing from `MONGODB_URI`. |
| CORS error in the browser console | `CLIENT_ORIGIN` doesn't exactly match the frontend URL. |
| Frontend still calls the old API URL | Restart `npm run dev` or rebuild after changing `VITE_API_URL`. |

## Adding a new variable

1. Add it to the app's `.env.example` (backend or frontend session).
2. Ask the devops session to add a row here.
3. Set it in your local `.env`, and in the hosting dashboard once production exists.
