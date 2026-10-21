import mongoose from 'mongoose';
import { forumImageSchema } from './forum-image.schema.js';

const forumReplySchema = new mongoose.Schema(
  {
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumTopic', required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // May be empty when the reply has images.
    body: { type: String, default: '' },
    images: { type: [forumImageSchema], default: [] },
    hiddenAt: { type: Date, default: null },
    hiddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    hiddenReason: { type: String, default: null },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'forum_replies' },
);

forumReplySchema.index({ topicId: 1, createdAt: 1 });

export const ForumReply = mongoose.model('ForumReply', forumReplySchema);
