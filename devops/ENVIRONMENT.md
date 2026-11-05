# Environment variables

Every environment variable the project uses, which app reads it, and where its value comes from in each environment.

Maintained by the devops session. **Never write real secret values in this file** or any other tracked file. Real values live only in gitignored `.env` files (local), and in the hosting provider's dashboard or GitHub Actions secrets (production).

## Variables

| Variable        | App      | Secret? | Local (`.env`)                                                        | Production                                                    |
|-----------------|----------|---------|-----------------------------------------------------------------------|---------------------------------------------------------------|
| `MONGODB_URI`   | backend  | **Yes** | Atlas connection string for user `webproject-dev`, database `webproject_dev`. You paste it into `backend/.env` yourself. | Atlas connection string for user `webproject-prod`, database `webproject_prod`. Set on Render when the Blueprint is created. |
| `MONGODB_URI`   | crawler  | **Yes** | The same string as `backend/.env` (user `webproject-dev`, database `webproject_dev`). You paste it into `crawler/.env` yourself. | GitHub Actions repository secret `MONGODB_URI`: user `webproject-crawler`, database `webproject_dev` until step 1 in `DEPLOY.md` moves it to `webproject_prod`. Only `.github/workflows/crawl.yml` and `backfill.yml` read it. |
| `CRAWL_DELAY_MS` | crawler | No | `5000` (the default if unset). Minimum time between two requests to the same site; anything below `3000` is raised to `3000`. | Not set in GitHub Actions, so `5000`. |
| `CRAWL_CONTACT` | crawler | No | Optional, e.g. `https://github.com/HvH1110/Web_Project`. Added to the User-Agent so site owners can reach us. | Set in `crawl.yml` to this repository's URL. |
| `CARTIER_ROTATION_DAYS` | crawler | No | `7` (the default if unset). Each run checks 1/N of Cartier's ~1,700 products per market, so each product comes round every N days. `1` crawls everything in one very long run. | Not set in GitHub Actions, so `7`. |
| `PORT`          | backend  | No      | `5000` (the default if unset)                                         | Set by Render. Don't set it by hand. |
| `NODE_VERSION`  | Render   | No      | Not used                                                              | `24`, the same as CI, in `backend/render.yaml`. |
| `CLIENT_ORIGIN` | backend  | No      | `http://localhost:5173` (the default if unset)                        | `https://maison-prix.vercel.app`, in `backend/render.yaml`. |
| `COOKIE_SECURE` | backend  | No      | `false` (the default if unset)                                        | `true`, in `backend/render.yaml`. |
| `COOKIE_SAME_SITE` | backend | No    | `lax` (the default if unset)                                          | `lax`, in `backend/render.yaml`. Vercel proxies `/api`, so `none` isn't needed. |
| `TRUST_PROXY`   | backend  | No      | `0` (the default if unset)                                            | `10`, in `backend/render.yaml`. See the note below. |
| `UPLOAD_STORAGE` | backend | No      | `local` (the default if unset)                                        | `s3`, in `backend/render.yaml`. Render's disk doesn't survive restarts. |
| `UPLOADS_DIR`   | backend  | No      | `uploads` (the default if unset)                                      | Not used with `s3`. |
| `UPLOADS_PUBLIC_URL` | backend | No  | Empty: defaults to `http://localhost:<PORT>/api/uploads`              | The bucket's `https://pub-<id>.r2.dev` address, with no trailing slash. Set on Render. |
| `S3_ENDPOINT`   | backend  | No      | Empty                                                                 | `https://<account-id>.r2.cloudflarestorage.com`. Set on Render. |
| `S3_REGION`     | backend  | No      | `auto`                                                                | `auto`, in `backend/render.yaml`. |
| `S3_BUCKET`     | backend  | No      | Empty                                                                 | `maison-prix-forum`, in `backend/render.yaml`. |
| `S3_ACCESS_KEY_ID` | backend | **Yes** | Empty                                                               | R2 API token, limited to that bucket. Set on Render. |
| `S3_SECRET_ACCESS_KEY` | backend | **Yes** | Empty                                                           | R2 API token, shown once. Set on Render. |
| `VITE_API_URL`  | frontend | No      | `http://localhost:5000/api`                                           | `/api`, set by `buildCommand` in `frontend/vercel.json`. Nothing to set on Vercel. |

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
- **`CLIENT_ORIGIN`**: used for CORS and for the Origin check on every non-GET request. It must match the frontend's origin exactly: scheme, host and port, with no trailing slash. Requests from any other address, including Vercel previews, get a 403.
- **`COOKIE_SAME_SITE`**: stays `lax` in production because the browser sees one site. Don't switch to `none`: the tests in `DEPLOY.md` show login silently failing in browsers that block third-party cookies.
- **`TRUST_PROXY`**: in production this is deliberately higher than the real number of proxies. Vercel overwrites `X-Forwarded-For` with the visitor's IP, so the leftmost address is the visitor, however many proxies Render adds. Tested locally: a value that is too low puts every visitor in one rate-limit bucket, so one person's attempts lock out everyone. A high value also keeps working if Render changes its proxies. Check 8 in `DEPLOY.md` confirms it on the real services.
- **`VITE_API_URL`**: anything prefixed `VITE_` is **embedded in the built JavaScript and visible to every visitor**, so never put a secret in a frontend variable. Vite reads it at startup and build time, so restart `npm run dev` or rebuild after changing it. To build for production locally from Git Bash, use `MSYS_NO_PATHCONV=1 VITE_API_URL=/api npm run build`: without the first part, Git Bash turns `/api` into a Windows path.

