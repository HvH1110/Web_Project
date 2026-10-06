import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';

app.listen(env.port, (err) => {
  if (err) {
    console.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
  console.log(`Server listening on http://localhost:${env.port}`);
});

// Connect in the background so the API is up even if the database is not.
connectDB(env.mongodbUri);
