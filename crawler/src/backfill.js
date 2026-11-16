// Price history from the Internet Archive (Wayback Machine):
//   npm run backfill [-- [archive-id ...] [--limit=N] [--oldest-first] [--dry-run]]
// With no ids it runs every adapter in src/archives/index.js. Each run:
//   1. asks the Wayback index for captures of each source's product pages
//      newer than the last run, and queues at most one per page per quarter;
//   2. fetches up to --limit queued snapshots (default 500, taking turns
//      between sources) and saves the products and the prices the archived
//      pages showed (price_points with origin "wayback"). Not every queued
//      snapshot: lib/sample.js picks one per product per year, the products
//      with the longest history first.
// Safe to re-run and to stop at any time; the next run continues the queue.
// If the archive says it is busy (429/503) or refuses connections, the run
// pauses and carries on. It ends early, still with exit code 0, when the
// archive stays busy (BUSY_PAUSES_MIN) or the time is up (--max-minutes): the
// archive setting our pace is not a failure. Database and other unexpected
// errors exit 1. Run one at a time: the delay between requests is per run.
//   --oldest-first   among products with as long a history, oldest snapshots first
//   --max-minutes=N  end the run after N minutes (default 270, for a job that
//                    is cancelled at 300)
//   --dry-run   no database: read one page of the index per source, fetch the
//               newest --limit (default 3) product pages and print the items
import { connectDB, disconnectDB } from './db.js';
import { archives } from './archives/index.js';
import { RobotsDisallowedError, politeFetch } from './lib/http.js';
import { pickSnapshots } from './lib/sample.js';
import { saveArchivedItem, validateItem } from './lib/store.js';
import {
  ArchiveBusyError,
  archiveUrl,
  checkArchiveStatus,
  listCaptures,
  listCapturesSplit,
  snapshotUrl,
  timestampToDate,
} from './lib/wayback.js';
import { WaybackIndex, WaybackSnapshot, snapshotId } from './models/index.js';

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith('--'));
const wanted = args.filter((a) => !a.startsWith('--'));
const dryRun = flags.includes('--dry-run');
const limitFlag = flags.find((f) => f.startsWith('--limit='));
const limit = limitFlag ? Number(limitFlag.slice('--limit='.length)) : dryRun ? 3 : 500;

const oldestFirst = flags.includes('--oldest-first');
const minutesFlag = flags.find((f) => f.startsWith('--max-minutes='));
const maxMinutes = minutesFlag ? Number(minutesFlag.slice('--max-minutes='.length)) : 270;

const badFlags = flags.filter((f) => f !== '--dry-run' && f !== '--oldest-first' && f !== limitFlag && f !== minutesFlag);
if (badFlags.length || !(limit > 0) || !(maxMinutes > 0)) {
  console.error(`Unknown or invalid option(s): ${[...badFlags, limitFlag, minutesFlag].filter(Boolean).join(', ')}`);
  process.exit(1);
}
const unknown = wanted.filter((id) => !archives.some((a) => a.id === id));
if (unknown.length) {
  console.error(`Unknown archive source(s): ${unknown.join(', ')}. Known: ${archives.map((a) => a.id).join(', ')}`);
  process.exit(1);
}
const selected = wanted.length ? archives.filter((a) => wanted.includes(a.id)) : archives;

const MAX_ERRORS_IN_A_ROW = 10;
// Pauses in a row, in minutes, while the archive keeps answering 429/503 or
// refusing connections, with no page read in between. After the last one the
// run ends. In the nightly runs of 6 to 10 November 2026 the archive answered
// for about 150 seconds (some 27 pages), refused connections, and answered
// again after the 2-minute pause, 34 to 45 times a night. A local run at 8 s
// between requests was refused about as often, so the pace stays, and pauses
// no longer end a run: only its time limit (--max-minutes) does.
const BUSY_PAUSES_MIN = [2, 5, 15, 30];
const REFUSED_IN_A_ROW = 3;
// A page that timed out or got a 5xx is tried again on later runs, this many
// times. Other errors would only fail the same way.
const MAX_RETRIES = 3;
const RETRYABLE_ERROR = /^(fetch failed|The operation was aborted|HTTP 5\d\d)/;

// The archive is still busy after every pause, or the time is up: the run ends
// early, and that is not a failure.
class EndOfRun extends Error {}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// "fetch failed" alone doesn't say why: add the cause (ECONNREFUSED, ECONNRESET, ...).
const describe = (err) => (err.message === 'fetch failed' && err.cause ? `fetch failed (${err.cause.code ?? err.cause.message})` : err.message);

