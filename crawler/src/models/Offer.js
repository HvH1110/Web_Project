import mongoose from 'mongoose';
import { CURRENCIES, MARKETS, SOURCE_TYPES } from './constants.js';

const offerSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    source: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      type: { type: String, required: true, enum: SOURCE_TYPES },
      market: { type: String, required: true, enum: MARKETS },
    },
    url: { type: String, required: true },
    currency: { type: String, required: true, enum: CURRENCIES },
    price: { type: Number, default: null },
    available: { type: Boolean, default: null },
    lastSeenAt: { type: Date, required: true },
  },
  { collection: 'offers', versionKey: false },
);

offerSchema.index({ productId: 1, 'source.id': 1 }, { unique: true });
offerSchema.index({ 'source.market': 1 });

export const Offer = mongoose.model('Offer', offerSchema);