### GitHub Actions

- **CI** (`.github/workflows/ci.yml`) sets **no variables and uses no secrets**. The frontend builds with the default `VITE_API_URL`. The backend smoke test runs with only `PORT=5000` and no `MONGODB_URI`, so `/api/health` reports `db: "disconnected"` and CI never touches Atlas. The crawler job installs, lints and imports every module. It never crawls a site.
- **Daily crawl** (`.github/workflows/crawl.yml`) and **Nightly backfill** (`.github/workflows/backfill.yml`) are the only workflows that get a secret: `MONGODB_URI`, passed only to their `Check database` and `Crawl` or `Backfill` steps. GitHub masks the value in logs and never gives it to workflows started by pull requests from forks.

## Where the files are

| File                    | Tracked? | Contents                                    | Owner            |
|-------------------------|----------|---------------------------------------------|------------------|
| `backend/.env`          | No       | Real local values                           | You              |
| `backend/.env.example`  | Yes      | Variable names and safe defaults/placeholders | Backend session  |
| `frontend/.env`         | No       | Real local values                           | You              |
| `frontend/.env.example` | Yes      | Variable names and safe defaults            | Frontend session |
| `crawler/.env`          | No       | Real local values                           | You              |
| `crawler/.env.example`  | Yes      | Variable names and safe defaults/placeholders | Crawler session |
| GitHub secret `MONGODB_URI` | n/a (stored by GitHub) | Crawler connection string for Actions | You (repo Settings) |
| `backend/render.yaml`   | Yes      | Render service and its non-secret values    | Devops session   |
| `frontend/vercel.json`  | Yes      | Vercel build, `/api` proxy and page fallback | Devops session  |
| Render's Environment page | n/a (stored by Render) | Backend's production secrets | You              |

The root `.gitignore` ignores `.env`, `.env.*` and `*.env` (e.g. `atlas-credentials.env`) but keeps `.env.example`. Even so, keep credential files outside the project folder.

## MongoDB Atlas

| Item           | Value                                                               |
|----------------|---------------------------------------------------------------------|
| Cluster        | `web-project`, Free tier (M0), AWS **Singapore (ap-southeast-1)**    |
| Database users | `webproject-dev`, role `readWriteAnyDatabase`, used for local development. `webproject-crawler` (set up 2026-10-21, see `DEPLOY.md`), `readWrite` on `webproject_dev` only, used only by the GitHub Actions crawl and backfill. `webproject-prod` (**to create**, see `DEPLOY.md`), `readWrite` on `webproject_prod` only, used only by the backend on Render. |
| Databases      | `webproject_dev` (local development, and the daily crawl and nightly backfill until production exists). `webproject_prod` (**to create**, see `DEPLOY.md`). |
| Network access | The current IP of the development machine (added automatically at setup). `0.0.0.0/0` for GitHub Actions and Render (added 2026-10-21, see `DEPLOY.md`). |

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

### Production

Hosting is chosen: Vercel, Render and R2 (see `DEPLOY.md`). Production stays on the free cluster:
- A separate database `webproject_prod` and a separate user `webproject-prod` with **Specific Privileges** `readWrite` on `webproject_prod` only. Only the backend on Render uses it.
- The catalog is copied once from `webproject_dev`, and the daily crawl moves to production: `webproject-crawler` gets `readWrite` on `webproject_prod`, and the GitHub secret changes its database name.
- Then `webproject_dev` keeps only a small sample catalog (see the storage budget), and `webproject-dev` is restricted to `readWrite` on `webproject_dev`, so development credentials can't touch production data.
- Network access: Render's free plan has no fixed outbound IP, so it needs the same `0.0.0.0/0` entry as GitHub Actions. That leaves the strong passwords and limited users as the protection.
- The backend runs in Singapore, the same region as the cluster.

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
| Production: every POST answers 403 `Cross-origin request refused` | `CLIENT_ORIGIN` on Render doesn't match the address in the browser. Use the production address, not a Vercel preview. |
| Production: registering works, but the person stays logged out | The site is calling Render directly instead of through `/api`. Check that the build used `VITE_API_URL=/api`. |
| Production: `503 Database unavailable` for a few seconds after a quiet spell | The backend woke up and is still connecting to Atlas. See backend request 1 in `DEPLOY.md`. |
| Production: `/api` answers Vercel's 404 or 502 | The Render address in `frontend/vercel.json` is wrong, or the backend isn't running. |
| Production: uploads fail with 413 | Vercel's limit applies to the proxy. See check 6 in `DEPLOY.md`. |
| Production: uploads fail with 501 `NotImplemented` | R2 refuses the SDK's checksum header. See backend request 3 in `DEPLOY.md`. |
| Production: forum images vanish after a restart | `UPLOAD_STORAGE` isn't `s3`. |
| Everyone gets 429 `Too many attempts` at once | `TRUST_PROXY` is too low. See the note on it above. |

## Adding a new variable

1. Add it to the app's `.env.example` (backend, frontend or crawler session).
2. Ask the devops session to add a row here. If the crawler needs it in GitHub Actions, the devops session also passes it in `crawl.yml` (a repository secret if it's secret, otherwise a repository variable).
3. Set it in your local `.env`. For production, non-secret values go in `backend/render.yaml`; secrets go on Render's Environment page or in GitHub's settings.
