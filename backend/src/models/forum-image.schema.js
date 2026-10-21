import mongoose from 'mongoose';

// An image attached to a topic or reply, copied from its Upload so reading a
// post needs no extra query.
export const forumImageSchema = new mongoose.Schema(
  {
    uploadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload', required: true },
    key: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  { _id: false },
);
