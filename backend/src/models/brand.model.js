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

// A freely licensed photo of the house (e.g. a boutique from Wikimedia Commons),
// shown when no product picture loads. Credit and license must be shown with it.
const photoSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true, match: /^https:\/\// },
    alt: { type: String, required: true, trim: true },
    // The photographer, as the license asks to credit them.
    credit: { type: String, required: true, trim: true },
    // The file's page, where the license is stated.
    sourceUrl: { type: String, required: true, trim: true, match: /^https:\/\// },
    license: { type: String, required: true, trim: true },
    licenseUrl: { type: String, default: null, trim: true },
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
    photo: { type: photoSchema, default: null },
    // `draft` until the editorial text has been reviewed.
    contentStatus: { type: String, enum: ['draft', 'reviewed'], default: 'draft' },
  },
  { timestamps: true },
);

export const Brand = mongoose.model('Brand', brandSchema);
