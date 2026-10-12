// Single entry point for scheduled crawls: `npm run crawl [source-id ...]`.
// With no arguments it runs every registered source.
import { connectDB, disconnectDB } from './db.js';
import { sources } from './sources/index.js';

const wanted = process.argv.slice(2);
const selected = wanted.length ? sources.filter((s) => wanted.includes(s.id)) : sources;
const unknown = wanted.filter((id) => !sources.some((s) => s.id === id));

if (unknown.length) {
  console.error(`Unknown source(s): ${unknown.join(', ')}`);
  process.exit(1);
}
if (!selected.length) {
  console.log('No sources registered yet. Nothing to crawl.');
  process.exit(0);
}

try {
  await connectDB();
} catch (err) {
  // Log only the message: the error object can carry connection details.
  console.error(`MongoDB connection failed: ${err.message}`);
  process.exit(1);
}

let failed = 0;
try {
  for (const source of selected) {
    try {
      await source.run();
    } catch (err) {
      // One broken source must not stop the others.
      failed += 1;
      console.error(`[${source.id}] failed: ${err.message}`);
    }
  }
} finally {
  await disconnectDB();
}
process.exitCode = failed ? 1 : 0;
