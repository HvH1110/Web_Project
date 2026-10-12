# Deployment

Maintained by the devops session. Variables and Atlas details are in `ENVIRONMENT.md`.

- **Frontend and backend hosting:** not chosen yet (see "Production" in `ENVIRONMENT.md`).
- **Daily crawl:** GitHub Actions, described below.

## Daily crawl (GitHub Actions)

`.github/workflows/crawl.yml` runs `npm run crawl` in `crawler/` on a GitHub-hosted Ubuntu runner with Node 24. It installs Chromium only if the crawler depends on Playwright, and reads `MONGODB_URI` from a repository secret.

**Status: manual trigger only.** The daily schedule (19:17 UTC, i.e. 02:17 in Vietnam and 03:17 in Singapore and Hong Kong) is commented out until the crawler works end to end.

### Why Atlas has to allow `0.0.0.0/0`

A GitHub-hosted runner gets a different IP address on every run, from a shared pool of 7,036 address ranges (counted in October 2026 from `https://api.github.com/meta`, key `actions`), and that pool changes over time. It can't be allowlisted, so Atlas Network Access has to accept any IP. What protects the database instead:
- a database user used only by the crawl, with access to one database;
- a long auto-generated password, stored only as a GitHub secret;
- TLS, which Atlas always enforces.

The backend host will most likely need the same entry anyway (see "Production" in `ENVIRONMENT.md`).

Not used: adding the runner's own IP before each run and removing it afterwards (`atlas accessLists create --currentIp --deleteAfter <time>`). That would need an Atlas API key with permission to change the access list stored in GitHub, which is a stronger credential than the database password it protects.

### One-time setup

You do these steps. Never paste the password or the connection string into a chat, or into a file inside the project.

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

On GitHub, open **Actions → Daily crawl → Run workflow**, select branch `main`, then **Run workflow**. The log is on the run's page. Possible errors:
- `Repository secret MONGODB_URI is not set`: step 4 is missing.
- `MongoServerSelectionError` or a timeout: step 2 is missing or still `Pending`.
- `bad auth`: the user or password in the secret is wrong.

### Turn on the daily schedule

When a manual run finishes successfully and the data in Atlas looks right, uncomment the `schedule:` block in `crawl.yml` and push. Ask the devops session, or commit it yourself as `devops: enable daily crawl schedule`.
- Cron times are UTC, and GitHub can start scheduled runs late when it is busy.
- Runs never overlap. A run that starts while another is still going waits for it to finish.
- A run is cancelled after 180 minutes. Raise `timeout-minutes` if real crawls need longer (GitHub's maximum is 360).
- When a scheduled run fails, GitHub emails whoever last changed the `cron` line.
- In a public repository, GitHub turns scheduled workflows off after 60 days without commits. To turn it back on: **Actions → Daily crawl → Enable workflow**.

### Change the password

In Atlas **Database Access**, find `webproject-crawler` and click **Edit → Edit Password → Autogenerate Secure Password → Update User**. Then build the new string (step 3) and update the GitHub secret with it. The old password stops working straight away.
