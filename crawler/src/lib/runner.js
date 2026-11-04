import { politeFetch, RobotsDisallowedError } from './http.js';

// Thrown when a site starts refusing us. The source stops at once: we never
// retry or work around a block (see SOURCES.md).
export class SourceBlockedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SourceBlockedError';
  }
}

const MAX_ERRORS_IN_A_ROW = 10;
// A page that times out or answers 5xx is tried once more after the others,
// more slowly than usual: it is usually the site having a bad moment.
const RETRY_PAUSE_MS = 15000;
// Scattered page errors don't fail a source (the next run tries those pages
// again); this share of its pages does, as does `MAX_ERRORS_IN_A_ROW`.
const MAX_ERROR_SHARE = 0.2;
const MIN_ERRORS_TO_FAIL = 5;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const retryable = (err) => Object.assign(err, { retryable: true });

// Crawls one source: list its product URLs, fetch each page politely, parse
// it and hand the item to `save(source, item)`.
//
// A source is { id, name, type, market, listUrls(), parse(html, url), select?(urls), timeoutMs? }.
// parse() returns null for pages that are not product pages.
export async function runSource(source, { save, limit = Infinity, log = console.log }) {
  const started = Date.now();
  const listed = await source.listUrls();
  const urls = (source.select ? source.select(listed) : listed).slice(0, limit);
  log(`[${source.id}] ${listed.length} product URLs listed, crawling ${urls.length}`);

  const stats = { pages: 0, saved: 0, created: 0, priceChanged: 0, noPrice: 0, skipped: 0, errors: 0, retried: 0 };
  let errorsInARow = 0;
  const toRetry = [];

  const crawlPage = async (url, { canRetry }) => {
    try {
      const { res, html } = await politeFetch(url, { timeoutMs: source.timeoutMs })
        .then(async (r) => ({ res: r, html: r.ok ? await r.text() : '' }))
        .catch((err) => {
          throw err instanceof RobotsDisallowedError ? err : retryable(err);
        });
      stats.pages += 1;
      if ([403, 429, 503].includes(res.status)) {
        throw new SourceBlockedError(`HTTP ${res.status} on ${url}. Stopping this source.`);
      }
      if (res.status === 404 || res.status === 410) {
        stats.skipped += 1;
        return;
      }
      if (res.status >= 500) throw retryable(new Error(`HTTP ${res.status}`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const item = source.parse(html, res.url);
      if (!item) {
        stats.skipped += 1;
        log(`[${source.id}] not a product page: ${res.url}`);
        return;
      }
      const result = await save(source, item);
      stats.saved += 1;
      if (result.created) stats.created += 1;
      if (result.priceChanged) stats.priceChanged += 1;
      if (item.price == null) stats.noPrice += 1;
      errorsInARow = 0;
    } catch (err) {
      if (err instanceof SourceBlockedError) throw err;
      if (err instanceof RobotsDisallowedError) {
        stats.skipped += 1;
        return;
      }
      errorsInARow += 1;
      if (err.retryable && canRetry) toRetry.push(url);
      else stats.errors += 1;
      log(`[${source.id}] ${url}: ${err.message}`);
      if (errorsInARow >= MAX_ERRORS_IN_A_ROW) {
        throw new Error(`${MAX_ERRORS_IN_A_ROW} errors in a row, giving up (last: ${err.message})`, { cause: err });
      }
    }
  };

  for (const url of urls) await crawlPage(url, { canRetry: true });
  stats.retried = toRetry.length;
  if (toRetry.length) log(`[${source.id}] trying ${toRetry.length} failed pages once more`);
  errorsInARow = 0;
  for (const url of toRetry) {
    await sleep(RETRY_PAUSE_MS);
    await crawlPage(url, { canRetry: false });
  }

  const minutes = ((Date.now() - started) / 60000).toFixed(1);
  log(
    `[${source.id}] done in ${minutes} min: ${stats.saved} saved (${stats.created} new products, ` +
      `${stats.priceChanged} new price points, ${stats.noPrice} without price), ` +
      `${stats.skipped} skipped, ${stats.errors} errors (${stats.retried} pages retried)`,
  );
  if (stats.errors >= MIN_ERRORS_TO_FAIL && stats.errors > urls.length * MAX_ERROR_SHARE) {
    throw new Error(`${stats.errors} of ${urls.length} pages failed`);
  }
  return stats;
}
