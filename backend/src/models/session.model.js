import mongoose from 'mongoose';

// A login session. The cookie holds a random token; only its SHA-256 hash is
// stored, so a database leak doesn't hand out live sessions.
const sessionSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// MongoDB deletes expired sessions by itself (within about a minute).
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.model('Session', sessionSchema);
