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
| Picture jobs (one-off, by hand) | GitHub Actions or your computer | `.github/workflows/picture-jobs.yml` | see "One-off crawler jobs" below |

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

Do the steps in order. Everything the site needs must be on GitHub first, because Render and Vercel build from there: check that `git status` doesn't say `ahead of 'origin/main'`, and ask the root session to push if it does.

**What only you can do, in order.** The times are the devops session's estimates, not measured:

| Step | What you do | Time |
|---|---|---|
| Before | Turn on email for failed runs and issues ("Daily schedule" below) | 5 min |
| 1 | Install the database tools, create `webproject-prod`, copy the catalog, move the crawl's user and secret, run the check | 30 min, while no crawl or backfill is running or waiting |
| 2 | Cloudflare R2: payment method, bucket, public address, API token | 15 min |
| 3 | Render: sign up, create the Blueprint, paste 5 values, wait for the deploy | 20 min |
| 4 | Vercel: sign up, import the project, deploy | 10 min |
| 5 | Checks 1 to 9, including an iPhone, a phone on mobile data and a 20-minute idle wait | 45 min |
| 5 | Check 11 | 5 min, about a week later |
| 6 | Make yourself admin, drop the development catalog, restrict `webproject-dev`, crawl sample data | 15 min |
| 7 | Create the value, add it to Vercel, ask the devops session to deploy the config, check, add it to Render, check | 25 min, on a later day |

Steps 1 to 6 are about 2 hours 15 minutes in one sitting. The site has no catalog until step 1 is done.

### Step 1: Production database

