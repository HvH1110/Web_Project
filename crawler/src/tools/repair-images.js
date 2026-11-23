// Repairs stored picture URLs so `images` lists only pictures that load:
//   npm run repair-images [-- [brand ...] [--checked=<file> ...] [--dead-host=<host> ...]
//                            [--apply=<backup.json> | --restore=<backup.json>] [--max-minutes=N]]
// - drops video players stored as pictures (player.louisvuitton.com/embed/...);
// - encodes raw spaces ("..._PM2_Front view.jpg" -> "Front%20view.jpg");
// - a URL known to be dead (404 or 410, or no connection, in a --checked file;
//   or on a --dead-host) becomes its Wayback copy, web.archive.org/web/<ts>im_/<url>,
//   when the archive has one, and is dropped when it hasn't, unless that
//   would leave the product with no picture: then its pictures stay as they
//   were, and the product is listed.
// We don't request these picture URLs ourselves: the brands' robots.txt is
// unreadable to us (403), which our rules treat as "disallow everything". A
// --checked file is the result of loading them in a browser or from the
// backend: JSON [{ url, status }], status an HTTP code or a reason such as
// "connect failed". A URL any file saw load (2xx) is never touched; a 403 or
// 5xx is not taken as dead (bot protection answers that to clients it doesn't
// like, while browsers get the picture).
// With no --apply it prints what would change and writes nothing; the archive
// is still asked for copies. --apply saves the old images to the file first
// (never over an existing file); --restore puts them back. Asks web.archive.org:
// not at the same time as a backfill or fill-images.
import fs from 'node:fs';
import { connectDB, disconnectDB } from '../db.js';
import { isPlayer } from '../archives/common.js';
import { ArchiveBusyError, imageCopyUrl, listCapturesSplit } from '../lib/wayback.js';
import { Product } from '../models/index.js';

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith('--'));
const brands = args.filter((a) => !a.startsWith('--'));
const valuesOf = (name) => flags.filter((f) => f.startsWith(`--${name}=`)).map((f) => f.slice(name.length + 3));
const checkedFiles = valuesOf('checked');
const deadHosts = new Set(valuesOf('dead-host').map((h) => h.toLowerCase()));
const [backup] = valuesOf('apply');
const [restore] = valuesOf('restore');
const maxMinutes = Number(valuesOf('max-minutes')[0] ?? 120);
const known = /^--(checked|dead-host|apply|restore|max-minutes)=./;
if (flags.some((f) => !known.test(f)) || !(maxMinutes > 0) || (backup && restore)) {
  console.error(`Unknown or invalid option(s): ${flags.join(' ')}`);
  process.exit(1);
}
if (backup && fs.existsSync(backup)) {
  console.error(`${backup} already exists: give a new file for the backup`);
  process.exit(1);
}
const deadline = Date.now() + maxMinutes * 60000;

