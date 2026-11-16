// Internet Archive (Wayback Machine) client: the capture index (CDX API) and
// raw snapshots. Everything goes through politeFetch, so robots.txt and our
// per-host delay apply; web.archive.org is one host for all brands.
import { politeFetch } from './http.js';

const CDX = 'https://web.archive.org/cdx/search/cdx';
const PAGE_SIZE = 5000;
// The index can take a minute to answer a large prefix query.
const CDX_TIMEOUT_MS = 120000;
const BUSY_PAUSE_MS = 60000;

// How long the archive asked us to wait, in ms (0 if it didn't say). Only the
// seconds form of Retry-After: the date form is rare and our pauses are long.
function retryAfterMs(res) {
  const seconds = Number(res.headers.get('retry-after'));
  return seconds > 0 ? seconds * 1000 : 0;
}

// The archive answers 429/503 when it wants us to slow down. Callers pause
// before trying again, and give up on the run if it stays busy.
export class ArchiveBusyError extends Error {
  constructor(res) {
    super(`web.archive.org answered HTTP ${res.status} (${res.url}).`);
    this.name = 'ArchiveBusyError';
    this.status = res.status;
    this.retryAfterMs = retryAfterMs(res);
  }
}

// Any other answer than 200 from the index (429 and 503 are ArchiveBusyError).
export class IndexError extends Error {
  constructor(prefix, status) {
    super(`Wayback index answered HTTP ${status} for ${prefix}`);
    this.name = 'IndexError';
    this.status = status;
  }
}

export function checkArchiveStatus(res) {
  if (res.status === 429 || res.status === 503) throw new ArchiveBusyError(res);
}

// One index request. A refused connection ("fetch failed") goes to
// onRefused, which pauses (or throws to give up), and the same request is sent
// again: restarting a long listing from its first page would cost more.
async function askIndex(url, onRefused) {
  for (;;) {
    try {
      return await politeFetch(url, { timeoutMs: CDX_TIMEOUT_MS });
    } catch (err) {
      if (!onRefused || err.message !== 'fetch failed') throw err;
      await onRefused(err);
    }
  }
}

// Captures of every URL under `prefix` (e.g. "sg.louisvuitton.com/eng-sg/products/"),
// HTTP 200 HTML only, between `from` and `to` (Wayback timestamps or
// prefixes of one, e.g. "2019") when given.
// Calls onPage([{ timestamp, url }]) for each page of the index. A smaller
// pageSize means more requests, but each is quicker for the index to answer.
// A 429, or a 503 when retryBusy, is asked once more after a pause.
export async function listCaptures(prefix, { from, to, onPage, onRefused, pageSize = PAGE_SIZE, retryBusy = true }) {
  let resumeKey;
  do {
    const params = new URLSearchParams({
      url: prefix,
      matchType: 'prefix',
      output: 'json',
      fl: 'timestamp,original',
      limit: String(pageSize),
      showResumeKey: 'true',
    });
    params.append('filter', 'statuscode:200');
    params.append('filter', 'mimetype:text/html');
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (resumeKey) params.set('resumeKey', resumeKey);

    const url = `${CDX}?${params}`;
    let res = await askIndex(url, onRefused);
    if (res.status === 429 || (res.status === 503 && retryBusy)) {
      // Back off once before giving up: the index is often briefly busy.
      await new Promise((resolve) => setTimeout(resolve, Math.max(BUSY_PAUSE_MS, retryAfterMs(res))));
      res = await askIndex(url, onRefused);
    }
    checkArchiveStatus(res);
    if (!res.ok) throw new IndexError(prefix, res.status);
    const text = await res.text();
    const rows = text.trim() ? JSON.parse(text) : [];

    // [header, ...captures] then, when there is more, an empty row and [resumeKey].
    resumeKey = undefined;
    const captures = [];
    for (const row of rows.slice(1)) {
      if (row.length === 2) captures.push({ timestamp: row[0], url: row[1] });
      else if (row.length === 1) resumeKey = row[0];
    }
    await onPage(captures);
  } while (resumeKey);
}

// First characters of the path after a prefix, to split a query (lowercase:
// the index compares URLs in lowercase).
export const SPLIT_CHARS = [...'0123456789abcdefghijklmnopqrstuvwxyz-_.%'];
const SPLIT_PAGE_SIZE = 1000;
// Prefix, then one character, then two: a part that is still too large at two
// characters is taken for a busy index.
const MAX_SPLIT_DEPTH = 2;

// The index sorts captures by URL, so a date range doesn't make it read less:
// for a large prefix it answers 503 at once (or 504, or never) whatever the
// years asked. On 16 Nov 2026 Louis Vuitton HK's products for 2021 answered 503
// in 6 s, and the same year for paths starting with "a" answered 672 captures.
const tooLarge = (err) =>
  (err instanceof ArchiveBusyError && err.status === 503) || (err instanceof IndexError && err.status === 504) || err.name === 'TimeoutError';

// listCaptures, but a prefix too large for one query is asked again one more
// character at a time (onSplit(err, prefix) says so). A part that fails goes
// to onError(err, part) and the rest carry on. Returns true when every capture
// was listed. A busy index, and errors from onRefused or onPage, end the listing.
export async function listCapturesSplit(prefix, options, depth = 0) {
  const { from, to, onPage, onRefused, onSplit, onError, chars = SPLIT_CHARS } = options;
  const last = depth >= MAX_SPLIT_DEPTH;
  try {
    await listCaptures(prefix, { from, to, onPage, onRefused, retryBusy: last, pageSize: depth ? SPLIT_PAGE_SIZE : undefined });
    return true;
  } catch (err) {
    if (last || !tooLarge(err)) throw err;
    onSplit?.(err, prefix);
  }
  let complete = true;
  for (const c of chars) {
    try {
      if (!(await listCapturesSplit(prefix + c, options, depth + 1))) complete = false;
    } catch (err) {
      if (!(err instanceof IndexError || err.name === 'TimeoutError')) throw err;
      onError?.(err, prefix + c);
      complete = false;
    }
  }
  return complete;
}

// The page exactly as archived, without the Wayback toolbar or rewritten links.
export function snapshotUrl(timestamp, url) {
  return `https://web.archive.org/web/${timestamp}id_/${url}`;
}

// The page as people browse it on the Wayback Machine (stored as archiveUrl).
export function archiveUrl(timestamp, url) {
  return `https://web.archive.org/web/${timestamp}/${url}`;
}

// Wayback timestamp -> its quarter, e.g. "20240517..." -> "2024Q2".
export function captureQuarter(ts) {
  return `${ts.slice(0, 4)}Q${Math.ceil(Number(ts.slice(4, 6)) / 3)}`;
}

// Wayback timestamp (UTC) -> Date.
export function timestampToDate(ts) {
  const [, y, mo, d, h = '00', mi = '00', s = '00'] = ts.match(/^(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/);
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
}