// How the archive is treating us, shared by the index and the page fetches:
// it limits this client as a whole.
let deadline = Infinity;
let busyInARow = 0;
let refusedInARow = 0;
const answered = () => {
  busyInARow = 0;
  refusedInARow = 0;
};
// Waits before the next try, longer each time. Ends the run when the archive
// has stayed busy through every pause, or the pause would pass the time limit.
async function pauseOrStop(err) {
  const pauseMin = Math.max(BUSY_PAUSES_MIN[busyInARow] ?? Infinity, (err.retryAfterMs ?? 0) / 60000);
  if (pauseMin === Infinity) throw new EndOfRun(`${err.message} It stayed busy through ${BUSY_PAUSES_MIN.length} pauses.`);
  if (Date.now() + pauseMin * 60000 > deadline) throw new EndOfRun(`${err.message} No time left for another pause.`);
  console.error(`${err.message} Pausing ${Math.ceil(pauseMin)} min.`);
  busyInARow += 1;
  await sleep(pauseMin * 60000);
}
// The archive also limits a client by refusing its connections, with no 429
// or 503 to read: several in a row count as busy.
async function refusedOnce(err) {
  refusedInARow += 1;
  if (refusedInARow < REFUSED_IN_A_ROW) return;
  await pauseOrStop(new Error(`web.archive.org refused ${refusedInARow} connections in a row: ${describe(err)}.`));
  refusedInARow = 0;
}

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

// Oldest year of history we index, unless the adapter sets `firstYear`. Before
// this only Louis Vuitton has readable prices (SOURCES.md), and exchange rates
// start in February 2020.
const FIRST_YEAR = 2020;
// Past years indexed per URL prefix per run (newest first), so the first runs
// don't spend all their time on the index. Later runs fill in older years.
const PAST_YEARS_PER_RUN = 3;
// Minutes from the start of a run after which no more past years are asked
// (one being asked is finished). A year too large for one query takes some 40
// to 80 small ones, so catching up can take a while; this keeps most of the
// run for fetching pages. This year's captures are always asked.
const PAST_YEARS_MINUTES = 60;

