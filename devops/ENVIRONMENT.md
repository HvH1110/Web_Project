# Environment variables

Every environment variable the project uses, which app reads it, and where its value comes from in each environment.

Maintained by the devops session. **Never write real secret values in this file** or any other tracked file. Real values live only in gitignored `.env` files (local), and in the hosting provider's dashboard or GitHub Actions secrets (production).

## Variables

| Variable        | App      | Secret? | Local (`.env`)                                                        | Production                                                    |
|-----------------|----------|---------|-----------------------------------------------------------------------|---------------------------------------------------------------|
| `MONGODB_URI`   | backend  | **Yes** | Atlas connection string for user `webproject-dev`, database `webproject_dev`. You paste it into `backend/.env` yourself. | Atlas connection string for a separate production user and database, set in the backend host's dashboard. Host not chosen yet. |
| `MONGODB_URI`   | crawler  | **Yes** | The same string as `backend/.env` (user `webproject-dev`, database `webproject_dev`). You paste it into `crawler/.env` yourself. | GitHub Actions repository secret `MONGODB_URI`: user `webproject-crawler`, database `webproject_dev` for now. Only `.github/workflows/crawl.yml` reads it. Setup in `DEPLOY.md`. |
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
  - The backend and the crawler must never log or print this value.
  - In GitHub Actions there is no `.env` file; the value arrives as a real environment variable. So `npm run crawl` must not require the file: `node --env-file=.env` exits with an error when it is missing, while `node --env-file-if-exists=.env` or `dotenv` work in both places.
- **`PORT`**: the backend must read `process.env.PORT`, because hosts assign their own port.
- **`CLIENT_ORIGIN`**: used for CORS. It must match the frontend's origin exactly: scheme, host and port, with no trailing slash.
- **`VITE_API_URL`**: anything prefixed `VITE_` is **embedded in the built JavaScript and visible to every visitor**, so never put a secret in a frontend variable. Vite reads it at startup and build time, so restart `npm run dev` or rebuild after changing it.

### GitHub Actions

- **CI** (`.github/workflows/ci.yml`) sets **no variables and uses no secrets**. The frontend builds with the default `VITE_API_URL`. The backend smoke test runs with only `PORT=5000` and no `MONGODB_URI`, so `/api/health` reports `db: "disconnected"` and CI never touches Atlas.
- **Daily crawl** (`.github/workflows/crawl.yml`) is the only workflow that gets a secret: `MONGODB_URI`, passed only to the step that runs `npm run crawl`. GitHub masks the value in logs and never gives it to workflows started by pull requests from forks.

## Where the files are

| File                    | Tracked? | Contents                                    | Owner            |
|-------------------------|----------|---------------------------------------------|------------------|
| `backend/.env`          | No       | Real local values                           | You              |
| `backend/.env.example`  | Yes      | Variable names and safe defaults/placeholders | Backend session  |
| `frontend/.env`         | No       | Real local values                           | You              |
| `frontend/.env.example` | Yes      | Variable names and safe defaults            | Frontend session |
| `crawler/.env`          | No       | Real local values                           | You              |
| `crawler/.env.example`  | Yes      | Variable names and placeholders (not created yet) | Crawler session |
| GitHub secret `MONGODB_URI` | n/a (stored by GitHub) | Crawler connection string for Actions | You (repo Settings) |

The root `.gitignore` ignores `.env`, `.env.*` and `*.env` (e.g. `atlas-credentials.env`) but keeps `.env.example`. Even so, keep credential files outside the project folder.

## MongoDB Atlas

| Item           | Value                                                               |
|----------------|---------------------------------------------------------------------|
| Cluster        | `web-project`, Free tier (M0), AWS **Singapore (ap-southeast-1)**    |
| Database users | `webproject-dev`, role `readWriteAnyDatabase`, used for local development. `webproject-crawler` (**to create**, see `DEPLOY.md`), `readWrite` on `webproject_dev` only, used only by the GitHub Actions crawl. |
| Databases      | `webproject_dev` (local development, and the daily crawl until production exists) |
| Network access | The current IP of the development machine (added automatically at setup). `0.0.0.0/0` for GitHub Actions (**to add**, see `DEPLOY.md`). |

Atlas website access is through your Atlas account login. Database users are only for apps connecting to the cluster, so no database user has admin rights.

### Storage budget (free tier: 512 MB)

The 512 MB is a hard limit: when it is reached, every write fails. It counts the **uncompressed** BSON of every document in **every database on the cluster**, plus all indexes. Disk compression doesn't help, and dev and prod share the same 512 MB.

Estimate for the `docs/DATA.md` design, measured with real BSON sizes (including indexes, a product is about 3.8 KB, an offer 0.5 KB and a price point 0.3 KB):

| Scenario | After 1 year | After 5 years |
|---|---|---|
| Realistic: 4,000 products, 8,000 offers, 3 price changes per offer per year, Wayback history for a quarter of offers | ~35 MB | ~60 MB |
| Stress: 15,000 products, 37,500 offers, 4 changes per year, 10 Wayback points for **every** offer | ~270 MB | ~430 MB |

So the design fits, because it stores price **changes** and image **URLs**. The rules that keep it that way:
- **One full catalog on the cluster.** Two full copies (e.g. `webproject_dev` and `webproject_prod`) would push the stress case past 512 MB.
- **A price point only when the price changes, Wayback included.** One point per offer per day would add 0.8 to 3.6 GB a year and fill the cluster within months.
- **No files in MongoDB**: no images, raw HTML or JSON dumps, and no forum uploads (GridFS). 4,000 products with 3 images each would be about 1.7 GB. Files go to a storage service.
- To check usage, open the cluster's **Data Explorer** (Browse Collections) in Atlas. The count is each database's logical data size plus its index size, added up over all databases. In `mongosh`, that is `dataSize + indexSize` from `db.stats()` for each database.

The daily crawl also keeps the cluster awake: Atlas pauses free clusters after 30 days with no connections.

### Production (decide when choosing hosting, see `DEPLOY.md`)

The plan is to stay on the free cluster:
- A separate database `webproject_prod` and a separate user `webproject-prod` with **Specific Privileges** `readWrite` on `webproject_prod` only.
- At the same time, restrict `webproject-dev` to `readWrite` on `webproject_dev` so development credentials can't touch production data.
- Move the daily crawl to production: change `webproject-crawler`'s privilege to `readWrite` on `webproject_prod`, then update the GitHub secret with the new database name. After that, keep only a small sample catalog in `webproject_dev` (see the storage budget).
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
| Daily crawl fails with `Repository secret MONGODB_URI is not set` | Add the secret: repo **Settings → Secrets and variables → Actions**. See `DEPLOY.md`. |
| Daily crawl fails with `MongoServerSelectionError` / timeout, but local works | `0.0.0.0/0` is missing from Atlas **Network Access**, or is still `Pending`. GitHub runner IPs change every run. |
| Writes fail with `over your space quota` | The 512 MB is full. See the storage budget above. |

## Adding a new variable

1. Add it to the app's `.env.example` (backend, frontend or crawler session).
2. Ask the devops session to add a row here. If the crawler needs it in GitHub Actions, the devops session also passes it in `crawl.yml` (a repository secret if it's secret, otherwise a repository variable).
3. Set it in your local `.env`, and in the hosting dashboard or GitHub settings once production exists.
