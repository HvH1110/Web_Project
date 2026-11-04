// Prices a person read from an official site in a normal browser, for sites that
// block crawlers. Reads the CSV described in manual/README.md and turns its rows
// into { source, item, observedAt }, or a list of everything wrong with them.
// Nothing here guesses: a value that isn't clearly right is an error.
import { normalizeRef } from './store.js';
import { BRANDS, CATEGORIES, CURRENCIES, MARKETS } from '../models/constants.js';

// Only sites we can't crawl. Brands crawled daily are left out on purpose: the
// crawl owns their offers and would overwrite a manual price. The source ids
// match the archive adapters, so manual and archived prices share one series.
const SITES = {
  chanel: { site: 'chanel', name: 'Chanel', domain: 'chanel.com' },
  'van-cleef-arpels': { site: 'vancleefarpels', name: 'Van Cleef & Arpels', domain: 'vancleefarpels.com' },
  'louis-vuitton': { site: 'louisvuitton', name: 'Louis Vuitton', domain: 'louisvuitton.com', ref: /^[A-Z0-9]{6}$/, refExample: 'M12929' },
  dior: { site: 'dior', name: 'Dior', domain: 'dior.com', ref: /^[A-Z0-9]+_[A-Z0-9]+$/, refExample: 'M0538ONGE_M27V' },
  iwc: { site: 'iwc', name: 'IWC', domain: 'iwc.com', ref: /^IW[0-9A-Z]{6}$/, refExample: 'IW545901' },
};
const MARKET_CURRENCY = { VN: 'VND', SG: 'SGD', HK: 'HKD' };
// Below this a VND price is a typing mistake (the shop shows millions).
const MIN_VND = 10000;
const MAX_IMAGES = 4;

export const COLUMNS = ['brand', 'market', 'ref', 'name', 'category', 'collection', 'price', 'currency', 'url', 'date_seen', 'image_urls', 'description'];
const REQUIRED = ['brand', 'market', 'ref', 'name', 'category', 'price', 'currency', 'url', 'date_seen'];

// RFC 4180 rows: [{ line, cells }], line being where the row starts in the file.
// Spreadsheets add a byte order mark and may separate cells with semicolons.
export function parseCsv(text) {
  const body = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const header = body.split('\n', 1)[0];
  const separator = !header.includes(',') && header.includes(';') ? ';' : ',';
  const rows = [];
  let cells = [];
  let cell = '';
  let quoted = false;
  let line = 1;
  let start = 1;
  const endRow = () => {
    cells.push(cell);
    cell = '';
    if (cells.some((c) => c.trim())) rows.push({ line: start, cells });
    cells = [];
  };
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === '\n') line += 1;
    if (quoted) {
      if (ch === '"' && body[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"' && !cell) {
      quoted = true;
    } else if (ch === separator) {
      cells.push(cell);
      cell = '';
    } else if (ch === '\n') {
      endRow();
      start = line;
    } else {
      cell += ch;
    }
  }
  if (quoted) throw new Error(`Line ${start}: a quote (") is never closed`);
  endRow();
  return rows;
}

// "13450", "13,450" or "580.50" as the page shows them, in English formatting.
function parseManualPrice(text) {
  if (!/^(\d+|\d{1,3}(,\d{3})+)(\.\d{1,2})?$/.test(text)) return null;
  return Number(text.replace(/,/g, ''));
}

// A real calendar date, not in the future: midnight UTC of that day.
function parseDateSeen(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(text) ? date : null;
}

