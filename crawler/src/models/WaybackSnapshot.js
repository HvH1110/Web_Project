import { createHash } from 'node:crypto';
import mongoose from 'mongoose';
import { captureQuarter } from '../lib/wayback.js';

// Crawler-internal (the backend ignores it): which archived snapshots the
// Wayback backfill has found and processed, so each run picks up where the
// last one stopped. At most one snapshot per page per quarter. Kept small: it
// holds hundreds of thousands of documents on a 512 MB database.
const waybackSnapshotSchema = new mongoose.Schema(
  {
    _id: String, // snapshotId(): a short hash of source, page and quarter
    sourceId: { type: String, required: true },
    // The URL exactly as archived (the page URL is normalizeUrl(original)).
    // Dropped once the snapshot turns out to be no-data or missing.
    original: String,
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

// Only the queue itself is indexed: it shrinks as snapshots are processed.
waybackSnapshotSchema.index({ sourceId: 1, timestamp: -1 }, { partialFilterExpression: { status: 'pending' } });

// One id per source, page (normalized URL) and quarter: 16 characters instead
// of the URL, which would be stored again in the _id index.
export function snapshotId(sourceId, url, timestamp) {
  return createHash('sha1').update(`${sourceId}|${url}|${captureQuarter(timestamp)}`).digest('base64url').slice(0, 16);
}

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
