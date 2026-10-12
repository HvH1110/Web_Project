// Upserts the brands in scripts/data/brands.js into the `brands` collection,
// matched by slug. Safe to re-run; brands missing from the file are left alone.
// Usage (from backend/): npm run seed:brands
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { Brand } from '../src/models/brand.model.js';
import { brands } from './data/brands.js';

if (!env.mongodbUri) {
  console.error('MONGODB_URI is not set in backend/.env');
  process.exit(1);
}

try {
  // Fail on bad data before touching the database.
  await Promise.all(brands.map((brand) => new Brand(brand).validate()));

  await mongoose.connect(env.mongodbUri);
  // Builds the unique slug index before the upserts rely on it.
  await Brand.init();
  const result = await Brand.bulkWrite(
    brands.map((brand) => ({
      updateOne: { filter: { slug: brand.slug }, update: { $set: brand }, upsert: true },
    })),
  );
  console.log(`Brands seeded: ${result.upsertedCount} inserted, ${result.matchedCount} updated.`);
} catch (err) {
  // Log only the message: connection errors can carry connection details.
  console.error(`Seeding brands failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
