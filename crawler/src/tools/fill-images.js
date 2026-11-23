// Fills in the pictures of products that have none or only one, from other
// archived snapshots (Wayback Machine) of the brand's own product pages:
//   npm run fill-images [-- [brand ...] [--dry-run] [--per-product=N] [--max-minutes=N]]
// - Archive brands (Louis Vuitton, Dior, IWC, Van Cleef & Arpels, Chanel): the
//   queued snapshots of the same product, in any market, read or not. A page
//   read before is read again: a parser may have learned to see more pictures.
// - Cartier (live source): the archived captures of its offer pages.
// At most --per-product snapshots per product (default 4), one per year,
// newest year first, until it has 2 pictures. The product's pictures are
// replaced only by a longer list from a page whose code is the product's own,
// and nothing else about it changes. Snapshots read here are marked
// (`pictures`), so a re-run tries the next ones. Prints the products still
// without 2 pictures and why. --dry-run fetches and reports but writes nothing.
import { connectDB, disconnectDB } from '../db.js';
import { archives } from '../archives/index.js';
import { sources } from '../sources/index.js';
import { politeFetch } from '../lib/http.js';
import { improveImages, normalizeRef } from '../lib/store.js';
import { ArchiveBusyError, checkArchiveStatus, listCaptures, snapshotUrl } from '../lib/wayback.js';
import { Offer, Product, WaybackSnapshot } from '../models/index.js';

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith('--'));
const brands = args.filter((a) => !a.startsWith('--'));
const dryRun = flags.includes('--dry-run');
const numberFlag = (name, fallback) => {
  const flag = flags.find((f) => f.startsWith(`--${name}=`));
  return flag ? Number(flag.split('=')[1]) : fallback;
};
const perProduct = numberFlag('per-product', 4);
const maxMinutes = numberFlag('max-minutes', 120);
const known = new Set(['--dry-run', ...flags.filter((f) => /^--(per-product|max-minutes)=\d+$/.test(f))]);
if (flags.some((f) => !known.has(f)) || !(perProduct > 0) || !(maxMinutes > 0)) {
  console.error(`Unknown or invalid option(s): ${flags.filter((f) => !known.has(f)).join(', ') || flags.join(', ')}`);
  process.exit(1);
}

const WANTED = 2;
// Refused connections and busy answers in a row: pause these minutes, then end.
const PAUSES_MIN = [2, 5, 15];
const deadline = Date.now() + maxMinutes * 60000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class EndOfRun extends Error {}
let pausesInARow = 0;
async function pauseOrStop(reason) {
  const minutes = PAUSES_MIN[pausesInARow];
  if (minutes == null || Date.now() + minutes * 60000 > deadline) throw new EndOfRun(`${reason}; ending the run`);
  console.error(`${reason}. Pausing ${minutes} min.`);
  pausesInARow += 1;
  await sleep(minutes * 60000);
}

// The archive sources of a brand: louisvuitton-sg for louis-vuitton, ...
const archivesOf = (brand) => archives.filter((a) => a.id.startsWith(`${brand.replace(/-/g, '')}-`));

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

// One snapshot per year, newest year first, then the rest newest first.
function choose(candidates) {
  const sorted = [...candidates].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const years = new Set();
  const first = sorted.filter((c) => !years.has(c.timestamp.slice(0, 4)) && years.add(c.timestamp.slice(0, 4)));
  return [...first, ...sorted.filter((c) => !first.includes(c))].slice(0, perProduct);
}

// Candidates per product _id, from the queue of the brand's archive sources.
async function queuedCandidates(brand, products) {
  const ids = archivesOf(brand).map((a) => a.id);
  const byId = new Map(archives.map((a) => [a.id, a]));
  const keyOf = (snap) => {
    const url = normalizeUrl(snap.original);
    return url && (byId.get(snap.sourceId).productKey?.(url) ?? url);
  };
  // Products are known by the pages they were read from, and by their code
  // where the adapter keys products by code.
  const productOfKey = new Map();
  for (const p of products) productOfKey.set(p.ref, p);
  const read = WaybackSnapshot.find(
    { sourceId: { $in: ids }, ref: { $in: products.map((p) => p.ref) }, original: { $exists: true } },
    { sourceId: 1, original: 1, ref: 1 },
  ).lean();
  const byRef = new Map(products.map((p) => [p.ref, p]));
  for (const snap of await read) {
    const key = keyOf(snap);
    if (key) productOfKey.set(key, byRef.get(snap.ref));
  }
  const found = new Map(products.map((p) => [String(p._id), []]));
  const cursor = WaybackSnapshot.find(
    { sourceId: { $in: ids }, original: { $exists: true }, status: { $nin: ['missing', 'no-data'] }, pictures: { $exists: false } },
    { sourceId: 1, original: 1, timestamp: 1 },
  ).lean().cursor();
  for await (const snap of cursor) {
    const product = productOfKey.get(keyOf(snap));
    if (product) found.get(String(product._id)).push({ ...snap, source: byId.get(snap.sourceId) });
  }
  return found;
}

