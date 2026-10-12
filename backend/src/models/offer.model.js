import mongoose from 'mongoose';
import { readOnlySchema } from './read-only-schema.js';

// In display order.
export const MARKETS = ['VN', 'SG', 'HK'];

// Crawler-owned, read-only. See docs/DATA.md `offers`.
const offerSchema = readOnlySchema(
  {
    productId: mongoose.Schema.Types.ObjectId,
    source: {
      id: String,
      name: String,
      type: { type: String },
      market: String,
    },
    url: String,
    currency: String,
    price: Number,
    available: Boolean,
    lastSeenAt: Date,
  },
  { collection: 'offers' },
);

export const Offer = mongoose.model('Offer', offerSchema);
