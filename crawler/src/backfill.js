// Price history from the Internet Archive (Wayback Machine):
//   npm run backfill [-- [archive-id ...] [--limit=N] [--dry-run]]
// With no ids it runs every adapter in src/archives/index.js. Each run:
//   1. asks the Wayback index for captures of each source's product pages
//      newer than the last run, and queues at most one per page per quarter;
//   2. fetches up to --limit queued snapshots (default 500, newest first,
//      taking turns between sources) and saves the products and the prices
//      the archived pages showed (price_points with origin "wayback").
// Safe to re-run and to stop at any time; the next run continues the queue.
//   --dry-run   no database: read one page of the index per source, fetch the
//               newest --limit (default 3) product pages and print the items
import { connectDB, disconnectDB } from './db.js';
import { archives } from './archives/index.js';
import { RobotsDisallowedError, politeFetch } from './lib/http.js';
import { saveArchivedItem, validateItem } from './lib/store.js';
import {
  ArchiveBusyError,
  archiveUrl,
  captureQuarter,
  checkArchiveStatus,
  listCaptures,
  snapshotUrl,
  timestampToDate,
} from './lib/wayback.js';
import { WaybackIndex, WaybackSnapshot } from './models/index.js';

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith('--'));
const wanted = args.filter((a) => !a.startsWith('--'));
const dryRun = flags.includes('--dry-run');
const limitFlag = flags.find((f) => f.startsWith('--limit='));
const limit = limitFlag ? Number(limitFlag.slice('--limit='.length)) : dryRun ? 3 : 500;

const badFlags = flags.filter((f) => f !== '--dry-run' && f !== limitFlag);
if (badFlags.length || !(limit > 0)) {
  console.error(`Unknown or invalid option(s): ${[...badFlags, limitFlag].filter(Boolean).join(', ')}`);
  process.exit(1);
}
const unknown = wanted.filter((id) => !archives.some((a) => a.id === id));
if (unknown.length) {
  console.error(`Unknown archive source(s): ${unknown.join(', ')}. Known: ${archives.map((a) => a.id).join(', ')}`);
  process.exit(1);
}
const selected = wanted.length ? archives.filter((a) => wanted.includes(a.id)) : archives;

const MAX_ERRORS_IN_A_ROW = 10;

// https, no port, query or fragment: one key per product page.
function normalizeUrl(raw) {
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    u.protocol = 'https:';
    u.port = '';
    u.search = '';
    u.hash = '';
    return u.href;
  } catch {
    return null;
  }
}

// Oldest year of history we index. Product pages exist in the archive from
// about 2014, but older ones are mostly products no longer sold, and every
// year adds tens of thousands of pages to the queue.
const FIRST_YEAR = 2020;
// Past years indexed per URL prefix per run (newest first), so the first runs
// don't spend all their time on the index. Later runs fill in older years.
const PAST_YEARS_PER_RUN = 3;

// Step 1: queue new captures, one per product page per quarter (the first one
// the index lists). The index is asked one year at a time (a whole-history
// query times out on its side), and a year that times out too is asked again
// one quarter at a time.
async function indexSource(source) {
  let queued = 0;
  const thisYear = new Date().getUTCFullYear();
  for (const prefix of source.prefixes) {
    const stateId = `${source.id}|${prefix}`;
    const state = (await WaybackIndex.findById(stateId).lean()) ?? {};
    const yearsDone = new Set(state.yearsDone ?? []);
    let newest = state.lastTimestamp ?? '';

    const onPage = async (captures) => {
      const ops = [];
      for (const { timestamp, url: original } of captures) {
        const url = normalizeUrl(original);
        if (!url || !source.isProductUrl(url)) continue;
        if (timestamp > newest) newest = timestamp;
        ops.push({
          updateOne: {
            filter: { _id: `${source.id}|${url}|${captureQuarter(timestamp)}` },
            update: { $setOnInsert: { sourceId: source.id, url, original, timestamp, status: 'pending' } },
            upsert: true,
          },
        });
      }
      if (ops.length) queued += (await WaybackSnapshot.bulkWrite(ops, { ordered: false })).upsertedCount;
    };

    // This year since the newest capture seen, then past years not done yet.
    const slices = [{ from: newest > String(thisYear) ? newest : String(thisYear) }];
    for (let year = thisYear - 1; year >= FIRST_YEAR && slices.length <= PAST_YEARS_PER_RUN; year -= 1) {
      if (!yearsDone.has(year)) slices.push({ year, from: String(year), to: String(year) });
    }
    // true when the whole range was listed. A range that fails halfway is
    // listed again next time (the upserts make that harmless).
    const list = async (from, to, label) => {
      try {
        await listCaptures(prefix, { from, to, onPage });
        return true;
      } catch (err) {
        if (err instanceof ArchiveBusyError) throw err;
        console.error(`[${source.id}] index of ${prefix} (${label}) failed: ${err.message}`);
        return false;
      }
    };
    for (const slice of slices) {
      if (!slice.year) {
        if (await list(slice.from, undefined, `since ${slice.from}`)) {
          await WaybackIndex.updateOne({ _id: stateId }, { $set: { lastTimestamp: newest, indexedAt: new Date() } }, { upsert: true });
        }
        continue;
      }
      let complete = await list(slice.from, slice.to, String(slice.year));
      if (!complete) {
        complete = true;
        for (const q of [1, 2, 3, 4]) {
          const month = (m) => `${slice.year}${String(m).padStart(2, '0')}`;
          if (!(await list(month(q * 3 - 2), month(q * 3), `${slice.year}Q${q}`))) complete = false;
        }
      }
      if (complete) {
        await WaybackIndex.updateOne({ _id: stateId }, { $addToSet: { yearsDone: slice.year }, $set: { indexedAt: new Date() } }, { upsert: true });
      }
    }
  }
  return queued;
}