1. **Install the [MongoDB Database Tools](https://www.mongodb.com/try/download/database-tools)**, if `mongodump --version` doesn't work.
2. **Create the backend's user.** In Atlas, under **Security**, open **Database Access** (newer layout: **Database & Network Access → Database Users**). Click **Add New Database User**.
   - Username `webproject-prod`, **Autogenerate Secure Password**, then **Copy**. Keep it in a password manager for step 3 of Render.
   - **Specific Privileges → Add Specific Privilege**: role `readWrite`, database `webproject_prod`, collection empty. Click **Add User**.
3. **Check there's room.** The crawl log's `Check database` step shows how big `webproject_dev` is, or see **Data Explorer**. Copying needs that much free again. If it's over about 240 MB, tell the devops session before copying. On 2026-11-23 it was 93.9 MB and growing by about 0.8 MB a day, so the copy fits for months.
4. **Copy the catalog** to `webproject_prod`, leaving out development accounts and forum posts. In PowerShell, in your own terminal rather than a Claude session:
   ```powershell
   # The webproject-dev connection string from backend/.env (it ends in /webproject_dev?...)
   $env:DEV_URI = Read-Host "webproject-dev connection string"
   $rootUri = $env:DEV_URI -replace '/webproject_dev\b', '/'

   mongodump "--uri=$env:DEV_URI" --excludeCollection=users --excludeCollection=sessions --excludeCollection=forum_topics --excludeCollection=forum_replies --excludeCollection=uploads "--archive=$HOME\catalog.archive" --gzip

   mongorestore "--uri=$rootUri" "--archive=$HOME\catalog.archive" --gzip "--nsInclude=webproject_dev.*" "--nsFrom=webproject_dev.*" "--nsTo=webproject_prod.*"

   Remove-Item Env:DEV_URI; $rootUri = $null
   ```
   Tested on a throwaway local database, not on Atlas: collections and indexes arrived, text search worked, and no user or forum data was copied. In Atlas **Data Explorer**, check that `webproject_prod` has `products`, `offers`, `price_points`, `fx_rates`, `brands`, `wayback_index` and `wayback_snapshots`.
5. **Move the daily crawl and nightly backfill to production.** Both use the same secret, and neither workflow file changes. Do steps 4 and 5 together while neither is running, because anything written after the copy stays in development. GitHub starts both runs hours late (see "Daily schedule" below), so go by the **Actions** tab, not the clock: neither workflow may be running or waiting. From 2026-11-06 to 11-16, 12:00 to 19:00 UTC (19:00 to 02:00 in Vietnam) was always clear.
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
- Render address differs: tell the devops session. The address is in `frontend/vercel.json` twice (`/api` and `/sitemap.xml`) and in `devops/vercel.proxy-secret.json` twice.
- Vercel address differs: tell the devops session to change `CLIENT_ORIGIN` in `backend/render.yaml`. The backend also builds the sitemap's links from it. Nothing in the frontend changes: the build takes the address for the share image and the `Sitemap:` line in `robots.txt` from Vercel (`VERCEL_PROJECT_PRODUCTION_URL`).
- Custom domain added later: the same `CLIENT_ORIGIN` change, then redeploy the frontend in Vercel so the share image and `robots.txt` pick up the new address.

Then the changes are committed and pushed. `CLIENT_ORIGIN` must match the address people use exactly. A POST from any other address gets a 403.

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

9. **Sitemap:** run this. Expect `200 application/xml`:
   ```powershell
   curl.exe -s -o NUL -w "%{http_code} %{content_type}" https://maison-prix.vercel.app/sitemap.xml
   ```
   A 200 with `text/html` means the site's page fallback answered, so the `/sitemap.xml` rewrite is missing from `frontend/vercel.json`.
10. **Share image and robots.txt:** run this:
   ```powershell
   foreach ($p in "/og.png", "/robots.txt") { "$p -> " + (curl.exe -s -o NUL -w "%{http_code} %{content_type}" "https://maison-prix.vercel.app$p") }
   curl.exe -s https://maison-prix.vercel.app/robots.txt
   curl.exe -s https://maison-prix.vercel.app/ | Select-String "og:image"
   ```
   Expect `200 image/png` and `200 text/plain`, a `Sitemap:` line and an `og:image` address that both start with `https://maison-prix.vercel.app`. Another address there means the build didn't get the production address: tell the frontend session. To see the card, paste the site's address into a chat app that shows link previews.
11. **Gzip reaches Render's bandwidth (after about a week of traffic):** divide the outbound figure on Render's **Metrics** page by the page views for the same days. The backend session estimates about 6 KB per page view with gzip and about 35 KB without, which means about 880,000 or about 150,000 page views on the 5 GB limit. Near 35 KB means Vercel's proxy isn't getting gzip, so tell the backend and devops sessions. Very little traffic won't give a clear answer.
12. **Product pictures:** open the home page and one product page for each house in a normal browser, with the developer tools' **Console** open. Pictures load straight from the brands' own sites and from `web.archive.org`, never through Vercel or Render. The site sets no Content-Security-Policy, so nothing on our side can block a picture host; a `Refused to load the image` line in the console would mean one was added since 2026-11-23, so tell the devops session. A missing picture with a 403 or 404 in the **Network** tab means the brand's site refused it or no longer has it: tell the crawler session the product. `curl` isn't a fair test here: on 2026-11-23 IWC, Louis Vuitton and older Dior picture addresses answered 403 to it whatever the Referer, and some of those may be bot protection that lets a real browser through.

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

**Brand texts changed later:** production got its `brands` from the copy in step 1. After the backend session changes them, run `npm run seed:brands` from `backend/` with `MONGODB_URI` set to the `webproject-prod` string, the same way as in item 1.

### Step 7: Lock the API to Vercel (`PROXY_SECRET`)

Do this after step 6, as its own change, so a problem here can't be confused with the launch. With it on, the backend answers 403 to anything except `/api/health` unless the request has the secret `X-Proxy-Secret` header, and only Vercel can add that header. **The order matters: Vercel first.** If Render gets the value first, every API call except `/api/health` fails with 403.

The method is the one in [Vercel's docs](https://vercel.com/docs/routing/rewrites#restricting-your-origin-to-vercel-traffic): a `routes` entry reads the value from a Vercel environment variable, so it never goes in a tracked file. A visitor can't fake the header, because `set` replaces whatever they send. `devops/vercel.proxy-secret.json` is the ready-made config. **It hasn't run on a real deployment**: it passes Vercel's published schema, and the steps below are its first test.

1. **Create the value**, in your own terminal, and keep it in a password manager. Don't paste it into a chat or a file in the project:
   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. **Vercel:** open **Settings → Environment Variables** and add `PROXY_SECRET` with that value, for **Production** and **Preview**. Tick **Sensitive** if it's offered.
3. **Deploy the config:** ask the devops session to compare `devops/vercel.proxy-secret.json` with `frontend/vercel.json`, because any rule added there since must also be in the prepared file. Every rule that sends a request to Render needs the secret. Then copy the file over `frontend/vercel.json`, commit and push. Vercel deploys it. A deployment only sees variables that existed when it was created, so step 2 has to come first.
4. **Check Vercel, with Render still open.** Each should work as it did in step 5:
   ```powershell
   $site = "https://maison-prix.vercel.app"
   foreach ($p in "/api/health", "/api/brands", "/api/products?limit=1", "/api/no-such-route", "/brands/dior", "/sitemap.xml", "/robots.txt", "/og.png") {
     "$p -> " + (curl.exe -s -o NUL -w "%{http_code} %{content_type}" "$site$p")
   }
   ```
   Expect 200 JSON, except 404 JSON for `/api/no-such-route`, 200 HTML for `/brands/dior`, 200 XML for `/sitemap.xml`, 200 text for `/robots.txt` and 200 PNG for `/og.png`. Also log in on the site. If anything fails, stop here: use **Deployments → Instant Rollback** in Vercel, and tell the devops session.
5. **Render:** open **Environment**, add `PROXY_SECRET` with the same value, then **Save, rebuild, and deploy**. Wait until the deploy is live.
6. **Check the lock:**
   ```powershell
   $api = "https://maison-prix-api.onrender.com"
   "direct health -> " + (curl.exe -s -o NUL -w "%{http_code}" "$api/api/health")
   "direct brands -> " + (curl.exe -s -o NUL -w "%{http_code}" "$api/api/brands")
   "through Vercel -> " + (curl.exe -s -o NUL -w "%{http_code}" "$site/api/brands")
   "direct sitemap -> " + (curl.exe -s -o NUL -w "%{http_code}" "$api/api/sitemap.xml")
   "sitemap through Vercel -> " + (curl.exe -s -o NUL -w "%{http_code} %header{x-vercel-cache}" "$site/sitemap.xml?check=$(Get-Random)")
   ```
   Expect 200, 403, 200, 403, then 200 for the sitemap through Vercel. The backend lets the sitemap be cached for a day, so a 200 only proves the secret arrived if the sitemap line shows `MISS`; the random `check` value is there to get one. A 403 there means search engines would get one too. Then log in and post a forum image on the site.

**If the site gets 403 after step 5:** delete `PROXY_SECRET` from Render's **Environment** and save. That reopens the API without touching Vercel. The usual cause is values that differ, or a Vercel deployment made before the variable existed. If the variable is missing, Vercel sends the literal text `$PROXY_SECRET`, which also gets 403.

**Changing the value:** the backend accepts only one value at a time, so API calls fail with 403 between the two changes. Change it in Vercel and redeploy, change it in Render straight away, and pick a quiet time.

**Why it isn't in `render.yaml`:** the Blueprint asks for its values when it is created, before Vercel is live, and that is the wrong order.

## Daily crawl (GitHub Actions)

`.github/workflows/crawl.yml` runs `npm run crawl` in `crawler/` on a GitHub-hosted Ubuntu runner with Node 24. It installs Chromium only if the crawler depends on Playwright, and reads `MONGODB_URI` from a repository secret.

**Status: on.** It is scheduled every day at 19:17 UTC (02:17 in Vietnam, 03:17 in Singapore and Hong Kong), and can also be started by hand. From 2026-11-06 to 11-16, 10 of the 11 scheduled runs succeeded, each taking 2h30m to 3h. The run that started on 2026-11-14 at 22:59 UTC failed after 2h08m: `cartier-vn` timed out and the other six sources were saved. The crawler session is looking at it. All 7 scheduled runs from 2026-11-17 to 11-23 succeeded, each taking 2h33m to 2h50m.

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
- Cron times are UTC, and GitHub starts scheduled runs late. In the first week the crawl started between 22:46 and 02:10 UTC (3.5 to 7 hours late, 05:46 to 09:10 in Vietnam), and the backfill between 06:28 and 07:39 UTC (6 to 7 hours late). The times weren't changed: both were late by about the same amount, at least 3 hours stayed between them, and a different slot has no known delay to compare with. From 2026-11-17 to 11-23 it was the same: the crawl started between 23:48 and 02:28 UTC and the backfill between 07:19 and 08:22 UTC. This is normal GitHub delay at busy times, so only act if a day has no run at all.
- Runs never overlap, including with the nightly backfill. A run that starts while another is still going waits for it to finish.
- A run is cancelled after 300 minutes. Raise `timeout-minutes` if real crawls need longer (GitHub's maximum is 360).
- **Noticing a failed run:** from 2026-11-06 to 11-16, 10 backfills and 1 crawl failed and nobody noticed for ten days, so there are now two signals:
  - **An issue.** `.github/workflows/notify.yml` opens an issue called `Scheduled run failed: Daily crawl` or `Scheduled run failed: Nightly backfill` when a scheduled run doesn't end in success, with a link to the run. Later failures add a comment to the same issue while it is open. See them at [Issues](https://github.com/HvH1110/Web_Project/issues); the tab shows a count while any are open. Close the issue once the failure is dealt with. This starts working once `notify.yml` is pushed, and it has not been tested by a real failure yet: the first failed run after the push is its test.
  - **GitHub's own notice.** GitHub notifies the account that last changed the `cron` line, which is `HvH1110`. Each failed run appears at [github.com/notifications](https://github.com/notifications) as `workflow run failed`.
  - **Email, which only you can check (5 minutes, once):** in GitHub, open your picture → **Settings → Notifications**. Under **Subscriptions → Watching**, tick **Email** (for the issues). Under **System → Actions**, tick **Email** and **Only notify for failed workflows**. Check the address under **Default notifications email** is one you read. Then open the repository, click **Watch**, and check it says **All Activity**.
  - **What to do with a failure:** open the run from the issue and read the last lines of the `Crawl` or `Backfill` step. A source named in a `failed:` line goes to the crawler session. A failed `Check database` step is in the troubleshooting table of [Environment](ENVIRONMENT.md). One failed night loses nothing permanent: the next run crawls every source again and the backfill continues its queue.
  - **Not covered:** nothing is sent for a run that never starts, so look at the **Actions** tab about once a week: each workflow should have a run for every day. Any Claude session can also check with `gh run list --limit 20`.
- In a public repository, GitHub turns scheduled workflows off after 60 days without commits. To turn it back on: **Actions → Daily crawl → Enable workflow**.

### Change the password

In Atlas **Database Access**, find `webproject-crawler` and click **Edit → Edit Password → Autogenerate Secure Password → Update User**. Then build the new string (step 3) and update the GitHub secret with it. The old password stops working straight away.

## Nightly backfill (GitHub Actions)

`.github/workflows/backfill.yml` runs `npm run backfill -- --limit=2000 --oldest-first` in `crawler/` every night, scheduled at 00:37 UTC (07:37 in Vietnam, 08:37 in Singapore and Hong Kong) but really starting 6 to 7 hours later. It fills in price history from Wayback Machine snapshots and uses the same `MONGODB_URI` secret as the daily crawl. To run it by hand: **Actions → Nightly backfill → Run workflow**. Tick **Only the Chanel archives** for the Chanel catch-up below.

- **Timing:** a run took between 3h and 4h45m from 2026-11-06 to 11-16. With the crawler's change of 2026-11-11 (commit `2758e22`) the script ends itself after 270 minutes, so expect about 4h35m every night, and GitHub cancels a hung run after 300 minutes. The next run continues the queue, so a cancelled run loses at most the page it was reading.
- **Sources:** every archive source in `crawler/src/archives/index.js`, with no list in the workflow. Crawler commit `917bc13` adds `chanel-sg`, `chanel-hk` and `chanel-vn` (11 sources instead of 8). They start on the first night after it is pushed.
- **Chanel catch-up (temporary):** a second schedule in the same workflow, at 07:47 UTC, runs `npm run backfill -- chanel-sg chanel-hk chanel-vn --limit=2000 --oldest-first --max-minutes=240`. Chanel then gets its own nightly budget instead of a share of the 2,000 pages split across 11 sources. The first Chanel run, done by hand on 2026-11-23 and ending at 17:20 UTC, saved 122 products and left about 1,700 Chanel snapshots queued (SG 951, VN 760). At about 1,000 pages a run, that's 2 or 3 nights. With GitHub's usual delay it should start around 13:00 to 15:00 UTC and end by about 19:30 UTC; if the main backfill is still running, it waits. It shows in **Actions** as another *Nightly backfill* run, and a failure opens the same issue. **Remove it once Chanel's queue is empty:** ask the crawler session, which can see the queue. Then delete the second `cron` line and its comment from `backfill.yml`; the `CHANEL_ONLY` line can stay. A catch-up run with nothing queued ends within minutes, so leaving it a few extra nights costs nothing.
- **How much it reads:** web.archive.org lets a night read about 1,000 to 1,500 pages, so `--limit=2000` is a ceiling that is rarely reached. Raising it wouldn't help Chanel: the archive's pace and the 270-minute end decide how much a night reads. With 11 sources, each brand's history takes longer to fill in. The script reads one snapshot per product per year, products with the longest history first. The crawler session's estimates are in `crawler/SOURCES.md`, section Backfill reach.
- **With the daily crawl:** the crawl, both backfill schedules and the manual picture jobs share a concurrency group, so they never run at once. The slots didn't meet in the first week: the crawl ended between 01:30 and 04:45 UTC, at least 3 hours before the backfill started. If a third run is queued while one is running and one is waiting, GitHub cancels the older waiting run. Waiting runs are rare, and the next night's run catches up.
- **`--oldest-first`** matters less since `2758e22`: it only decides the order among products with equally long histories. It stays until the crawler session says otherwise. To remove it, delete the flag from the last line of `backfill.yml`, then commit and push.
- **Failed runs:** 10 of the 11 nights from 2026-11-06 to 11-16 ended as failed, because the old script exits with an error when web.archive.org keeps refusing connections. The pages saved before that were kept. Commit `2758e22` makes such a run pass with a warning on its page, and it takes effect on the first night after it is pushed; the workflow's command doesn't change. It did: all 7 nights from 2026-11-17 to 11-23 succeeded, each ending itself after about 4h30m. A failed backfill now means a real error. How you hear about one is under "Daily schedule" above.
- **Storage:** the run stops before fetching anything once this database reaches 450 MB of the 512 MB free tier, and warns from 400 MB. It was 59.0 MB on 2026-11-05, 88.4 MB on 2026-11-16 and 93.9 MB on 2026-11-23 (data plus indexes): `wayback_snapshots` 66.6 MB for 235,000 snapshots, `products` 18.0 MB for 12,090 products (about 1.5 KB each), `price_points` 7.2 MB, everything else under 3 MB. Growth slowed to about 0.8 MB a day after `2758e22` (1.35 MB a day the week before), which reaches 450 MB around early 2028. Pictures are stored as addresses only, never image files. Rewriting a picture address to a `web.archive.org/web/<time>im_/` copy adds about 45 bytes, so repairing every picture would add about 2 MB. A new source adds about 1.5 KB per product, plus about 0.3 KB per snapshot and price point. Check the `Check database` step's log, and see [Environment](ENVIRONMENT.md) for how usage is counted. To free space, ask the crawler session what can go. Only raise the 450 MB limit if the whole cluster still has room, because the limit doesn't count other databases.
- **Turning it off:** **Actions → Nightly backfill → ⋯ → Disable workflow**.

## One-off crawler jobs

Some crawler commands are run once, by hand, and are never scheduled. Those that read web.archive.org **must never run at the same time as the backfill, the crawl or each other**: the archive limits each reader, so jobs running together slow each other down and share its refusals. Run one archive job at a time.

Two picture jobs are one-offs (crawler commits `917bc13` and `725cde9`; details in `crawler/CLAUDE.md`). Both store picture addresses only, never image files, so their effect on storage is tiny (see Storage above). Run the repair first, then the fill.

- **`repair-images`**: `npm run repair-images [-- brand ...] [--dead-host=<host> ...] [--checked=<file> ...] [--apply=<backup.json> | --restore=<backup.json>] [--max-minutes=N]`. A picture on a dead host becomes its Wayback copy (`web.archive.org/web/<time>im_/<address>`), or is dropped where the archive has none, but a product never loses its last picture. It also drops Louis Vuitton video players stored as pictures and encodes spaces in addresses. Without `--apply` it only prints counts per host (swapped, dropped, kept) and writes nothing, although it still asks the archive for copies: at most about 60 index queries per host. `--apply` first saves the old pictures to the backup file and refuses one that already exists. `--restore=<file>` puts them back. The dead hosts on 2026-11-23: `wwws.dior.com`, `www.dior.com`, `media.dior.com` and `www.iwc.com`.
- **`fill-images`**: `npm run fill-images [-- brand ...] [--dry-run] [--per-product=N] [--max-minutes=N]`. Products with fewer than 2 pictures get more, from other archived snapshots of the brand's own pages. It only ever replaces a product's pictures with a longer list, and a re-run tries the next snapshots.

**The backup file:** keep it **outside the project folder**, next to the earlier one-off backups, for example `C:/Users/ADMIN/repair-images-backup-2026-11-23.json`, and don't delete it until the repaired pictures have been checked on the site. It holds only product ids and picture addresses, no secrets. Inside the project, the root `.gitignore` keeps `*backup*.json` out of commits. The crawler session records each real run and its backup's location in `crawler/SOURCES.md`. To undo: `npm run repair-images -- --restore=<file>` from `crawler/`, in the same time window.

**From your own computer:** run from `crawler/`, with `crawler/.env` pointing at the database. Nothing prevents an overlap here, so run only between about 13:00 and 22:00 UTC (20:00 to 05:00 in Vietnam). By then the backfill has ended (by 12:53 UTC from 11-17 to 11-23), and the next crawl hasn't started (22:46 UTC at the earliest seen). **While the Chanel catch-up is scheduled it uses part of this window**, so in **Actions** wait until no *Nightly backfill* or *Daily crawl* run is running or queued, then start. The crawler session runs both jobs this way on 2026-11-23, one after the other and done before 23:30 UTC.

**From GitHub:** open **Actions → Picture jobs (one-off) → Run workflow** (`.github/workflows/picture-jobs.yml`). Choose the job, then fill in brand slugs separated by spaces (such as `dior louis-vuitton`; empty means every brand), the dead hosts for `repair-images` (such as `wwws.dior.com www.iwc.com`), and a time limit of 1 to 270 minutes. **Dry run** is ticked by default: untick it for the real run. The workflow shares the crawl's and backfill's concurrency group, so it waits while one of them is running and can't overlap them.
- **When:** the same 13:00 to 22:00 UTC window, after the Chanel catch-up has ended while it is scheduled. Started at another time it waits in the queue. If a scheduled run is queued behind it too, GitHub cancels the older waiting run, which may be this one or a night's crawl.
- **The backup:** a real `repair-images` run uploads its backup as an artifact called `repair-images-backup-<run id>`, kept for 90 days on the run's page. Download it, move it outside the project folder as above, and tell the crawler session where it is. To undo, run `--restore` from your own computer.
- **Reading the result:** the end of the `Run fill-images` or `Run repair-images` step has the counts, and for `fill-images` the products still without 2 pictures and why. Give them to the crawler session.
- The button appears once `picture-jobs.yml` is on `main` on GitHub. It hasn't run there yet. A failed run doesn't open an issue: only scheduled runs do.

Archived picture copies load on another site with nothing blocking them (checked on 2026-11-23), so no hosting change is needed.
