import mongoose from 'mongoose';

const fxRateSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    vndPer: {
      SGD: Number,
      HKD: Number,
      USD: Number,
    },
    source: { type: String, required: true },
  },
  { collection: 'fx_rates', versionKey: false },
);

export const FxRate = mongoose.model('FxRate', fxRateSchema);
