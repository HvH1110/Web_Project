# Deployment

Maintained by the devops session. Variables and Atlas details are in `ENVIRONMENT.md`.

| Part | Service | Config | Address |
|---|---|---|---|
| Frontend | Vercel (Hobby, free) | `frontend/vercel.json` | `https://maison-prix.vercel.app` |
| Backend | Render (free web service, Singapore) | `backend/render.yaml` | `https://maison-prix-api.onrender.com` |
| Forum images | Cloudflare R2 (free tier) | bucket `maison-prix-forum` | `https://pub-<id>.r2.dev` |
| Database | MongoDB Atlas (M0, Singapore) | `ENVIRONMENT.md` | database `webproject_prod` |
| Daily crawl | GitHub Actions | `.github/workflows/crawl.yml` | see "Daily crawl" below |
| Nightly backfill | GitHub Actions | `.github/workflows/backfill.yml` | see "Nightly backfill" below |

Browsers only ever talk to `maison-prix.vercel.app` (and R2 for images). Vercel forwards `/api/*` to Render.

**Status:** the config files are written, and nothing is deployed yet. The setup steps below are yours to do.

## Why `/api` goes through Vercel

`vercel.app` and `onrender.com` are different sites, and the backend logs people in with an httpOnly cookie. There were two ways to make that work. **We use the proxy.**

| | Proxy `/api` through Vercel (chosen) | Cross-site cookie (`COOKIE_SAME_SITE=none`) |
|---|---|---|
| What the browser sees | One site, so the cookie is first-party | The cookie belongs to another site, so it is third-party |
| Blocked by browser privacy settings | No | Yes (see the results below) |
| Code changes | None: `VITE_API_URL=/api` works as is | None |
| Vercel usage | API traffic counts against Vercel's free limits | None |
| Extra limits | 120 s per request; the upload size limit is unconfirmed (check 6 below) | None |
| CSRF protection | The cookie is `SameSite=Lax` and the Origin check still runs | Only the Origin check, because `SameSite=None` allows cross-site sending |

Real browsers ran the real frontend and backend on this machine, on the real hostnames (resolved locally, so `vercel.app` and `onrender.com` counted as separate sites). Each one registered through the form, reloaded, and logged out:

