// One-off: reads again one archived page of each stored Chanel product and
// corrects what the parser now reads differently from 2026 pages (breadcrumb
// links written as whole URLs; see src/archives/chanel.js):
//   npm run reread-chanel [-- --apply=<backup.json> | --restore=<backup.json>] [--max-minutes=N]
// - category, from the page's section (a bag stored as clothing);
// - collection, where the page names one (the bag family, Coco Crush, J12);
//   a collection the page doesn't name is left as it is;
// - images, only when the page shows more of them.
// --apply also queues again the Chanel pages that gave no product data
// (`no-data`), for the next backfill.
// The page read is the newest saved snapshot in the language the product's
// details are in (Vietnam pages for `lang: "vi"`). With no --apply it prints
// the changes and writes nothing (the pages are still fetched). --apply saves
// the old values to the file first (never over an existing file); --restore
// puts them back. Asks web.archive.org: not at the same time as another
// archive job.
import fs from 'node:fs';
import { connectDB, disconnectDB } from '../db.js';
import { archives } from '../archives/index.js';
import { politeFetch } from '../lib/http.js';
import { normalizeRef } from '../lib/store.js';
import { ArchiveBusyError, checkArchiveStatus, snapshotUrl } from '../lib/wayback.js';
import { Product, WaybackSnapshot } from '../models/index.js';

const flags = process.argv.slice(2);
const valueOf = (name) => flags.find((f) => f.startsWith(`--${name}=`))?.slice(name.length + 3);
const backup = valueOf('apply');
const restore = valueOf('restore');
const maxMinutes = Number(valueOf('max-minutes') ?? 60);
if (flags.some((f) => !/^--(apply|restore|max-minutes)=./.test(f)) || !(maxMinutes > 0) || (backup && restore)) {
  console.error(`Unknown or invalid option(s): ${flags.join(' ')}`);
  process.exit(1);
}
if (backup && fs.existsSync(backup)) {
  console.error(`${backup} already exists: give a new file for the backup`);
  process.exit(1);
}
const deadline = Date.now() + maxMinutes * 60000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const PAUSES_MIN = [2, 5, 15];
let pausesInARow = 0;

const byId = new Map(archives.filter((a) => a.id.startsWith('chanel-')).map((a) => [a.id, a]));

async function read(snap) {
  for (;;) {
    if (Date.now() > deadline) throw new Error(`the ${maxMinutes} minutes are up`);
    let res;
    try {
      res = await politeFetch(snapshotUrl(snap.timestamp, snap.original));
      checkArchiveStatus(res);
    } catch (err) {
      if (!(err instanceof ArchiveBusyError || err.message === 'fetch failed')) throw err;
      const minutes = PAUSES_MIN[pausesInARow];
      if (minutes == null || Date.now() + minutes * 60000 > deadline) throw new Error(`web.archive.org: ${err.message}; giving up`, { cause: err });
      console.error(`web.archive.org: ${err.message}. Pausing ${minutes} min.`);
      pausesInARow += 1;
      await sleep(minutes * 60000);
      continue;
    }
    pausesInARow = 0;
    if (!res.ok) return null;
    const url = new URL(snap.original.replace(/^http:/, 'https:'));
    url.port = '';
    url.search = '';
    return byId.get(snap.sourceId).parse(await res.text(), url.href);
  }
}

await connectDB();
try {
  if (restore) {
    const saved = JSON.parse(fs.readFileSync(restore, 'utf8'));
    const ops = saved.map(({ _id, category, collection, images }) => ({
      updateOne: { filter: { _id }, update: collection == null ? { $set: { category, images }, $unset: { collection: '' } } : { $set: { category, collection, images } } },
    }));
    if (ops.length) await Product.bulkWrite(ops, { ordered: false });
    console.log(`Restored ${ops.length} products`);
  } else {
    const products = await Product.find({ brand: 'chanel' }, { ref: 1, lang: 1, category: 1, collection: 1, images: 1 }).lean();
    const changes = [];
    const unread = [];
    let endedEarly = '';
    for (const p of products) {
      const vn = p.lang === 'vi';
      const snap = await WaybackSnapshot.findOne(
        { sourceId: vn ? 'chanel-vn' : { $in: ['chanel-sg', 'chanel-hk'] }, ref: p.ref, status: 'saved' },
        { sourceId: 1, original: 1, timestamp: 1 },
      ).sort({ timestamp: -1 }).lean();
      if (!snap) {
        unread.push(`${p.ref}: no saved page`);
        continue;
      }
      let item;
      try {
        item = await read(snap);
      } catch (err) {
        if (/giving up|minutes are up/.test(err.message)) {
          endedEarly = err.message;
          break;
        }
        unread.push(`${p.ref}: ${err.message}`);
        continue;
      }
      if (!item || normalizeRef(item.ref) !== p.ref) {
        unread.push(`${p.ref}: the page gives no product now`);
        continue;
      }
      const set = {};
      if (item.category !== p.category) set.category = item.category;
      if (item.collection && item.collection !== p.collection) set.collection = item.collection;
      if (item.images.length > p.images.length) set.images = item.images.slice(0, 4).map((img) => ({ ...img, sourceId: snap.sourceId }));
      if (!Object.keys(set).length) continue;
      changes.push({ _id: p._id, before: { category: p.category, collection: p.collection ?? null, images: p.images }, set, snap: snap._id });
      const what = [
        set.category && `category ${p.category} -> ${set.category}`,
        set.collection && `collection ${p.collection ?? '(none)'} -> ${set.collection}`,
        set.images && `pictures ${p.images.length} -> ${set.images.length}`,
      ].filter(Boolean).join(', ');
      console.log(`${p.ref}${vn ? ' (vi)' : ''}: ${what}`);
    }
    const count = (key) => changes.filter((c) => c.set[key]).length;
    console.log(`\n${products.length} products; ${changes.length} ${backup ? 'change' : 'would change'}: category ${count('category')}, collection ${count('collection')}, pictures ${count('images')}`);
    if (unread.length) console.log(`${unread.length} not read:\n  ${unread.join('\n  ')}`);
    if (endedEarly) console.log(`Ended early: ${endedEarly}. A re-run reads them all again.`);
    if (backup) {
      fs.writeFileSync(backup, JSON.stringify(changes.map(({ _id, before }) => ({ _id, ...before }))), { flag: 'wx' }); // never over an earlier backup
      const ops = changes.map(({ _id, set }) => ({ updateOne: { filter: { _id }, update: { $set: set } } }));
      if (ops.length) await Product.bulkWrite(ops, { ordered: false });
      // These pages have been read for pictures: fill-images moves on to others.
      const marks = changes.filter((c) => c.set.images).map((c) => ({ updateOne: { filter: { _id: c.snap }, update: { $set: { pictures: c.set.images.length } } } }));
      if (marks.length) await WaybackSnapshot.bulkWrite(marks, { ordered: false });
      // Pages the old parser gave nothing for (Vietnam accessories): queued
      // again, so the next backfill reads them with the parser as it is now.
      const requeued = await WaybackSnapshot.updateMany({ sourceId: { $in: [...byId.keys()] }, status: 'no-data' }, { $set: { status: 'pending' } });
      console.log(`Updated ${ops.length} products; old values saved to ${backup}; ${requeued.modifiedCount} pages without product data queued again`);
    }
  }
} finally {
  await disconnectDB();
}
