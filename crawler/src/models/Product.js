import mongoose from 'mongoose';
import { BRANDS, CATEGORIES } from './constants.js';

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    sourceId: { type: String, required: true },
    alt: String,
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    brand: { type: String, required: true, enum: BRANDS },
    // Brand reference / style code, normalized: uppercase, no spaces.
    ref: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, required: true, enum: CATEGORIES },
    collection: String,
    description: String,
    specs: { type: mongoose.Schema.Types.Mixed, default: {} },
    images: [imageSchema],
  },
  // `collection` is a field here, so name the MongoDB collection explicitly.
  { timestamps: true, collection: 'products', suppressReservedKeysWarning: true },
);

productSchema.index({ brand: 1, ref: 1 }, { unique: true });
productSchema.index({ name: 'text', collection: 'text', ref: 'text' });

export const Product = mongoose.model('Product', productSchema);