| Browser setup | Proxy | Cross-site cookie |
|---|---|---|
| Chromium, default settings | Works | Works |
| Chromium, third-party cookies blocked | Works | **Logged out straight away** |
| Firefox, default settings | Works | Works |
| Firefox, third-party cookies blocked | Works | **Logged out straight away** |
| WebKit (Playwright's build, not real Safari) | Works | **Logged out straight away** |

The cross-site failure is silent: registering returns 201, then the person is simply not logged in. WebKit's own documentation says Safari blocks cross-site cookies by default, which would include iPhones.

This local test did not involve Vercel or Render themselves, so "Check that it works" below confirms it on the real services.

The same test also passed: refreshing deep links, a backend 404 staying a JSON 404, a duplicate email getting 409, a 9.2 MB image uploading through the proxy, and a POST from another origin getting 403.

A custom domain would remove the need for the proxy (`www.example.com` and `api.example.com` are the same site), and is worth revisiting in the launch phase.

## What doesn't fit on the free plans

Checked on 2026-11-04. These plans change, so re-check before relying on them.

| Limit | What it means for us | What to do |
|---|---|---|
| **Render sleeps after 15 minutes idle**, and takes about a minute to wake | The first visitor after a quiet spell waits about a minute. Vercel's 120 s limit is enough for that. | Accept it. For a demo, open the site a couple of minutes early. |
| **Render: 5 GB outbound a month** on Hobby workspaces. With no payment method on file, services stop until the next month. | **The tightest limit.** All API responses count: 5 GB is about 50,000 responses of 100 KB. | Watch it on Render's Metrics page. The backend compresses API responses, which helps. |
| **Render's disk is wiped** on every restart and spin-down | Local uploads would vanish, so production uses R2 | Set up by `backend/render.yaml` |
| Render: 750 free hours a month, shared by the workspace, 512 MB RAM | One service fits. A worst-case upload peaked at 200 MB here. Render doesn't publish the free plan's CPU share, so image processing may be slower. | Keep one free service in the workspace |
| **Render: restarts lose in-memory state** | Rate-limit counters reset on each spin-down. | Accept it for this project |
| **Vercel Hobby: non-commercial use only** | Fine as a university project. Ads, paid links or payments would break the rules. | Keep the site non-commercial |
| Vercel Hobby: 100 GB transfer, 10 GB origin transfer, 1,000,000 CDN requests a month | Vercel's pages don't say whether proxied traffic counts toward origin transfer, so assume it does. Going over usually pauses the feature for up to 30 days. | Watch the Usage page |
| **Vercel: upload size through a proxy is unconfirmed.** Its documented 4.5 MB limit is for Functions, and nothing says whether it applies to rewrites. | Images between 4.5 and 10 MB may fail | Check 6 below |
| **Vercel previews:** POST requests are refused | A preview's address isn't `CLIENT_ORIGIN`, so logging in there gets a 403. Reading works. | Test logins on the production address only. It also keeps previews from changing production data. |
| **R2 asks for a payment method**, according to several recent guides, even on the free tier. Cloudflare's pricing page doesn't say. | You may need a card or PayPal on file. Free usage (10 GB, 1 million writes, 10 million reads a month, free egress) isn't charged. | Your decision. If it's a problem, tell the devops session: the backend works with any S3-compatible storage. |
| **R2's `r2.dev` address** is rate-limited, without caching, and "intended for non-production traffic" | Fine for a small members-only forum. Could be slow or limited if the forum gets busy. | Connect a custom domain in the launch phase. Image URLs are built when read, so changing `UPLOADS_PUBLIC_URL` updates old posts too. |
| **Atlas: 512 MB shared** by dev and production | Only one full catalog fits safely | Step 1 and step 6 below |

**Keeping Render awake:** an uptime monitor pinging `https://maison-prix-api.onrender.com/api/health` every 14 minutes would stop the sleeping. 750 hours covers one service all month if nothing else in the workspace is awake. Render's docs neither offer nor forbid this. I'd leave it off and only use it around a demo.

**Direct access to Render:** `onrender.com` stays public. Someone calling it directly can fake `X-Forwarded-For` and dodge the per-IP limits. The per-email login limit, the per-member forum limits and the Origin check still apply. Step 7 below closes this with a secret header from Vercel.

## Backend and frontend changes needed

None are outstanding. All five requests made here are in the code as of 2026-11-05, but none has run on Render, Vercel or R2 yet, so checks 5 and 7 below are their first real test:
- **Backend:** waits for the database after a wake-up instead of answering 503; purges unused uploads at startup; turns off the SDK checksums R2 may refuse; compresses API responses.
- **Frontend:** treats a non-JSON 2xx response, such as Render's loading page, as an error instead of an empty result.

## Setup

You create the accounts and paste the secrets. Never paste a password, key or connection string into a chat or a tracked file.

Do step 1 only after the first full crawl has finished, with no crawl running. Steps 2 to 4 can happen any time before that, but the site has no catalog until step 1 is done.

### Step 1: Production database

1. **Install the [MongoDB Database Tools](https://www.mongodb.com/try/download/database-tools)**, if `mongodump --version` doesn't work.
2. **Create the backend's user.** In Atlas, under **Security**, open **Database Access** (newer layout: **Database & Network Access → Database Users**). Click **Add New Database User**.
   - Username `webproject-prod`, **Autogenerate Secure Password**, then **Copy**. Keep it in a password manager for step 3 of Render.
   - **Specific Privileges → Add Specific Privilege**: role `readWrite`, database `webproject_prod`, collection empty. Click **Add User**.
3. **Check there's room.** The crawl log's `Check database` step shows how big `webproject_dev` is, or see **Data Explorer**. Copying needs that much free again. If it's over about 240 MB, tell the devops session before copying.
4. **Copy the catalog** to `webproject_prod`, leaving out development accounts and forum posts. In PowerShell, in your own terminal rather than a Claude session:
   ```powershell
   # The webproject-dev connection string from backend/.env (it ends in /webproject_dev?...)
   $env:DEV_URI = Read-Host "webproject-dev connection string"
   $rootUri = $env:DEV_URI -replace '/webproject_dev\b', '/'

   mongodump "--uri=$env:DEV_URI" --excludeCollection=users --excludeCollection=sessions --excludeCollection=forum_topics --excludeCollection=forum_replies --excludeCollection=uploads "--archive=$HOME\catalog.archive" --gzip

   mongorestore "--uri=$rootUri" "--archive=$HOME\catalog.archive" --gzip "--nsInclude=webproject_dev.*" "--nsFrom=webproject_dev.*" "--nsTo=webproject_prod.*"

   Remove-Item Env:DEV_URI; $rootUri = $null
   ```
   Tested on a throwaway local database, not on Atlas: collections and indexes arrived, text search worked, and no user or forum data was copied. In Atlas **Data Explorer**, check that `webproject_prod` has `products`, `offers`, `price_points`, `fx_rates` and `brands`.
5. **Move the daily crawl and nightly backfill to production.** Both use the same secret, and neither workflow file changes. Do steps 4 and 5 together while neither is running, because anything written after the copy stays in development. Between 06:00 and 19:00 UTC is clear of both schedules; check the **Actions** tab for manual runs.
   - In **Database Access**, edit `webproject-crawler`: change its privilege to `readWrite` on `webproject_prod`.
   - In its connection string, change the database name to `webproject_prod`. Update the [`MONGODB_URI` secret](https://github.com/HvH1110/Web_Project/settings/secrets/actions).
   - Run **Actions → Daily crawl → Run workflow** with **check only** ticked. The log should say `Connected to database "webproject_prod"`.
6. **Local history backfill:** the nightly workflow now covers this, so you only need a local run for extra progress. `npm run backfill` uses `crawler/.env`, which points at development. From now on, run it against production by setting the variable just for that terminal (a real variable wins over `.env`). Don't run it during the nightly backfill: nothing stops the two from overlapping, and together they would double the load on web.archive.org.
   ```powershell
   $env:MONGODB_URI = Read-Host "webproject-crawler connection string"
   npm run backfill
   Remove-Item Env:MONGODB_URI
   ```

Network Access needs no change: `0.0.0.0/0` is already there, and Render's free plan has no fixed IP either.

### Step 2: Cloudflare R2

1. In the Cloudflare dashboard, open **R2 Object Storage**. Add a payment method if it asks.
2. **Create bucket**: name `maison-prix-forum`, location hint **Asia-Pacific**, storage class **Standard** (the free tier doesn't cover the other class).
3. In the bucket's **Settings**, under **Public Development URL**, click **Enable** and type `allow`. Keep the `https://pub-….r2.dev` address for step 3.
4. Back on the R2 page, open **Manage API Tokens → Create API Token**. Permission **Object Read & Write**, applied to **only** `maison-prix-forum`. Keep the **Access Key ID**, the **Secret Access Key** (shown once) and the **S3 endpoint** (`https://<account-id>.r2.cloudflarestorage.com`) for step 3.

### Step 3: Render

1. Sign up at Render with GitHub, and allow access to `HvH1110/Web_Project`.
2. Click **New → Blueprint** and pick the repo. Set **Blueprint Path** to `backend/render.yaml`.
3. Render asks for the values marked `sync: false`:

   | Variable | Value |
   |---|---|
   | `MONGODB_URI` | The `webproject-prod` connection string, with `webproject_prod` as the database |
   | `S3_ENDPOINT` | R2's S3 endpoint |
   | `S3_ACCESS_KEY_ID` | R2's Access Key ID |
   | `S3_SECRET_ACCESS_KEY` | R2's Secret Access Key |
   | `UPLOADS_PUBLIC_URL` | The `https://pub-….r2.dev` address, with no trailing slash |

4. Click **Apply**, and wait for the first deploy.
5. Open `https://maison-prix-api.onrender.com/api/health`. It should show `"status":"ok","db":"connected"`.

Later deploys run on their own when a commit changing `backend/` passes CI.

### Step 4: Vercel

1. Sign up at Vercel with GitHub, on the **Hobby** plan. Click **Add New → Project** and import `HvH1110/Web_Project`.
2. Set **Project Name** to `maison-prix` and **Root Directory** to `frontend`. Leave everything else as is: no environment variables are needed, because `vercel.json` sets `VITE_API_URL=/api` for the build.
3. Click **Deploy**.
4. In the project's **Settings → Git**, turn on skipping deployments when nothing changed in the root directory, so other areas' commits don't use up deployments.

**If you get different addresses** (the name may be taken by the time you do this):
- Render address differs: change `destination` in `frontend/vercel.json`.
- Vercel address differs: change `CLIENT_ORIGIN` in `backend/render.yaml`.

Then commit and push. `CLIENT_ORIGIN` must match the address people use exactly. A POST from any other address gets a 403.

### Step 5: Check that it works

1. **Proxy:** `https://maison-prix.vercel.app/api/health` shows `"db":"connected"`.
2. **Pages:** open `https://maison-prix.vercel.app/community` directly and refresh. The site should load, not a Vercel 404.
3. **Login:** register, refresh, and stay logged in. In the browser's developer tools, the `sid` cookie should be on `maison-prix.vercel.app`. **Try it on an iPhone too**, since real Safari wasn't part of the local test.
4. **No shared caching:** run `curl.exe -sI https://maison-prix.vercel.app/api/me`. `x-vercel-cache` should not say `HIT`.
5. **Small image:** post a forum image under 1 MB. It should appear, with an address on `r2.dev`. A 501 or `NotImplemented` in Render's logs means R2 refused the upload: ask the backend session to check the checksum settings in `storage/s3.js`.
6. **Large image:** post a JPEG between 5 and 10 MB. If it fails with 413, Vercel's limit applies to the proxy. Then ask the backend session to lower `MAX_UPLOAD_MB` to 4, and the frontend session to shrink images in the browser before upload.
7. **Waking up:** leave the site idle for 20 minutes, then run this from PowerShell:
   ```powershell
   curl.exe -s -i -m 130 -H "Accept: application/json" https://maison-prix.vercel.app/api/brands
   ```
   Expect JSON within about a minute. A 503 means the backend's wait for the database isn't working. HTML means the loading page got through. Report either one to the backend or frontend session.
8. **Rate limits see the real visitor:** this sends 11 empty sign-ups, each with a different fake IP. Expect the last ones to answer 429 (10 are allowed per hour):
   ```powershell
   1..11 | % { curl.exe -s -o NUL -w "%{http_code} " -X POST -H "Content-Type: application/json" -H "X-Forwarded-For: 203.0.113.$_" -d "{}" https://maison-prix.vercel.app/api/auth/register }
   ```
   All 400s would mean the fake IP got through. Then, from a phone on mobile data, register a test account: that should succeed, showing that other visitors aren't affected. Your own network stays limited for an hour, or until Render next restarts.

### Step 6: Finish up

1. **Make yourself an admin.** After registering on the live site, run this from `backend/`:
   ```powershell
   $env:MONGODB_URI = Read-Host "webproject-prod connection string"
   npm run set-role -- <your-email> admin
   Remove-Item Env:MONGODB_URI
   ```
2. **Free the space.** Once the live site shows the catalog, go to Atlas **Data Explorer**, open `webproject_dev`, and drop `products`, `offers`, `price_points`, `fx_rates`, `wayback_index` and `wayback_snapshots`. This cannot be undone, so only do it after checking `webproject_prod`. Delete `catalog.archive` from your home folder too.
3. **Restrict the development user.** In **Database Access**, change `webproject-dev` to **Specific Privileges**: `readWrite` on `webproject_dev` only.
4. **Sample data for local work.** Local development now has no catalog. From `crawler/`, run `npm run crawl -- cartier-sg --limit=20`.

### Step 7: Lock the API to Vercel (`PROXY_SECRET`)

Do this after step 6, as its own change, so a problem here can't be confused with the launch. With it on, the backend answers 403 to anything except `/api/health` unless the request has the secret `X-Proxy-Secret` header, and only Vercel can add that header. **The order matters: Vercel first.** If Render gets the value first, every API call except `/api/health` fails with 403.

The method is the one in [Vercel's docs](https://vercel.com/docs/routing/rewrites#restricting-your-origin-to-vercel-traffic): a `routes` entry reads the value from a Vercel environment variable, so it never goes in a tracked file. A visitor can't fake the header, because `set` replaces whatever they send. `devops/vercel.proxy-secret.json` is the ready-made config. **It hasn't run on a real deployment**: it passes Vercel's published schema, and the steps below are its first test.

1. **Create the value**, in your own terminal, and keep it in a password manager. Don't paste it into a chat or a file in the project:
   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. **Vercel:** open **Settings → Environment Variables** and add `PROXY_SECRET` with that value, for **Production** and **Preview**. Tick **Sensitive** if it's offered.
3. **Deploy the config:** ask the devops session to copy `devops/vercel.proxy-secret.json` over `frontend/vercel.json`, commit and push. Vercel deploys it. A deployment only sees variables that existed when it was created, so step 2 has to come first.
4. **Check Vercel, with Render still open.** Each should work as it did in step 5:
   ```powershell
   $site = "https://maison-prix.vercel.app"
   foreach ($p in "/api/health", "/api/brands", "/api/products?limit=1", "/api/no-such-route", "/brands/dior") {
     "$p -> " + (curl.exe -s -o NUL -w "%{http_code} %{content_type}" "$site$p")
   }
   ```
   Expect 200 JSON, except 404 JSON for `/api/no-such-route` and 200 HTML for `/brands/dior`. Also log in on the site. If anything fails, stop here: use **Deployments → Instant Rollback** in Vercel, and tell the devops session.
5. **Render:** open **Environment**, add `PROXY_SECRET` with the same value, then **Save, rebuild, and deploy**. Wait until the deploy is live.
6. **Check the lock:**
   ```powershell
   $api = "https://maison-prix-api.onrender.com"
   "direct health -> " + (curl.exe -s -o NUL -w "%{http_code}" "$api/api/health")
   "direct brands -> " + (curl.exe -s -o NUL -w "%{http_code}" "$api/api/brands")
   "through Vercel -> " + (curl.exe -s -o NUL -w "%{http_code}" "$site/api/brands")
   ```
   Expect 200, 403 and 200. Then log in and post a forum image on the site.

**If the site gets 403 after step 5:** delete `PROXY_SECRET` from Render's **Environment** and save. That reopens the API without touching Vercel. The usual cause is values that differ, or a Vercel deployment made before the variable existed. If the variable is missing, Vercel sends the literal text `$PROXY_SECRET`, which also gets 403.

**Changing the value:** the backend accepts only one value at a time, so API calls fail with 403 between the two changes. Change it in Vercel and redeploy, change it in Render straight away, and pick a quiet time.

**Why it isn't in `render.yaml`:** the Blueprint asks for its values when it is created, before Vercel is live, and that is the wrong order.

## Daily crawl (GitHub Actions)

`.github/workflows/crawl.yml` runs `npm run crawl` in `crawler/` on a GitHub-hosted Ubuntu runner with Node 24. It installs Chromium only if the crawler depends on Playwright, and reads `MONGODB_URI` from a repository secret.

**Status: on.** It runs every day at 19:17 UTC (02:17 in Vietnam, 03:17 in Singapore and Hong Kong), and can also be started by hand. The first full run, on 2026-11-05, took 2h28m with 0 errors, before `orientalwatch-hk` was added (about 10 more minutes).

### Why Atlas has to allow `0.0.0.0/0`

A GitHub-hosted runner gets a different IP address on every run, from a shared pool of 7,036 address ranges (counted in October 2026 from `https://api.github.com/meta`, key `actions`), and that pool changes over time. It can't be allowlisted, so Atlas Network Access has to accept any IP. What protects the database instead:
- a database user used only by the crawl, with access to one database;
- a long auto-generated password, stored only as a GitHub secret;
- TLS, which Atlas always enforces.

Render's free plan has no fixed IP either, so the backend relies on the same entry.

Not used: adding the runner's own IP before each run and removing it afterwards (`atlas accessLists create --currentIp --deleteAfter <time>`). That would need an Atlas API key with permission to change the access list stored in GitHub, which is a stronger credential than the database password it protects.

### One-time setup

You do these steps. Never paste the password or the connection string into a chat, or into a file inside the project. Done on 2026-10-21 for `webproject_dev`. Step 1 of "Setup" above moves it to `webproject_prod`.

1. **Create the crawl database user.** In Atlas, open the project. In the sidebar under **Security**, open **Database Access** (in the newer layout: **Database & Network Access → Database Users**).
   1. Click **Add New Database User**. Authentication method: **Password**.
   2. Username: `webproject-crawler`. Click **Autogenerate Secure Password**, then **Copy**. Keep the password in your clipboard or a password manager until step 3.
   3. Under **Database User Privileges**, choose **Specific Privileges** → **Add Specific Privilege**: role `readWrite`, database `webproject_dev`, collection left empty.
   4. Click **Add User**.
2. **Allow GitHub runners in Network Access.** In the sidebar under **Security**, open **Network Access** (newer layout: **Database & Network Access → IP Access List**).
   1. Click **Add IP Address** → **Allow Access from Anywhere**. This fills in `0.0.0.0/0`.
   2. Comment: `GitHub Actions crawl (runner IPs change every run)`. Leave **temporary** unticked.
   3. Click **Confirm**, then wait until the status changes from `Pending` to `Active` (about a minute). Keep the existing entry for your own IP.
3. **Build the connection string.** On the cluster, open **Connect → Drivers** and copy the string. Put in `webproject-crawler` and its password, and add the database name `webproject_dev` after `.mongodb.net/`. The format is in `ENVIRONMENT.md`.
4. **Add the GitHub secret.** Open `https://github.com/HvH1110/Web_Project/settings/secrets/actions` and click **New repository secret**. Name: `MONGODB_URI`. Secret: the string from step 3. Then click **Add secret**.
5. **Push the workflow.** The **Run workflow** button only appears once `crawl.yml` is on `main` on GitHub.

### Run it by hand

On GitHub, open **Actions → Daily crawl → Run workflow**, select branch `main`, then **Run workflow**. Tick **check only** to test the database connection without crawling. The log is on the run's page. Possible errors:
- `Repository secret MONGODB_URI is not set`: step 4 is missing.
- `Atlas not reachable`: step 2 is missing or still `Pending`.
- `bad auth`: the user or password in the secret is wrong.

### Daily schedule

To pause it, comment out the `schedule:` block in `crawl.yml` and push.
- Cron times are UTC, and GitHub can start scheduled runs late when it is busy.
- Runs never overlap, including with the nightly backfill. A run that starts while another is still going waits for it to finish.
- A run is cancelled after 300 minutes. Raise `timeout-minutes` if real crawls need longer (GitHub's maximum is 360).
- When a scheduled run fails, GitHub emails whoever last changed the `cron` line.
- In a public repository, GitHub turns scheduled workflows off after 60 days without commits. To turn it back on: **Actions → Daily crawl → Enable workflow**.

### Change the password

In Atlas **Database Access**, find `webproject-crawler` and click **Edit → Edit Password → Autogenerate Secure Password → Update User**. Then build the new string (step 3) and update the GitHub secret with it. The old password stops working straight away.

## Nightly backfill (GitHub Actions)

`.github/workflows/backfill.yml` runs `npm run backfill -- --limit=2000 --oldest-first` in `crawler/` every night at 00:37 UTC (07:37 in Vietnam, 08:37 in Singapore and Hong Kong). It fills in price history from Wayback Machine snapshots and uses the same `MONGODB_URI` secret as the daily crawl. To run it by hand: **Actions → Nightly backfill → Run workflow**.

- **Timing:** a run takes about 3 hours, and is cancelled after 300 minutes. The next run continues the queue, so a cancelled run loses at most the page it was reading.
- **With the daily crawl:** the two share a concurrency group, so they never run at once. The slots don't normally meet: the crawl starts at 19:17 UTC and takes up to about 2h40m. If a third run is queued while one is running and one is waiting, GitHub cancels the older waiting run. Waiting runs are rare, and the next night's run catches up.
- **Review `--oldest-first` around 2026-12-01.** It gets to the oldest prices first, but a week isn't enough: 2,000 pages a night shared between 6 sources is about 333 per source, so Louis Vuitton HK's 6,000+ pages from 2015 to 2018 take 18+ nights, after about 3 nights of indexing. That is about 2026-11-27 if every night runs. Before removing it, ask the crawler session whether those years are done. To remove it, delete the flag from the last line of `backfill.yml`, then commit and push.
- **Failed runs:** if web.archive.org answers 429 or 503, the run stops and fails, and GitHub emails whoever last changed the `cron` line. If this happens once, ignore it; if it happens every night, ask the crawler session to look into it.
- **Storage:** the run stops before fetching anything once this database reaches 450 MB of the 512 MB free tier, and warns from 400 MB. Check the `Check database` step's log, and see [Environment](ENVIRONMENT.md) for how usage is counted. To free space, ask the crawler session what can go. Only raise the 450 MB limit if the whole cluster still has room, because the limit doesn't count other databases.
- **Turning it off:** **Actions → Nightly backfill → ⋯ → Disable workflow**.
