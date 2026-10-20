import mongoose from 'mongoose';

export const USER_ROLES = ['member', 'moderator', 'admin'];

const userSchema = new mongoose.Schema(
  {
    // Stored lowercase; the login key.
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // scrypt hash from services/password.service.js. Never returned by default.
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, required: true, trim: true },
    role: { type: String, enum: USER_ROLES, default: 'member' },
  },
  { timestamps: true },
);

// Display names are unique ignoring case ("An" and "an" clash), not accents.
userSchema.index({ displayName: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export const User = mongoose.model('User', userSchema);
