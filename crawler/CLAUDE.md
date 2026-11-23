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
- `npm run crawl [-- source-id ...]`: the single entry point for the schedule. Runs every registered source in `src/sources/index.js`, or only the ids given. Needs `MONGODB_URI`. Exits 1 if any source failed. Sources: `dafc-vn`, `thehourglass-sg`, `orientalwatch-hk`, `cartier-vn`, `cartier-sg`, `cartier-hk`, `omega-hk`. With no ids it first updates the exchange rates (`fx_rates`); the id `fx` does only that.
  - `--dry-run`: fetch and parse, print the items, write nothing (no `MONGODB_URI` needed)
  - `--limit=N`: at most N product pages per source, N past days of exchange rates (default 60), e.g. `npm run crawl -- cartier-sg --dry-run --limit=3`
- `npm run backfill [-- archive-id ...]`: price history from Wayback Machine snapshots of official pages that block crawlers. Queues new captures (one per page per quarter, from 2020, Louis Vuitton from 2015; the index is asked one year at a time, and a year too large for one query by the first one or two characters of the page path; past years only in the first 60 minutes), then fetches up to `--limit` queued snapshots (default 500, about 45 min) and saves products and `wayback` price points, no offers. Resumes where the last run stopped. Archives: `louisvuitton-sg`, `louisvuitton-hk`, `dior-sg`, `dior-hk`, `iwc-sg`, `iwc-hk`, `vancleefarpels-sg`, `vancleefarpels-hk`, `chanel-sg`, `chanel-hk`, `chanel-vn` (Chanel also stores products from pages without a price; Vietnamese details carry `lang: "vi"` until an English page replaces them).
  - Not every queued snapshot is fetched (`src/lib/sample.js`): one per product per year plus the newest, products captured in the most years first.
  - `--oldest-first`: among products with as long a history, the oldest snapshots first
  - `--max-minutes=N`: end the run after N minutes (default 270). Ending for this, or because the archive stays busy or keeps refusing connections, exits 0 with the summary; database and unexpected errors exit 1.
  - `--dry-run`: no database; fetch the newest `--limit` (default 3) archived product pages per source and print the items
- `npm run import-prices [-- file]`: imports prices a person read from official sites that block crawlers (default file `manual/prices.csv`, instructions in `manual/README.md`). All or nothing: one bad row and it lists every problem and writes nothing. Safe to re-run. Writes products, `offers` and `price_points` with origin `manual`. Only Chanel, Van Cleef & Arpels, Louis Vuitton, Dior and IWC: never a brand the daily crawl covers.
  - `--dry-run`: check the file and print the rows; no database
- `npm run tidy-cartier-specs [-- --apply=<backup.json> | --restore=<backup.json>]`: one-off. Cleans the specs of stored Cartier products; with no option it only prints the changes.
- `npm run tidy-vca-names [-- --apply=<backup.json> | --restore=<backup.json>]`: one-off. Adds the material to stored Van Cleef & Arpels names and corrects one collection; with no option it only prints the changes. Both one-offs were applied on 2026-11-16: see `SOURCES.md` for the backups.
- `npm run fill-images [-- brand ...] [--dry-run] [--per-product=N] [--max-minutes=N]`: products with fewer than 2 pictures get them from other archived snapshots of the brand's own pages (Cartier: archived captures of its offer pages). Only ever replaces a product's pictures with a longer list; marks the snapshots it read (`pictures`), so a re-run tries the next ones. Prints what is still missing and why. Uses web.archive.org: not at the same time as a backfill.
- `npm run repair-images [-- brand ...] [--dead-host=<host> ...] [--checked=<file> ...] [--apply=<backup.json> | --restore=<backup.json>]`: stored pictures that no longer load become their Wayback copies (`web.archive.org/web/<ts>im_/<url>`), or are dropped where the archive has none, but a product never loses its last picture. Also drops video players and encodes spaces. Dead means on a `--dead-host`, or 404/410/no connection in a `--checked` JSON file `[{ url, status }]`: we don't request the brand hosts ourselves (their robots.txt is unreadable). With no `--apply` it prints the counts per host and writes nothing. Asks web.archive.org: one archive job at a time. Run on 2026-11-23 with `--dead-host=wwws.dior.com --dead-host=www.dior.com --dead-host=media.dior.com --dead-host=www.iwc.com`.
- `npm run probe -- <url> [<url> ...]`: survey helper. Shows robots.txt rules and whether the page loads for our client (or bot protection answers instead), and where a price appears: JSON-LD, meta tags, embedded state, plain text. No database needed.
- `npm run lint`: ESLint
- `npm test`: unit tests in `test/` (Node's test runner; no network, no database)

## Layout
- `src/config.js`: env vars, User-Agent
- `src/lib/http.js`: `politeFetch`, the only way to make requests: robots.txt check, Crawl-delay, at least `CRAWL_DELAY_MS` between requests per host
- `src/models/`: Mongoose models for the collections in `../docs/DATA.md`
- `src/lib/runner.js`: runs one source (list URLs, fetch, parse, save); stops the source on 403/429/503; pages that time out or answer 5xx get one retry at the end, and so does a listing that fails that way, after 60 s
- `src/lib/store.js`: the only code that writes to MongoDB (upserts and price points, safe to re-run)
- `src/lib/fx.js`: daily exchange rates from Vietcombank, called from `crawl.js`
- `src/sources/`: one adapter per source, registered in `index.js`. An adapter is `{ id, name, type, market, listUrls(), parse(html, url), select?(urls), timeoutMs? }`; `parse` returns `{ brand, ref, name, category, collection, description, specs, images: [{ url, alt }], url, currency, price, available }` or null
- `src/lib/wayback.js`: Wayback index (CDX) and snapshot URLs; 429/503 from web.archive.org raises `ArchiveBusyError`, and `backfill.js` pauses and carries on, stopping only if it stays busy
- `src/archives/`: one adapter per archived site, registered in `index.js`: `{ id, name, type, market, prefixes, isProductUrl(url), parse(html, url), firstYear?, productKey?(url), keepWithoutPrice? }`, `parse` returning the same item as a live source
- `src/backfill.js`: the backfill entry point (queue in the crawler-internal `wayback_snapshots` collection)
- `src/lib/manual.js`: reads and validates the hand-entered CSV; `src/tools/import-prices.js` runs it
- `manual/`: the CSV template and the instructions for filling it in
- `SOURCES.md`: source survey and status per brand and market

## Notes
- The daily schedule (GitHub Actions) belongs to the devops session. Keep a single entry command it can call, e.g. `npm run crawl`.
