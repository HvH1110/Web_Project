import mongoose from 'mongoose';
import { ForumReply } from '../models/forum-reply.model.js';
import { ForumTopic } from '../models/forum-topic.model.js';
import {
  REPLY_BODY_MAX,
  canDelete,
  editRefusal,
  findReply,
  findTopic,
  loadAuthors,
  replyRefusal,
  replyResponse,
  saveWithImages,
  toReplyDto,
  visibleFilter,
} from '../services/forum.service.js';
import { MAX_IMAGES_PER_POST, attachUploads, deleteUploads, detachUploads } from '../services/uploads.service.js';
import { parseImageIds, parseText } from '../utils/forum-fields.js';
import { httpError } from '../utils/http-error.js';
import { intParam } from '../utils/query.js';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const EMPTY_REPLY = 'A reply needs body text or at least one image';

// Oldest first.
export async function listReplies(req, res) {
  const topic = await findTopic(req.params.id, req.user);
  const page = intParam(req.query, 'page', { fallback: 1 });
  const limit = intParam(req.query, 'limit', { max: MAX_LIMIT, fallback: DEFAULT_LIMIT });

  const filter = { topicId: topic._id, ...visibleFilter(req.user) };
  const [replies, total] = await Promise.all([
    ForumReply.find(filter)
      .sort({ createdAt: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ForumReply.countDocuments(filter),
  ]);
  const authors = await loadAuthors(replies);

  res.json({
    items: replies.map((reply) => toReplyDto(reply, topic, authors, req.user)),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
}

export async function createReply(req, res) {
  const topic = await findTopic(req.params.id, req.user);
  const refusal = replyRefusal(topic, req.user);
  if (refusal) {
    throw httpError(403, refusal);
  }
  const body = parseText(req.body, 'body', { min: 0, max: REPLY_BODY_MAX, optional: true }) ?? '';
  const imageIds = parseImageIds(req.body, MAX_IMAGES_PER_POST) ?? [];
  if (body === '' && imageIds.length === 0) {
    throw httpError(400, EMPTY_REPLY);
  }

  const target = { kind: 'reply', id: new mongoose.Types.ObjectId() };
  const images = await attachUploads(req.user._id, imageIds, target);
  let reply;
  try {
    reply = await ForumReply.create({ _id: target.id, topicId: topic._id, authorId: req.user._id, body, images });
  } catch (err) {
    await detachUploads(imageIds, target);
    throw err;
  }
  await ForumTopic.updateOne(
    { _id: topic._id },
    { $inc: { replyCount: 1 }, $max: { lastActivityAt: reply.createdAt } },
  );

  res.status(201).json(await replyResponse(reply.toObject(), topic, req.user));
}

export async function updateReply(req, res) {
  const { reply, topic } = await findReply(req.params.id, req.user);
  const refusal = editRefusal(reply, topic, req.user);
  if (refusal) {
    throw httpError(403, refusal);
  }
  const body = parseText(req.body, 'body', { min: 0, max: REPLY_BODY_MAX, optional: true });
  const imageIds = parseImageIds(req.body, MAX_IMAGES_PER_POST);
  if (body === undefined && imageIds === undefined) {
    throw httpError(400, 'Nothing to update: send body or images');
  }
  if ((body ?? reply.body) === '' && (imageIds ?? reply.images).length === 0) {
    throw httpError(400, EMPTY_REPLY);
  }

  const changes = { editedAt: new Date() };
  if (body !== undefined) changes.body = body;
  const updated = await saveWithImages(ForumReply, reply, 'reply', imageIds, changes);

  res.json(await replyResponse(updated, topic, req.user));
}

export async function deleteReply(req, res) {
  const { reply, topic } = await findReply(req.params.id, req.user);
  if (!canDelete(reply, req.user)) {
    throw httpError(403, 'Only the author or a moderator can delete this reply');
  }
  const deleted = await ForumReply.findOneAndDelete({ _id: reply._id }).lean();
  // Hidden replies are already left out of replyCount.
  if (deleted && !deleted.hiddenAt) {
    await ForumTopic.updateOne({ _id: topic._id }, { $inc: { replyCount: -1 } });
  }
  await deleteUploads({ 'attachedTo.id': reply._id });

  res.status(204).end();
}
