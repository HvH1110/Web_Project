// One-off: adds the material to the names of Van Cleef & Arpels products stored
// before the adapter did that (archives/vancleefarpels.js), and corrects the
// collection "Fleurs D Hawai". The backfill won't: it never changes a stored name.
//   npm run tidy-vca-names [-- --apply=<backup.json> | --restore=<backup.json>]
// With no option it only prints what would change. Touches only `name` and
// `collection` of brand van-cleef-arpels, and is safe to re-run. --apply saves
// the old values to the file first; --restore writes them back. A product whose
// material isn't known keeps its name.
import fs from 'node:fs';
import { connectDB, disconnectDB } from '../db.js';
import { Product } from '../models/index.js';

const BRAND = 'van-cleef-arpels';
const COLLECTIONS = { 'Fleurs D Hawai': 'Fleurs d’Hawaï' };
const METAL = /^(?:(?:rhodium[- ]plated|guilloché|textured) )*(?:18K|platinum)\b/i;
const NOT_MATERIAL = /model\b|\bmm\b|motifs?\b|flowers?\b|rows?\b/i;

// The material line of the page when a later snapshot has stored it, otherwise
// from the page's description: "Name, 18K yellow gold, onyx." Anything else, such
// as a watch's long description, tells us nothing we can rely on.
function materialOf({ name, description, specs }) {
  if (specs?.Material) return specs.Material;
  const inName = new Set(name.toLowerCase().split(', '));
  const parts = (description ?? '')
    .split(';')[0]
    .replace(/\.\s*$/, '')
    .split(', ')
    .filter((part) => !inName.has(part.toLowerCase()) && !NOT_MATERIAL.test(part));
  return METAL.test(parts[0] ?? '') && !parts.some((part) => part.includes('.')) ? parts.join(', ') : null;
}

const flags = process.argv.slice(2);
const backup = flags.find((f) => f.startsWith('--apply='))?.slice('--apply='.length);
const restore = flags.find((f) => f.startsWith('--restore='))?.slice('--restore='.length);

await connectDB();
try {
  if (restore) {
    const saved = JSON.parse(fs.readFileSync(restore, 'utf8'));
    const ops = saved.map(({ ref, name, collection }) => ({
      updateOne: { filter: { brand: BRAND, ref }, update: { $set: { name, collection } } },
    }));
    if (ops.length) await Product.bulkWrite(ops, { ordered: false });
    console.log(`Restored the names and collections of ${ops.length} products`);
  } else {
    const products = await Product.find({ brand: BRAND }, { ref: 1, name: 1, collection: 1, description: 1, specs: 1 }).lean();
    const changes = [];
    let unknown = 0;
    for (const p of products) {
      const material = materialOf(p);
      if (!material) unknown += 1;
      const hasIt = material && p.name.toLowerCase().endsWith(`, ${material}`.toLowerCase());
      const name = material && !hasIt ? `${p.name}, ${material}` : p.name;
      const collection = COLLECTIONS[p.collection] ?? p.collection;
      if (name !== p.name || collection !== p.collection) {
        changes.push({ ref: p.ref, name: p.name, collection: p.collection, after: { name, collection } });
      }
    }
    for (const c of changes) {
      const moved = c.collection !== c.after.collection ? ` | ${c.collection} -> ${c.after.collection}` : '';
      console.log(`${c.ref}: ${c.name} -> ${c.after.name}${moved}`);
    }
    console.log(`${changes.length} of ${products.length} Van Cleef & Arpels products would change; ${unknown} have no known material and keep their name`);
    if (backup) {
      fs.writeFileSync(backup, JSON.stringify(changes.map(({ ref, name, collection }) => ({ ref, name, collection }))), { flag: 'wx' }); // never over an earlier backup
      const ops = changes.map(({ ref, after }) => ({ updateOne: { filter: { brand: BRAND, ref }, update: { $set: after } } }));
      if (ops.length) await Product.bulkWrite(ops, { ordered: false });
      console.log(`Updated ${ops.length} products; old values saved to ${backup}`);
    }
  }
} finally {
  await disconnectDB();
}
