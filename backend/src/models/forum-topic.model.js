import mongoose from 'mongoose';
import { forumImageSchema } from './forum-image.schema.js';

const forumTopicSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    // Optional brand slug the topic is about.
    brand: { type: String, default: null },
    images: { type: [forumImageSchema], default: [] },
    // Replies not hidden by a moderator.
    replyCount: { type: Number, default: 0 },
    // Creation of the topic or of its latest reply; the default sort.
    lastActivityAt: { type: Date, default: Date.now },
    pinned: { type: Boolean, default: false },
    // No new replies or edits, except by moderators.
    locked: { type: Boolean, default: false },
    // Set when a moderator hides the topic.
    hiddenAt: { type: Date, default: null },
    hiddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    hiddenReason: { type: String, default: null },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'forum_topics' },
);

forumTopicSchema.index({ pinned: -1, lastActivityAt: -1 });
forumTopicSchema.index({ brand: 1, pinned: -1, lastActivityAt: -1 });

export const ForumTopic = mongoose.model('ForumTopic', forumTopicSchema);
