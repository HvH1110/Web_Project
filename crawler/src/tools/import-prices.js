// Imports prices entered by hand: `npm run import-prices [-- [file] [--dry-run]]`
// Default file: manual/prices.csv (see manual/README.md). All or nothing: when
// any row is wrong it lists every problem and writes nothing. Safe to re-run:
// a row already imported changes nothing, and a corrected row replaces its price.
//   --dry-run   check the file and print the rows; no database (no MONGODB_URI needed)
import fs from 'node:fs';
import { connectDB, disconnectDB } from '../db.js';
import { readManualPrices } from '../lib/manual.js';
import { saveManualPrice } from '../lib/store.js';

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith('--'));
const files = args.filter((a) => !a.startsWith('--'));
const dryRun = flags.includes('--dry-run');
const badFlags = flags.filter((f) => f !== '--dry-run');
if (badFlags.length || files.length > 1) {
  console.error(`Usage: npm run import-prices -- [file] [--dry-run]. Not understood: ${[...badFlags, ...files.slice(1)].join(', ')}`);
  process.exit(1);
}
const file = files[0] ?? 'manual/prices.csv';

let text;
try {
  text = fs.readFileSync(file, 'utf8');
} catch (err) {
  console.error(`Can't read ${file}: ${err.message}. Copy manual/prices.template.csv to start.`);
  process.exit(1);
}

let result;
try {
  result = readManualPrices(text);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
const { entries, errors } = result;
if (errors.length) {
  console.error(`${file}: nothing imported, ${errors.length} problem(s) to fix:`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

const dateOf = (d) => d.toISOString().slice(0, 10);
if (dryRun) {
  for (const { line, source, item, observedAt } of entries) {
    console.log(`Line ${line}: ${source.id}  ${item.ref}  ${item.currency} ${item.price}  ${dateOf(observedAt)}  ${item.name}`);
  }
  console.log(`${entries.length} rows are valid. Nothing written (dry run).`);
  process.exit(0);
}

try {
  await connectDB();
} catch (err) {
  // Log only the message: the error object can carry connection details.
  console.error(`MongoDB connection failed: ${err.message}`);
  process.exit(1);
}

const stats = { newProducts: [], points: 0, corrected: 0, offers: 0, olderThanOffer: 0 };
let failed = false;
try {
  for (const { source, item, observedAt } of entries) {
    const result = await saveManualPrice(source, item, observedAt);
    if (result.created) stats.newProducts.push(`${item.brand} ${item.ref}: ${item.name}`);
    if (result.point === 'added') stats.points += 1;
    if (result.point === 'corrected') stats.corrected += 1;
    if (result.offerUpdated) stats.offers += 1;
    else stats.olderThanOffer += 1;
  }
} catch (err) {
  failed = true;
  console.error(`Import stopped: ${err.message}. Fix it and run again; rows already written won't be repeated.`);
} finally {
  await disconnectDB();
}
console.log(
  `${entries.length} rows: ${stats.points} new price points, ${stats.corrected} corrected, ${stats.offers} current prices set, ` +
    `${stats.olderThanOffer} left alone because a newer date is stored.`,
);
if (stats.newProducts.length) {
  // A mistyped ref shows up here as a new product, not as an error.
  console.log(`${stats.newProducts.length} new products. If one should already exist, check its ref:`);
  for (const line of stats.newProducts) console.log(`  ${line}`);
}
process.exitCode = failed ? 1 : 0;
