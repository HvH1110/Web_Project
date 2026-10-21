import mongoose from 'mongoose';
import { ForumReply } from '../models/forum-reply.model.js';
import { ForumTopic } from '../models/forum-topic.model.js';
import {
  TOPIC_BODY_MAX,
  canDelete,
  editRefusal,
  findTopic,
  loadAuthors,
  parseBrand,
  saveWithImages,
  topicResponse,
  toTopicSummary,
  visibleFilter,
} from '../services/forum.service.js';
import { getBrandNames } from '../services/products.service.js';
import { MAX_IMAGES_PER_POST, attachUploads, deleteUploads, detachUploads } from '../services/uploads.service.js';
import { OBJECT_ID, parseImageIds, parseText, parseTitle } from '../utils/forum-fields.js';
import { httpError } from '../utils/http-error.js';
import { enumParam, intParam, stringParam } from '../utils/query.js';
import { searchTerms, termRegex } from '../utils/search.js';

const TOPIC_SORTS = ['activity', 'newest'];
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function listTopics(req, res) {
  const q = stringParam(req.query, 'q');
  const brand = stringParam(req.query, 'brand');
  const author = stringParam(req.query, 'author');
  const sort = enumParam(req.query, 'sort', TOPIC_SORTS, 'activity');
  const page = intParam(req.query, 'page', { fallback: 1 });
  const limit = intParam(req.query, 'limit', { max: MAX_LIMIT, fallback: DEFAULT_LIMIT });
  if (author !== undefined && !OBJECT_ID.test(author)) {
    throw httpError(400, 'author must be a member id');
  }

  const filters = [visibleFilter(req.user)];
  if (brand) {
    filters.push({ brand });
  }
  if (author) {
    filters.push({ authorId: author });
  }
  for (const term of searchTerms(q ?? '')) {
    const regex = termRegex(term);
    filters.push({ $or: [{ title: regex }, { body: regex }] });
  }
  const filter = { $and: filters };
  // Pinned topics come first only in the default order.
  const order = sort === 'newest' ? { createdAt: -1, _id: -1 } : { pinned: -1, lastActivityAt: -1, _id: -1 };

  const [topics, total] = await Promise.all([
    ForumTopic.find(filter)
      .sort(order)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ForumTopic.countDocuments(filter),
  ]);
  const [authors, brandNames] = await Promise.all([loadAuthors(topics), getBrandNames()]);

  res.json({
    items: topics.map((topic) => toTopicSummary(topic, authors, brandNames)),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
}

export async function createTopic(req, res) {
  const title = parseTitle(req.body);
  const body = parseText(req.body, 'body', { min: 1, max: TOPIC_BODY_MAX });
  const brand = (await parseBrand(req.body)) ?? null;
  const imageIds = parseImageIds(req.body, MAX_IMAGES_PER_POST) ?? [];

  // The id is chosen first so the images can be attached before saving.
  const target = { kind: 'topic', id: new mongoose.Types.ObjectId() };
  const images = await attachUploads(req.user._id, imageIds, target);
  let topic;
  try {
    topic = await ForumTopic.create({ _id: target.id, authorId: req.user._id, title, body, brand, images });
  } catch (err) {
    await detachUploads(imageIds, target);
    throw err;
  }

  res.status(201).json(await topicResponse(topic.toObject(), req.user));
}

export async function getTopic(req, res) {
  const topic = await findTopic(req.params.id, req.user);
  res.json(await topicResponse(topic, req.user));
}

export async function updateTopic(req, res) {
  const topic = await findTopic(req.params.id, req.user);
  const refusal = editRefusal(topic, topic, req.user);
  if (refusal) {
    throw httpError(403, refusal);
  }
  const title = parseTitle(req.body, { optional: true });
  const body = parseText(req.body, 'body', { min: 1, max: TOPIC_BODY_MAX, optional: true });
  const brand = await parseBrand(req.body);
  const imageIds = parseImageIds(req.body, MAX_IMAGES_PER_POST);
  if ([title, body, brand, imageIds].every((value) => value === undefined)) {
    throw httpError(400, 'Nothing to update: send title, body, brand or images');
  }

  const changes = { editedAt: new Date() };
  if (title !== undefined) changes.title = title;
  if (body !== undefined) changes.body = body;
  if (brand !== undefined) changes.brand = brand;
  const updated = await saveWithImages(ForumTopic, topic, 'topic', imageIds, changes);

  res.json(await topicResponse(updated, req.user));
}

// Deletes the topic with all its replies and images.
export async function deleteTopic(req, res) {
  const topic = await findTopic(req.params.id, req.user);
  if (!canDelete(topic, req.user)) {
    throw httpError(403, 'Only the author or a moderator can delete this topic');
  }
  const replyIds = await ForumReply.find({ topicId: topic._id }).distinct('_id');
  await ForumTopic.deleteOne({ _id: topic._id });
  await ForumReply.deleteMany({ topicId: topic._id });
  await deleteUploads({ 'attachedTo.id': { $in: [topic._id, ...replyIds] } });

  res.status(204).end();
}
