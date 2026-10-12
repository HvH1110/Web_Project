import mongoose from 'mongoose';
import { readOnlySchema } from './read-only-schema.js';

// Crawler-owned, read-only. See docs/DATA.md `fx_rates`.
const fxRateSchema = readOnlySchema(
  {
    date: String,
    vndPer: { SGD: Number, HKD: Number, USD: Number },
    source: String,
  },
  { collection: 'fx_rates' },
);

export const FxRate = mongoose.model('FxRate', fxRateSchema);
