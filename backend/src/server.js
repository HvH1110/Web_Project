import app from './app.js';
import { env } from './config/env.js';
import { connectDB, dbStatus } from './config/db.js';
import { purgeUnusedUploads } from './services/uploads.service.js';

const HOUR = 60 * 60 * 1000;

app.listen(env.port, (err) => {
  if (err) {
    console.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
  console.log(`Server listening on http://localhost:${env.port}`);
});

// Delete forum images uploaded over a day ago but never posted.
async function purgeUploads() {
  if (dbStatus() !== 'connected') {
    return;
  }
  try {
    const purged = await purgeUnusedUploads();
    if (purged > 0) {
      console.log(`Purged ${purged} unused uploads`);
    }
  } catch (err) {
    console.error(`Purging unused uploads failed: ${err.message}`);
  }
}

// Connect in the background so the API is up even if the database is not.
// Purge on start too: a host that sleeps when idle may never reach the hour.
connectDB(env.mongodbUri).then(purgeUploads);
setInterval(purgeUploads, HOUR).unref();
