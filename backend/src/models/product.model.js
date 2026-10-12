import mongoose from 'mongoose';
import { readOnlySchema } from './read-only-schema.js';

// Crawler-owned, read-only. See docs/DATA.md `products`.
const productSchema = readOnlySchema(
  {
    brand: String,
    ref: String,
    name: String,
    category: String,
    collection: String,
    description: String,
    specs: mongoose.Schema.Types.Mixed,
    images: [{ _id: false, url: String, sourceId: String, alt: String }],
    createdAt: Date,
    updatedAt: Date,
  },
  // `collection` is a field in DATA.md; we only read plain objects, so the clash is harmless.
  { collection: 'products', suppressReservedKeysWarning: true },
);

export const Product = mongoose.model('Product', productSchema);