// Fetches one snapshot and parses it. Returns { status, item, timestamp }.
async function fetchSnapshot(source, { timestamp, original, url }) {
  const res = await politeFetch(snapshotUrl(timestamp, original));
  checkArchiveStatus(res);
  if (res.status === 404 || res.status === 410) return { status: 'missing' };
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // The archive may serve the nearest capture instead of the exact one.
  const actual = res.url.match(/\/web\/(\d{14})id_\//)?.[1] ?? timestamp;
  const item = source.parse(await res.text(), url);
  if (!item) return { status: 'no-data', timestamp: actual };
  validateItem(source, item);
  return { status: item.price == null ? 'no-price' : 'saved', item, timestamp: actual };
}

async function dryRunSource(source) {
  const captures = [];
  await listCaptures(source.prefixes[0], {
    from: String(new Date().getUTCFullYear() - 1),
    onPage: async (page) => {
      captures.push(...page);
      throw Object.assign(new Error('first page only'), { firstPageOnly: true });
    },
  }).catch((err) => {
    if (!err.firstPageOnly) throw err;
  });
  const newestPerUrl = new Map();
  for (const c of captures) {
    const url = normalizeUrl(c.url);
    if (url && source.isProductUrl(url) && !(newestPerUrl.get(url)?.timestamp > c.timestamp)) {
      newestPerUrl.set(url, { ...c, original: c.url, url });
    }
  }
  const picks = [...newestPerUrl.values()].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
  console.log(`[${source.id}] ${captures.length} captures on the first index page, ${newestPerUrl.size} product pages; fetching ${picks.length}`);
  for (const snap of picks) {
    try {
      const { status, item, timestamp } = await fetchSnapshot(source, snap);
      console.log(`[${source.id}] ${timestamp ?? snap.timestamp} ${status} ${snap.url}`);
      if (item) console.log(JSON.stringify(item, null, 2));
    } catch (err) {
      if (err instanceof ArchiveBusyError) throw err;
      console.log(`[${source.id}] ${snap.url}: ${err.message}`);
    }
  }
}

// Step 2: work through the queues, taking turns between sources.
async function processQueues(sources, queues) {
  for (const source of sources) {
    const pending = await WaybackSnapshot.find({ sourceId: source.id, status: 'pending' })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    queues.push({ source, pending, errorsInARow: 0, stats: { saved: 0, created: 0, points: 0, 'no-price': 0, 'no-data': 0, missing: 0, error: 0 } });
  }

  let done = 0;
  let active = queues.filter((q) => q.pending.length);
  while (done < limit && active.length) {
    for (const q of active) {
      if (done >= limit) break;
      const snap = q.pending.shift();
      done += 1;
      const update = { checkedAt: new Date() };
      try {
        const { status, item, timestamp } = await fetchSnapshot(q.source, snap);
        Object.assign(update, { status, ref: item?.ref, price: item?.price ?? undefined });
        if (status === 'saved') {
          const result = await saveArchivedItem(q.source, item, timestampToDate(timestamp), archiveUrl(timestamp, snap.original));
          if (result.created) q.stats.created += 1;
          if (result.priceChanged) q.stats.points += 1;
        }
        q.stats[status] += 1;
        q.errorsInARow = 0;
      } catch (err) {
        if (err instanceof ArchiveBusyError) throw err;
        Object.assign(update, { status: err instanceof RobotsDisallowedError ? 'missing' : 'error', error: err.message });
        q.stats[update.status] += 1;
        if (update.status === 'error') {
          q.errorsInARow += 1;
          console.error(`[${q.source.id}] ${snap.url} (${snap.timestamp}): ${err.message}`);
          if (q.errorsInARow >= MAX_ERRORS_IN_A_ROW) {
            console.error(`[${q.source.id}] ${MAX_ERRORS_IN_A_ROW} errors in a row, skipping this source for this run`);
            q.pending = [];
          }
        }
      }
      await WaybackSnapshot.updateOne({ _id: snap._id }, { $set: update });
    }
    active = active.filter((q) => q.pending.length);
  }
}

if (!dryRun) {
  try {
    await connectDB();
  } catch (err) {
    // Log only the message: the error object can carry connection details.
    console.error(`MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
}

const started = Date.now();
let failed = false;
const queues = [];
try {
  if (dryRun) {
    for (const source of selected) await dryRunSource(source);
  } else {
    for (const source of selected) {
      const queued = await indexSource(source);
      console.log(`[${source.id}] ${queued} new snapshots queued`);
    }
    await processQueues(selected, queues);
  }
} catch (err) {
  failed = true;
  console.error(err.message);
} finally {
  for (const { source, stats } of queues) {
    const left = await WaybackSnapshot.countDocuments({ sourceId: source.id, status: 'pending' });
    console.log(
      `[${source.id}] ${stats.saved} saved (${stats.created} new products, ${stats.points} new price points), ` +
        `${stats['no-price']} without price, ${stats['no-data']} without product data, ${stats.missing} missing, ` +
        `${stats.error} errors; ${left} still queued`,
    );
  }
  if (!dryRun) await disconnectDB();
}
console.log(`Backfill done in ${((Date.now() - started) / 60000).toFixed(1)} min`);
process.exitCode = failed ? 1 : 0;
