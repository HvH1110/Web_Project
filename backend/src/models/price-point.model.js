import mongoose from 'mongoose';
import { readOnlySchema } from './read-only-schema.js';

// Crawler-owned, read-only. See docs/DATA.md `price_points`.
const pricePointSchema = readOnlySchema(
  {
    productId: mongoose.Schema.Types.ObjectId,
    sourceId: String,
    market: String,
    currency: String,
    price: Number,
    observedAt: Date,
    origin: String,
    archiveUrl: String,
  },
  { collection: 'price_points' },
);

export const PricePoint = mongoose.model('PricePoint', pricePointSchema);
