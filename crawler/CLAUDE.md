# Crawler session

You are the **crawler** session. Your area is `crawler/` (this folder) plus `docs/DATA.md`. Shared rules are in the root `CLAUDE.md`; what we are building is in `../docs/PRODUCT.md`.

## Job
Collect official prices, product details and images from brand websites and authorized dealers in Vietnam, Singapore and Hong Kong, and write them to MongoDB Atlas in the shape described in `../docs/DATA.md`. Later: backfill history from Wayback Machine snapshots and store daily exchange rates.

## Stack
- Node.js (ES modules) + Mongoose
- Plain HTTP + HTML parsing (`fetch` + `cheerio`) when the data is in the HTML or a public JSON endpoint; Playwright only for pages that need a real browser
- One adapter per source in `src/sources/<source-id>.js`, all returning the same normalized shape, so adding a source never touches the others

## Crawling rules
- Only official brand sites and authorized dealers. Record every candidate source in `SOURCES.md`: brand, market, URL, official or authorized dealer (and how you verified it), whether prices are shown, robots.txt notes, needs a browser (y/n), status.
- Respect robots.txt and each site's terms. At most one request every few seconds per site, an honest User-Agent, no logins.
- Don't bypass CAPTCHAs, bot protection or other access controls. If a source blocks us, mark it `blocked` in `SOURCES.md` and tell the user, so a different source can be chosen.
- Store exactly what the page shows, in its own currency. Never guess or fill gaps.
- Match the same product across markets by the brand's reference code (normalized), never by name.
- Every script must be safe to re-run: upsert by `{ brand, ref }` and `{ productId, source.id }`, and add a `price_points` entry only when the price changed.

## Data contract
`../docs/DATA.md` is the contract with the backend. Update it in the same change whenever you add or change a collection or field.

## Environment
Real values go in `crawler/.env` (gitignored). Document every variable in `crawler/.env.example`.
- `MONGODB_URI`: the same Atlas cluster as the backend. The user pastes it in; never print, log or commit it.

## Commands
Update this section as you add scripts.
- `npm install`: install dependencies (Node >= 20.19)
- `npm run crawl [-- source-id ...]`: the single entry point for the schedule. Runs every registered source in `src/sources/index.js`, or only the ids given. Needs `MONGODB_URI`. Exits 1 if any source failed. Sources: `dafc-vn`, `cartier-vn`, `cartier-sg`, `cartier-hk`.
  - `--dry-run`: fetch and parse, print the items, write nothing (no `MONGODB_URI` needed)
  - `--limit=N`: at most N product pages per source, e.g. `npm run crawl -- cartier-sg --dry-run --limit=3`
- `npm run probe -- <url> [<url> ...]`: survey helper. Shows robots.txt rules and whether the page loads for our client (or bot protection answers instead), and where a price appears: JSON-LD, meta tags, embedded state, plain text. No database needed.
- `npm run lint`: ESLint

## Layout
- `src/config.js`: env vars, User-Agent
- `src/lib/http.js`: `politeFetch`, the only way to make requests: robots.txt check, Crawl-delay, at least `CRAWL_DELAY_MS` between requests per host
- `src/models/`: Mongoose models for the collections in `../docs/DATA.md`
- `src/lib/runner.js`: runs one source (list URLs, fetch, parse, save); stops the source on 403/429/503
- `src/lib/store.js`: the only code that writes to MongoDB (upserts and price points, safe to re-run)
- `src/sources/`: one adapter per source, registered in `index.js`. An adapter is `{ id, name, type, market, listUrls(), parse(html, url), select?(urls) }`; `parse` returns `{ brand, ref, name, category, collection, description, specs, images: [{ url, alt }], url, currency, price, available }` or null
- `SOURCES.md`: source survey and status per brand and market

## Notes
- The daily schedule (GitHub Actions) belongs to the devops session. Keep a single entry command it can call, e.g. `npm run crawl`.
