// Single entry point for scheduled crawls:
//   npm run crawl [-- [source-id ...] [--dry-run] [--limit=N]]
// With no ids it runs every registered source.
//   --dry-run   fetch and parse, print the items, write nothing (no MONGODB_URI needed)
//   --limit=N   at most N product pages per source
import { connectDB, disconnectDB } from './db.js';
import { runSource } from './lib/runner.js';
import { saveItem, validateItem } from './lib/store.js';
import { sources } from './sources/index.js';

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith('--'));
const wanted = args.filter((a) => !a.startsWith('--'));
const dryRun = flags.includes('--dry-run');
const limitFlag = flags.find((f) => f.startsWith('--limit='));
const limit = limitFlag ? Number(limitFlag.slice('--limit='.length)) : Infinity;

const badFlags = flags.filter((f) => f !== '--dry-run' && f !== limitFlag);
if (badFlags.length || !(limit > 0)) {
  console.error(`Unknown or invalid option(s): ${[...badFlags, limitFlag].filter(Boolean).join(', ')}`);
  process.exit(1);
}
const unknown = wanted.filter((id) => !sources.some((s) => s.id === id));
if (unknown.length) {
  console.error(`Unknown source(s): ${unknown.join(', ')}. Known: ${sources.map((s) => s.id).join(', ')}`);
  process.exit(1);
}
const selected = wanted.length ? sources.filter((s) => wanted.includes(s.id)) : sources;
if (!selected.length) {
  console.log('No sources registered yet. Nothing to crawl.');
  process.exit(0);
}

// Dry run: print the first item of each source in full, then one line per item.
const printed = new Set();
async function printItem(source, item) {
  validateItem(source, item);
  if (!printed.has(source.id)) {
    printed.add(source.id);
    console.log(JSON.stringify(item, null, 2));
  } else {
    console.log(`  ${item.ref}  ${item.currency} ${item.price ?? '(no price)'}  ${item.name}`);
  }
  return { created: false, priceChanged: false };
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

let failed = 0;
try {
  for (const source of selected) {
    try {
      await runSource(source, { save: dryRun ? printItem : saveItem, limit });
    } catch (err) {
      // One broken source must not stop the others.
      failed += 1;
      console.error(`[${source.id}] failed: ${err.message}`);
    }
  }
} finally {
  if (!dryRun) await disconnectDB();
}
process.exitCode = failed ? 1 : 0;
