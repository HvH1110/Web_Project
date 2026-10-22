import mongoose from 'mongoose';

// Crawler-internal (the backend ignores it): which archived snapshots the
// Wayback backfill has found and processed, so each run picks up where the
// last one stopped. At most one snapshot per page per quarter.
const waybackSnapshotSchema = new mongoose.Schema(
  {
    _id: String, // `${sourceId}|${url}|${YYYY}Q${1-4}`
    sourceId: { type: String, required: true },
    url: { type: String, required: true }, // the product page URL, normalized
    original: { type: String, required: true }, // the URL exactly as archived
    timestamp: { type: String, required: true }, // Wayback timestamp, YYYYMMDDhhmmss
    // pending | saved | no-price | no-data (no product data / out of scope) | missing | error
    status: { type: String, required: true, default: 'pending' },
    ref: String,
    price: Number,
    error: String,
    checkedAt: Date,
  },
  { collection: 'wayback_snapshots', versionKey: false },
);

waybackSnapshotSchema.index({ sourceId: 1, status: 1, timestamp: -1 });

// Per source and URL prefix: past years already indexed (a whole-history
// query is too heavy for the index, so it goes one year at a time) and the
// newest capture seen, so the next run only asks for newer captures.
const waybackIndexSchema = new mongoose.Schema(
  {
    _id: String, // `${sourceId}|${prefix}`
    yearsDone: [Number],
    lastTimestamp: String,
    indexedAt: Date,
  },
  { collection: 'wayback_index', versionKey: false },
);

export const WaybackSnapshot = mongoose.model('WaybackSnapshot', waybackSnapshotSchema);
export const WaybackIndex = mongoose.model('WaybackIndex', waybackIndexSchema);
