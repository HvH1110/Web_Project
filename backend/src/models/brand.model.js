import mongoose from 'mongoose';

export const BRAND_CATEGORIES = ['fashion', 'jewelry', 'watches'];

// Owned by the backend; filled by scripts/seed-brands.js. Products link to a
// brand through its slug (docs/DATA.md).
const signatureProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    year: { type: Number, default: null },
    description: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const brandSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: BRAND_CATEGORIES },
    // Position on the home page.
    order: { type: Number, required: true },
    foundedYear: { type: Number, required: true },
    founder: { type: String, required: true, trim: true },
    // Where the house was founded.
    city: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    history: { type: String, required: true, trim: true },
    signatureProducts: { type: [signatureProductSchema], default: [] },
    // `draft` until the editorial text has been reviewed.
    contentStatus: { type: String, enum: ['draft', 'reviewed'], default: 'draft' },
  },
  { timestamps: true },
);

export const Brand = mongoose.model('Brand', brandSchema);
