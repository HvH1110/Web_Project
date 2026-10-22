// Internet Archive (Wayback Machine) client: the capture index (CDX API) and
// raw snapshots. Everything goes through politeFetch, so robots.txt and our
// per-host delay apply; web.archive.org is one host for all brands.
import { politeFetch } from './http.js';

const CDX = 'https://web.archive.org/cdx/search/cdx';
const PAGE_SIZE = 5000;
// The index can take a minute to answer a large prefix query.
const CDX_TIMEOUT_MS = 120000;
const BUSY_PAUSE_MS = 60000;

// The archive answers 429/503 when it wants us to slow down: stop the run.
export class ArchiveBusyError extends Error {
  constructor(status, url) {
    super(`web.archive.org answered HTTP ${status} (${url}). Stopping; try again later.`);
    this.name = 'ArchiveBusyError';
  }
}

export function checkArchiveStatus(res) {
  if (res.status === 429 || res.status === 503) throw new ArchiveBusyError(res.status, res.url);
}

// Captures of every URL under `prefix` (e.g. "sg.louisvuitton.com/eng-sg/products/"),
// HTTP 200 HTML only, between `from` and `to` (Wayback timestamps or
// prefixes of one, e.g. "2019") when given.
// Calls onPage([{ timestamp, url }]) for each page of the index.
export async function listCaptures(prefix, { from, to, onPage }) {
  let resumeKey;
  do {
    const params = new URLSearchParams({
      url: prefix,
      matchType: 'prefix',
      output: 'json',
      fl: 'timestamp,original',
      limit: String(PAGE_SIZE),
      showResumeKey: 'true',
    });
    params.append('filter', 'statuscode:200');
    params.append('filter', 'mimetype:text/html');
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (resumeKey) params.set('resumeKey', resumeKey);

    const url = `${CDX}?${params}`;
    let res = await politeFetch(url, { timeoutMs: CDX_TIMEOUT_MS });
    if (res.status === 429 || res.status === 503) {
      // Back off once before giving up: the index is often briefly busy.
      await new Promise((resolve) => setTimeout(resolve, BUSY_PAUSE_MS));
      res = await politeFetch(url, { timeoutMs: CDX_TIMEOUT_MS });
    }
    checkArchiveStatus(res);
    if (!res.ok) throw new Error(`Wayback index answered HTTP ${res.status} for ${prefix}`);
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