const encodeSpaces = (url) => url.trim().replace(/ /g, '%20');
const isCopy = (url) => url.startsWith('https://web.archive.org/');
// Same picture whatever the scheme, host case, port or space encoding.
function keyOf(url) {
  try {
    const u = new URL(encodeSpaces(/^https?:\/\//i.test(url) ? url : `https://${url}`));
    return `${u.host.toLowerCase().replace(/:80$|:443$/, '')}${u.pathname}${u.search}`;
  } catch {
    return null;
  }
}

// URL key -> 'dead' | 'loads', from the --checked files.
function readChecked() {
  const result = new Map();
  for (const file of checkedFiles) {
    const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const { url, status } of [].concat(rows)) {
      const key = url && keyOf(String(url));
      if (!key) continue;
      const code = Number(status);
      const verdict = code >= 200 && code < 300 ? 'loads' : code === 404 || code === 410 || !code ? 'dead' : null;
      if (verdict === 'loads' || (verdict === 'dead' && result.get(key) !== 'loads')) result.set(key, verdict);
    }
  }
  return result;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const PAUSES_MIN = [2, 5, 15];
let pausesInARow = 0;
async function pauseOrStop(reason) {
  const minutes = PAUSES_MIN[pausesInARow];
  if (minutes == null || Date.now() + minutes * 60000 > deadline) throw new Error(`${reason}; giving up on the archive for this run`);
  console.error(`${reason}. Pausing ${minutes} min.`);
  pausesInARow += 1;
  await sleep(minutes * 60000);
}

// Index folders for the pictures of one host: the deepest folder level at
// which they fall in at most MAX_FOLDERS folders. Large folders are paged,
// and split by the index helper when too large for one query.
// www.iwc.com/content/dam/rcq/iwc/21/58/18/7/2158187.png -> www.iwc.com/content/dam/rcq/iwc/21/
const MAX_FOLDERS = 60;
function folders(keys) {
  const paths = keys.map((key) => key.split('?')[0].split('/'));
  const depth = Math.max(...paths.map((p) => p.length));
  for (let keep = depth - 1; keep > 1; keep -= 1) {
    const groups = new Map();
    for (const [i, p] of paths.entries()) {
      const folder = `${p.slice(0, keep).join('/')}/`;
      groups.set(folder, [...(groups.get(folder) ?? []), keys[i]]);
    }
    if (groups.size <= MAX_FOLDERS || keep === 2) return groups;
  }
  return new Map([[`${paths[0][0]}/`, keys]]);
}

// URL key -> Wayback copy URL (the newest 200 image capture), for the keys
// given, and the keys whose index request failed (left as they are). A
// capture of the same file with another query (?imwidth=430) counts too.
async function findCopies(keys) {
  const byHost = new Map();
  for (const key of keys) byHost.set(key.split('/')[0], [...(byHost.get(key.split('/')[0]) ?? []), key]);
  const groups = new Map();
  for (const hostKeys of byHost.values()) for (const [folder, members] of folders(hostKeys)) groups.set(folder, members);
  console.log(`asking the index for ${keys.size} pictures in ${groups.size} folders`);
  const copies = new Map();
  const unasked = new Set();
  let asked = 0;
  for (const [folder, members] of groups) {
    const wanted = new Set(members);
    const wantedPath = new Map(members.map((k) => [k.split('?')[0], k]));
    const exact = new Map();
    const samePath = new Map();
    const keep = (map, key, c) => {
      if (!(map.get(key)?.timestamp > c.timestamp)) map.set(key, c);
    };
    const failed = [];
    for (;;) {
      if (Date.now() > deadline) throw new Error(`the ${maxMinutes} minutes are up`);
      try {
        await listCapturesSplit(folder, {
          mimetype: 'image/.*',
          onRefused: (err) => pauseOrStop(`web.archive.org: ${err.message}`),
          onError: (err, part) => failed.push(part.toLowerCase()),
          onPage: async (captures) => {
            pausesInARow = 0;
            for (const c of captures) {
              const key = keyOf(c.url);
              if (!key) continue;
              if (wanted.has(key)) keep(exact, key, c);
              const byPath = wantedPath.get(key.split('?')[0]);
              if (byPath) keep(samePath, byPath, c);
            }
          },
        });
        break;
      } catch (err) {
        if (err instanceof ArchiveBusyError) {
          await pauseOrStop(`web.archive.org: ${err.message}`);
          continue;
        }
        if (/giving up/.test(err.message)) throw err;
        console.error(`index of ${folder}: ${err.message}; its pictures keep their URLs this run`);
        failed.push(folder.toLowerCase());
        break;
      }
    }
    for (const key of members) {
      const c = exact.get(key) ?? samePath.get(key);
      if (c) copies.set(key, imageCopyUrl(c.timestamp, c.url.replace(/^(https?:\/\/[^/]+?):(?:80|443)\//i, '$1/')));
      else if (failed.some((part) => key.toLowerCase().startsWith(part))) unasked.add(key);
    }
    asked += 1;
    if (asked % 10 === 0) console.log(`  ${asked} of ${groups.size} folders asked, ${copies.size} copies found so far`);
  }
  return { copies, unasked };
}

await connectDB();
try {
  if (restore) {
    const saved = JSON.parse(fs.readFileSync(restore, 'utf8'));
    const ops = saved.map(({ _id, images }) => ({ updateOne: { filter: { _id }, update: { $set: { images } } } }));
    if (ops.length) await Product.bulkWrite(ops, { ordered: false });
    console.log(`Restored the images of ${ops.length} products`);
  } else {
    const checked = readChecked();
    const filter = brands.length ? { brand: { $in: brands } } : {};
    const products = await Product.find(filter, { brand: 1, ref: 1, images: 1 }).lean();
    const isDead = (url) => {
      const key = keyOf(url);
      if (!key || isCopy(url) || checked.get(key) === 'loads') return false;
      return checked.get(key) === 'dead' || deadHosts.has(key.split('/')[0]);
    };
    const deadKeys = new Set(products.flatMap((p) => p.images.map((i) => i.url)).filter(isDead).map(keyOf));
    console.log(`${products.length} products; ${checked.size} checked URLs read; ${deadKeys.size} stored picture URLs are dead`);
    const { copies, unasked } = deadKeys.size ? await findCopies(deadKeys) : { copies: new Map(), unasked: new Set() };

    // Per host of the stored URL: swapped for a copy, dropped, kept (the index
    // couldn't be asked, or dropping would leave the product with no picture).
    const perHost = {};
    const count = (url, what) => {
      const host = keyOf(url)?.split('/')[0] ?? '?';
      const h = (perHost[host] ??= { swapped: 0, dropped: 0, kept: 0 });
      h[what] += 1;
    };
    const stats = { players: 0, spaces: 0 };
    const keptWhole = [];
    const changes = [];
    for (const p of products) {
      let images = [];
      let dropped = [];
      for (const img of p.images) {
        if (isPlayer(img.url)) {
          stats.players += 1;
          continue;
        }
        let url = encodeSpaces(img.url);
        if (url !== img.url) stats.spaces += 1;
        if (isDead(url)) {
          const copy = copies.get(keyOf(url));
          if (copy) {
            count(url, 'swapped');
            url = copy;
          } else if (unasked.has(keyOf(url))) {
            count(url, 'kept');
          } else {
            dropped.push({ ...img, url });
            continue;
          }
        }
        if (!images.some((i) => i.url === url)) images.push({ ...img, url });
      }
      // Never leave a product without a picture it had: keep the dead ones
      // (the frontend shows a placeholder when they fail) and say so.
      if (!images.length && dropped.length) {
        images = dropped;
        for (const img of dropped) count(img.url, 'kept');
        keptWhole.push(`${p.brand} ${p.ref}`);
        dropped = [];
      }
      for (const img of dropped) count(img.url, 'dropped');
      if (JSON.stringify(images) !== JSON.stringify(p.images)) changes.push({ _id: p._id, images: p.images, after: images });
    }
    for (const c of changes.slice(0, 5)) console.log(`  ${c._id}: ${c.images.length} -> ${c.after.length} pictures, first ${c.after[0]?.url ?? '(none)'}`);
    console.log(`${changes.length} products ${backup ? 'change' : 'would change'}: ${stats.players} video players removed, ${stats.spaces} URLs with spaces encoded`);
    for (const [host, h] of Object.entries(perHost)) console.log(`  ${host}: ${h.swapped} swapped for a Wayback copy, ${h.dropped} dropped (no copy), ${h.kept} kept`);
    console.log(`${keptWhole.length} products keep their dead pictures because none has a copy${keptWhole.length ? `: ${keptWhole.slice(0, 40).join(', ')}${keptWhole.length > 40 ? ', ...' : ''}` : ''}`);
    if (backup) {
      fs.writeFileSync(backup, JSON.stringify(changes.map(({ _id, images }) => ({ _id, images }))), { flag: 'wx' }); // never over an earlier backup
      const ops = changes.map(({ _id, after }) => ({ updateOne: { filter: { _id }, update: { $set: { images: after } } } }));
      for (let i = 0; i < ops.length; i += 500) await Product.bulkWrite(ops.slice(i, i + 500), { ordered: false });
      console.log(`Updated ${ops.length} products; old images saved to ${backup}`);
    }
  }
} finally {
  await disconnectDB();
}