// Cartier: captures of the product's own offer pages, asked from the index.
async function cartierCandidates(product) {
  const offers = await Offer.find({ productId: product._id }, { url: 1, 'source.id': 1 }).lean();
  const found = [];
  for (const offer of offers) {
    const source = sources.find((s) => s.id === offer.source.id);
    if (!source || !offer.url) continue;
    for (;;) {
      try {
        await listCaptures(offer.url.replace(/^https?:\/\//, ''), {
          pageSize: 200,
          onPage: async (captures) => {
            for (const c of captures) if (normalizeUrl(c.url) === normalizeUrl(offer.url)) found.push({ timestamp: c.timestamp, original: c.url, source });
          },
        });
        pausesInARow = 0;
        break;
      } catch (err) {
        if (!(err instanceof ArchiveBusyError || err.message === 'fetch failed')) {
          console.error(`[${product.ref}] index of ${offer.url}: ${err.message}`);
          break;
        }
        await pauseOrStop(`web.archive.org: ${err.message}`);
      }
    }
  }
  return found;
}

// Reads one snapshot; returns its own pictures (an array), or null when the
// page isn't this product's.
async function picturesOf(product, snap) {
  for (;;) {
    if (Date.now() > deadline) throw new EndOfRun(`the ${maxMinutes} minutes are up`);
    let res;
    try {
      res = await politeFetch(snapshotUrl(snap.timestamp, snap.original));
      checkArchiveStatus(res);
    } catch (err) {
      if (err instanceof ArchiveBusyError || err.message === 'fetch failed') {
        await pauseOrStop(`web.archive.org: ${err.message}`);
        continue;
      }
      throw err;
    }
    pausesInARow = 0;
    if (!res.ok) return null;
    const item = snap.source.parse(await res.text(), normalizeUrl(snap.original));
    if (!item || item.brand !== product.brand || normalizeRef(item.ref) !== product.ref) return null;
    return item;
  }
}

await connectDB();
const report = { filled: [], unchanged: [] };
let endedEarly = '';
try {
  const filter = { 'images.1': { $exists: false } };
  if (brands.length) filter.brand = { $in: brands };
  const products = await Product.find(filter, { brand: 1, ref: 1, images: 1 }).lean();
  console.log(`${products.length} products have fewer than ${WANTED} pictures${dryRun ? ' (dry run: nothing is written)' : ''}`);

  const byBrand = new Map();
  for (const p of products) byBrand.set(p.brand, [...(byBrand.get(p.brand) ?? []), p]);
  for (const [brand, list] of byBrand) {
    const queued = archivesOf(brand).length ? await queuedCandidates(brand, list) : null;
    for (const product of list) {
      let count = product.images.length;
      const candidates = queued ? queued.get(String(product._id)) : await cartierCandidates(product);
      const tries = choose(candidates);
      let seen = 0;
      for (const snap of tries) {
        let item = null;
        try {
          item = await picturesOf(product, snap);
        } catch (err) {
          if (err instanceof EndOfRun) throw err;
          console.error(`[${product.brand} ${product.ref}] ${snap.original} (${snap.timestamp}): ${err.message}`);
        }
        const found = item?.images.length ?? 0;
        seen = Math.max(seen, found);
        if (snap._id && !dryRun) await WaybackSnapshot.updateOne({ _id: snap._id }, { $set: { pictures: found } });
        if (found > count) {
          if (!dryRun) await improveImages(snap.source, item);
          console.log(`[${product.brand} ${product.ref}] ${count} -> ${found} pictures from ${snap.source.id} ${snap.timestamp}`);
          count = found;
        }
        if (count >= WANTED) break;
      }
      const why = !candidates.length ? 'no archived page to try' : `its archived pages show ${seen > 1 ? 'no more' : seen === 1 ? 'one picture' : 'no picture'} (${tries.length} of ${candidates.length} tried)`;
      if (count > product.images.length) report.filled.push(`${brand} ${product.ref}: ${product.images.length} -> ${count}`);
      else report.unchanged.push(`${brand} ${product.ref}: ${count} picture${count === 1 ? '' : 's'}, ${why}`);
    }
  }
} catch (err) {
  if (!(err instanceof EndOfRun)) throw err;
  endedEarly = err.message;
} finally {
  await disconnectDB();
}

console.log(`\n${report.filled.length} products got more pictures${dryRun ? ' (dry run: not written)' : ''}:`);
for (const line of report.filled) console.log(`  ${line}`);
console.log(`\n${report.unchanged.length} products still have fewer than ${WANTED}:`);
for (const line of report.unchanged) console.log(`  ${line}`);
if (endedEarly) console.log(`\nEnded early: ${endedEarly}. A re-run continues with the snapshots not tried yet.`);
