import mongoose from 'mongoose';

export const UPLOAD_KINDS = ['topic', 'reply'];

// An image a member uploaded for the forum. The file itself is in the storage
// service (services/storage/), never in MongoDB. Until a topic or reply uses
// it, `attachedTo` is null, and unused uploads are purged after a day.
const uploadSchema = new mongoose.Schema(
  {
    // Path of the file in storage, e.g. "forum/3q2b….webp".
    key: { type: String, required: true, unique: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    size: { type: Number, required: true },
    attachedTo: {
      type: new mongoose.Schema(
        {
          kind: { type: String, enum: UPLOAD_KINDS, required: true },
          id: { type: mongoose.Schema.Types.ObjectId, required: true },
        },
        { _id: false },
      ),
      default: null,
    },
  },
  { timestamps: true },
);

uploadSchema.index({ 'attachedTo.id': 1 });
uploadSchema.index({ attachedTo: 1, createdAt: 1 });

export const Upload = mongoose.model('Upload', uploadSchema);
