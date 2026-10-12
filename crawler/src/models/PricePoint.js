import mongoose from 'mongoose';
import { CURRENCIES, MARKETS, ORIGINS } from './constants.js';

const pricePointSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sourceId: { type: String, required: true },
    market: { type: String, required: true, enum: MARKETS },
    currency: { type: String, required: true, enum: CURRENCIES },
    price: { type: Number, required: true },
    observedAt: { type: Date, required: true },
    origin: { type: String, required: true, enum: ORIGINS },
    archiveUrl: String,
  },
  { collection: 'price_points', versionKey: false },
);

pricePointSchema.index({ productId: 1, market: 1, observedAt: 1 });

export const PricePoint = mongoose.model('PricePoint', pricePointSchema);
