// One-off: applies the Cartier spec clean-up (sources/cartier.js) to products
// already stored. The crawl won't: it never changes the specs of a product that
// has some (lib/store.js).
//   npm run tidy-cartier-specs [-- --apply=<backup.json> | --restore=<backup.json>]
// With no option it only prints what would change. Touches only `specs` of
// brand cartier, and is safe to re-run. --apply saves the old values to the file
// first; --restore writes them back.
import fs from 'node:fs';
import { connectDB, disconnectDB } from '../db.js';
import { Product } from '../models/index.js';
import { tidySpecs } from '../sources/cartier.js';

const flags = process.argv.slice(2);
const backup = flags.find((f) => f.startsWith('--apply='))?.slice('--apply='.length);
const restore = flags.find((f) => f.startsWith('--restore='))?.slice('--restore='.length);

await connectDB();
try {
  if (restore) {
    const saved = JSON.parse(fs.readFileSync(restore, 'utf8'));
    const ops = saved.map(({ ref, specs }) => ({ updateOne: { filter: { brand: 'cartier', ref }, update: { $set: { specs } } } }));
    if (ops.length) await Product.bulkWrite(ops, { ordered: false });
    console.log(`Restored the specs of ${ops.length} products`);
  } else {
    const products = await Product.find({ brand: 'cartier' }, { ref: 1, specs: 1 }).lean();
    const changes = products
      .map((p) => ({ ref: p.ref, before: p.specs ?? {}, after: tidySpecs(p.specs ?? {}) }))
      .filter((c) => JSON.stringify(c.before) !== JSON.stringify(c.after));
    const values = new Map();
    for (const { before, after } of changes) {
      for (const [label, value] of Object.entries(before)) {
        if (value !== after[label]) values.set(`${label}: ${value} -> ${after[label]}`, (values.get(`${label}: ${value} -> ${after[label]}`) ?? 0) + 1);
      }
    }
    for (const [line, n] of [...values].sort((a, b) => b[1] - a[1])) console.log(`${n} x ${line}`);
    console.log(`${changes.length} of ${products.length} Cartier products would change`);
    if (backup) {
      fs.writeFileSync(backup, JSON.stringify(changes.map(({ ref, before }) => ({ ref, specs: before }))));
      const ops = changes.map(({ ref, after }) => ({ updateOne: { filter: { brand: 'cartier', ref }, update: { $set: { specs: after } } } }));
      if (ops.length) await Product.bulkWrite(ops, { ordered: false });
      console.log(`Updated ${ops.length} products; old values saved to ${backup}`);
    }
  }
} finally {
  await disconnectDB();
}