function rowProblems(row, today) {
  const problems = [];
  const site = SITES[row.brand];
  if (!BRANDS.includes(row.brand)) problems.push(`brand "${row.brand}" is not one of: ${Object.keys(SITES).join(', ')}`);
  else if (!site) problems.push(`brand "${row.brand}" is crawled daily, so it can't be entered by hand`);

  if (!MARKETS.includes(row.market)) problems.push(`market "${row.market}" is not one of: ${MARKETS.join(', ')}`);
  else if (row.currency !== MARKET_CURRENCY[row.market]) problems.push(`currency "${row.currency}" doesn't match market ${row.market}: expected ${MARKET_CURRENCY[row.market]}`);
  if (!MARKETS.includes(row.market) && !CURRENCIES.includes(row.currency)) problems.push(`currency "${row.currency}" is not one of: ${CURRENCIES.join(', ')}`);

  const ref = normalizeRef(row.ref);
  if (!/^[A-Z0-9][A-Z0-9._-]*$/.test(ref)) problems.push(`ref "${row.ref}" has characters a reference code doesn't have`);
  else if (site?.ref && !site.ref.test(ref)) problems.push(`ref "${row.ref}" doesn't look like a ${site.name} code, e.g. ${site.refExample}`);

  if (!CATEGORIES.includes(row.category)) problems.push(`category "${row.category}" is not one of: ${CATEGORIES.join(', ')}`);

  const price = parseManualPrice(row.price);
  if (!(price > 0)) problems.push(`price "${row.price}" must be a number as the page shows it, e.g. 13450 or 13,450, with no currency sign`);
  else if (row.currency === 'VND' && price < MIN_VND) problems.push(`price "${row.price}" is too low for VND: write it in full, e.g. 95,000,000`);

  let host;
  try {
    const url = new URL(row.url);
    host = url.protocol === 'https:' ? url.hostname.toLowerCase() : undefined;
  } catch {
    host = undefined;
  }
  if (!host) problems.push(`url "${row.url}" must be a full https:// address`);
  else if (site && host !== site.domain && !host.endsWith(`.${site.domain}`)) problems.push(`url must be on ${site.domain}, the official site, not ${host}`);

  const date = parseDateSeen(row.date_seen);
  if (!date) problems.push(`date_seen "${row.date_seen}" must be a real date written as YYYY-MM-DD`);
  else if (row.date_seen > today) problems.push(`date_seen ${row.date_seen} is in the future`);

  const images = row.image_urls ? row.image_urls.split('|').map((u) => u.trim()).filter(Boolean) : [];
  if (images.length > MAX_IMAGES) problems.push(`image_urls has ${images.length} addresses: at most ${MAX_IMAGES}`);
  for (const src of images) {
    if (!/^https:\/\/\S+$/.test(src)) problems.push(`image address "${src}" must be a full https:// address`);
  }
  return problems;
}

// -> { entries: [{ line, source, item, observedAt }], errors: ["Line 3: ..."] },
// entries oldest first, so a product's history is written in date order.
export function readManualPrices(text, today = new Date().toISOString().slice(0, 10)) {
  const [head, ...rows] = parseCsv(text);
  if (!head) return { entries: [], errors: ['The file is empty'] };
  const names = head.cells.map((c) => c.trim().toLowerCase());
  const missing = COLUMNS.filter((c) => !names.includes(c));
  if (missing.length) return { entries: [], errors: [`Missing column(s): ${missing.join(', ')}. Start from manual/prices.template.csv`] };

  const errors = [];
  const entries = [];
  const seen = new Map();
  for (const { line, cells } of rows) {
    const row = Object.fromEntries(names.map((name, i) => [name, (cells[i] ?? '').trim()]));
    const empty = REQUIRED.filter((c) => !row[c]);
    if (empty.length) {
      errors.push(`Line ${line}: missing ${empty.join(', ')}`);
      continue;
    }
    row.market = row.market.toUpperCase();
    row.currency = row.currency.toUpperCase();
    const problems = rowProblems(row, today);
    if (problems.length) {
      errors.push(...problems.map((p) => `Line ${line}: ${p}`));
      continue;
    }
    const ref = normalizeRef(row.ref);
    const key = `${row.brand}|${row.market}|${ref}|${row.date_seen}`;
    if (seen.has(key)) {
      errors.push(`Line ${line}: same product, market and date as line ${seen.get(key)}`);
      continue;
    }
    seen.set(key, line);
    const site = SITES[row.brand];
    entries.push({
      line,
      source: { id: `${site.site}-${row.market.toLowerCase()}`, name: site.name, type: 'official', market: row.market },
      observedAt: parseDateSeen(row.date_seen),
      item: {
        brand: row.brand,
        ref,
        name: row.name,
        category: row.category,
        collection: row.collection || undefined,
        description: row.description || undefined,
        specs: {},
        images: row.image_urls ? row.image_urls.split('|').map((u) => u.trim()).filter(Boolean).map((url) => ({ url, alt: row.name })) : [],
        url: row.url,
        currency: row.currency,
        price: parseManualPrice(row.price),
        available: null,
      },
    });
  }
  if (!rows.length) errors.push('The file has a header but no rows');
  entries.sort((a, b) => a.observedAt - b.observedAt);
  return { entries, errors };
}