// Step 1: queue new captures, one per product page per quarter (the first one
// the index lists). The index is asked one year at a time (a whole-history
// query times out on its side). A year too large for one query is asked again
// by the first characters of the page path (lib/wayback.js). Refused
// connections pause the run like they do for pages, then the same request is
// sent again.
async function indexSource(source) {
  let queued = 0;
  const thisYear = new Date().getUTCFullYear();
  for (const prefix of source.prefixes) {
    const stateId = `${source.id}|${prefix}`;
    const state = (await WaybackIndex.findById(stateId).lean()) ?? {};
    const yearsDone = new Set(state.yearsDone ?? []);
    let newest = state.lastTimestamp ?? '';

    const onPage = async (captures) => {
      answered();
      const ops = [];
      for (const { timestamp, url: original } of captures) {
        const url = normalizeUrl(original);
        if (!url || !source.isProductUrl(url)) continue;
        if (timestamp > newest) newest = timestamp;
        ops.push({
          updateOne: {
            filter: { _id: snapshotId(source.id, url, timestamp) },
            update: { $setOnInsert: { sourceId: source.id, original, timestamp, status: 'pending' } },
            upsert: true,
          },
        });
      }
      if (ops.length) queued += (await WaybackSnapshot.bulkWrite(ops, { ordered: false })).upsertedCount;
    };

    // This year since the newest capture seen, then past years not done yet.
    const slices = [{ from: newest > String(thisYear) ? newest : String(thisYear) }];
    const firstYear = source.firstYear ?? FIRST_YEAR;
    for (let year = thisYear - 1; year >= firstYear && slices.length <= PAST_YEARS_PER_RUN; year -= 1) {
      if (!yearsDone.has(year)) slices.push({ year, from: String(year), to: String(year) });
    }
    // true when the whole range was listed. A range that fails halfway is
    // listed again next time (the upserts make that harmless).
    const list = async (from, to, label) => {
      try {
        return await listCapturesSplit(prefix, {
          from,
          to,
          onPage,
          onRefused: refusedOnce,
          onSplit: (err, part) => console.error(`[${source.id}] index of ${part} (${label}) is too large for one query (${describe(err)}): asking by the next character`),
          onError: (err, part) => console.error(`[${source.id}] index of ${part} (${label}) failed: ${describe(err)}`),
        });
      } catch (err) {
        if (err instanceof ArchiveBusyError || err instanceof EndOfRun) throw err;
        console.error(`[${source.id}] index of ${prefix} (${label}) failed: ${describe(err)}`);
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
      if (Date.now() > started + PAST_YEARS_MINUTES * 60000) {
        console.log(`[${source.id}] ${PAST_YEARS_MINUTES} minutes of indexing are up: ${prefix} ${slice.year} and older wait for the next run`);
        break;
      }
      const complete = await list(slice.from, slice.to, String(slice.year));
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
      console.log(`[${source.id}] ${snap.url}: ${describe(err)}`);
    }
  }
}

// Step 2: work through the queues, taking turns between sources.
async function processQueues(sources, queues) {
  await WaybackSnapshot.updateMany(
    { sourceId: { $in: sources.map((s) => s.id) }, status: 'error', error: RETRYABLE_ERROR, retries: { $not: { $gte: MAX_RETRIES } } },
    { $set: { status: 'pending' }, $inc: { retries: 1 } },
  );
  for (const source of sources) {
    // Every snapshot that still has its URL, read or not: what was read decides
    // what is still worth fetching (lib/sample.js).
    const rows = [];
    const cursor = WaybackSnapshot.find({ sourceId: source.id, original: { $exists: true } }, { original: 1, timestamp: 1, status: 1 }).lean().cursor();
    for await (const snap of cursor) {
      const url = normalizeUrl(snap.original);
      if (url) rows.push({ ...snap, url, key: source.productKey?.(url) ?? url });
    }
    const picked = pickSnapshots(rows, { oldestFirst });
    queues.push({
      source,
      picked: picked.length,
      pending: picked.slice(0, limit),
      errorsInARow: 0,
      stats: { done: 0, saved: 0, created: 0, points: 0, 'no-price': 0, 'no-data': 0, missing: 0, error: 0 },
    });
  }

  let done = 0;
  let active = queues.filter((q) => q.pending.length);
  while (done < limit && active.length) {
    for (const q of active) {
      if (done >= limit) break;
      if (Date.now() > deadline) throw new EndOfRun(`The ${maxMinutes} minutes are up.`);
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
        answered();
      } catch (err) {
        const refused = err.message === 'fetch failed';
        if (err instanceof ArchiveBusyError || refused) {
          // Not this page's fault: it goes back to the front of its queue.
          q.pending.unshift(snap);
          done -= 1;
          await (refused ? refusedOnce(err) : pauseOrStop(err));
          continue;
        }
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
      q.stats.done += 1;
      // A page that is gone is never fetched again: its URL can go. A no-data
      // page keeps it, so it can be queued again if a parser learns to read it.
      // A page that worked on a retry no longer has an error.
      const drop = update.status === 'missing' ? { original: 1, error: 1 } : { error: 1 };
      await WaybackSnapshot.updateOne({ _id: snap._id }, { $set: update, ...(update.status === 'error' ? {} : { $unset: drop }) });
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
deadline = started + maxMinutes * 60000;
let failed = false;
let endedEarly = '';
const queues = [];
try {
  if (dryRun) {
    for (const source of selected) await dryRunSource(source);
  } else {
    for (const source of selected) {
      try {
        const queued = await indexSource(source);
        console.log(`[${source.id}] ${queued} new snapshots queued`);
      } catch (err) {
        if (!(err instanceof ArchiveBusyError)) throw err;
        // listCaptures has already paused and tried again. Only this source's
        // index waits for the next run: one busy answer used to skip every
        // source after it, so Louis Vuitton HK's older years were never asked.
        console.error(`[${source.id}] ${err.message} Skipping the index of this source this run.`);
      }
    }
    await processQueues(selected, queues);
  }
} catch (err) {
  if (err instanceof EndOfRun) {
    endedEarly = err.message;
  } else {
    failed = true;
    console.error(err.message);
  }
} finally {
  for (const { source, stats, picked } of queues) {
    const left = await WaybackSnapshot.countDocuments({ sourceId: source.id, status: 'pending' });
    console.log(
      `[${source.id}] ${stats.saved} saved (${stats.created} new products, ${stats.points} new price points), ` +
        `${stats['no-price']} without price, ${stats['no-data']} without product data, ${stats.missing} missing, ` +
        `${stats.error} errors; ${picked - stats.done} still to fetch, of ${left} queued`,
    );
  }
  if (!dryRun) await disconnectDB();
}
if (endedEarly) {
  // On GitHub this shows on the run's page; the job itself passes.
  console.log(`${process.env.GITHUB_ACTIONS ? '::warning::' : ''}Backfill ended early: ${endedEarly} The next run continues the queue.`);
}
console.log(`Backfill done in ${((Date.now() - started) / 60000).toFixed(1)} min`);
process.exitCode = failed ? 1 : 0;
