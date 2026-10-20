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

// Crawls one source: list its product URLs, fetch each page politely, parse
// it and hand the item to `save(source, item)`.
//
// A source is { id, name, type, market, listUrls(), parse(html, url), select?(urls) }.
// parse() returns null for pages that are not product pages.
export async function runSource(source, { save, limit = Infinity, log = console.log }) {
  const started = Date.now();
  const listed = await source.listUrls();
  const urls = (source.select ? source.select(listed) : listed).slice(0, limit);
  log(`[${source.id}] ${listed.length} product URLs listed, crawling ${urls.length}`);

  const stats = { pages: 0, saved: 0, created: 0, priceChanged: 0, noPrice: 0, skipped: 0, errors: 0 };
  let errorsInARow = 0;
  for (const url of urls) {
    try {
      const res = await politeFetch(url);
      stats.pages += 1;
      if ([403, 429, 503].includes(res.status)) {
        throw new SourceBlockedError(`HTTP ${res.status} on ${url}. Stopping this source.`);
      }
      if (res.status === 404 || res.status === 410) {
        stats.skipped += 1;
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const item = source.parse(await res.text(), res.url);
      if (!item) {
        stats.skipped += 1;
        log(`[${source.id}] not a product page: ${res.url}`);
        continue;
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
        continue;
      }
      stats.errors += 1;
      errorsInARow += 1;
      log(`[${source.id}] ${url}: ${err.message}`);
      if (errorsInARow >= MAX_ERRORS_IN_A_ROW) {
        throw new Error(`${MAX_ERRORS_IN_A_ROW} errors in a row, giving up (last: ${err.message})`, { cause: err });
      }
    }
  }

  const minutes = ((Date.now() - started) / 60000).toFixed(1);
  log(
    `[${source.id}] done in ${minutes} min: ${stats.saved} saved (${stats.created} new products, ` +
      `${stats.priceChanged} new price points, ${stats.noPrice} without price), ` +
      `${stats.skipped} skipped, ${stats.errors} errors`,
  );
  return stats;
}
