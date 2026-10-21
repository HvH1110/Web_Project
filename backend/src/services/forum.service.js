import { Brand } from '../models/brand.model.js';
import { ForumReply } from '../models/forum-reply.model.js';
import { ForumTopic } from '../models/forum-topic.model.js';
import { User } from '../models/user.model.js';
import { httpError } from '../utils/http-error.js';
import { OBJECT_ID } from '../utils/forum-fields.js';
import { getBrandNames } from './products.service.js';
import { attachUploads, deleteUploads, detachUploads, toImageDto } from './uploads.service.js';
import { BANNED_MESSAGE, isBanned, isModerator } from './users.service.js';

export const TOPIC_BODY_MAX = 10_000;
export const REPLY_BODY_MAX = 5_000;
const EXCERPT_LENGTH = 200;

function sameId(a, b) {
  return String(a) === String(b);
}

// Hidden posts are shown only to moderators and to their author.
export function visibleFilter(user) {
  return isModerator(user) ? {} : { $or: [{ hiddenAt: null }, { authorId: user._id }] };
}

function canView(post, user) {
  return !post.hiddenAt || isModerator(user) || sameId(post.authorId, user._id);
}

// The topic, or 404 when it doesn't exist or the user may not see it.
export async function findTopic(id, user) {
  const topic = OBJECT_ID.test(id) ? await ForumTopic.findById(id).lean() : null;
  if (!topic || !canView(topic, user)) {
    throw httpError(404, 'Topic not found');
  }
  return topic;
}

// The reply and its topic, or 404 when the user may not see them.
export async function findReply(id, user) {
  const reply = OBJECT_ID.test(id) ? await ForumReply.findById(id).lean() : null;
  const topic = reply ? await ForumTopic.findById(reply.topicId).lean() : null;
  if (!reply || !topic || !canView(reply, user) || !canView(topic, user)) {
    throw httpError(404, 'Reply not found');
  }
  return { reply, topic };
}

// Why the user may not edit `post` (a topic, or a reply in `topic`), or null.
// Moderators can still edit their own posts in locked or hidden topics.
export function editRefusal(post, topic, user) {
  if (!sameId(post.authorId, user._id)) {
    return 'Only the author can edit this post';
  }
  if (isBanned(user)) {
    return BANNED_MESSAGE;
  }
  if (isModerator(user)) {
    return null;
  }
  if (topic.locked) {
    return 'This topic is locked';
  }
  if (post.hiddenAt || topic.hiddenAt) {
    return 'This post was hidden by a moderator';
  }
  return null;
}

// Why the user may not reply in `topic`, or null.
export function replyRefusal(topic, user) {
  if (isBanned(user)) {
    return BANNED_MESSAGE;
  }
  if (isModerator(user)) {
    return null;
  }
  if (topic.locked) {
    return 'This topic is locked';
  }
  if (topic.hiddenAt) {
    return 'This topic was hidden by a moderator';
  }
  return null;
}

export function canDelete(post, user) {
  return sameId(post.authorId, user._id) || isModerator(user);
}

// A brand slug from the request: undefined when not given, null to clear.
export async function parseBrand(body) {
  const value = body?.brand;
  if (value === undefined || value === null || value === '') {
    return value === undefined ? undefined : null;
  }
  if (typeof value !== 'string' || !(await Brand.exists({ slug: value }))) {
    throw httpError(400, 'brand is not a known brand slug');
  }
  return value;
}

// ForumAuthor in docs/API.md, by user id. Missing users are left out.
export async function loadAuthors(posts) {
  const ids = [...new Set(posts.map((post) => String(post.authorId)))];
  const users = await User.find({ _id: { $in: ids } }).select('displayName role').lean();
  return new Map(users.map((user) => [String(user._id), { id: String(user._id), displayName: user.displayName, role: user.role }]));
}

function hiddenDto(post) {
  return post.hiddenAt ? { at: post.hiddenAt, reason: post.hiddenReason } : null;
}

function brandDto(slug, brandNames) {
  return slug ? { slug, name: brandNames.get(slug) ?? slug } : null;
}

function excerpt(body) {
  const text = body.replace(/\s+/g, ' ').trim();
  const chars = [...text];
  return chars.length > EXCERPT_LENGTH ? `${chars.slice(0, EXCERPT_LENGTH - 1).join('').trimEnd()}…` : text;
}

// TopicSummary in docs/API.md.
export function toTopicSummary(topic, authors, brandNames) {
  return {
    id: String(topic._id),
    title: topic.title,
    excerpt: excerpt(topic.body),
    brand: brandDto(topic.brand, brandNames),
    author: authors.get(String(topic.authorId)) ?? null,
    thumbnail: topic.images.length > 0 ? toImageDto(topic.images[0]) : null,
    imageCount: topic.images.length,
    replyCount: topic.replyCount,
    pinned: topic.pinned,
    locked: topic.locked,
    hidden: hiddenDto(topic),
    createdAt: topic.createdAt,
    lastActivityAt: topic.lastActivityAt,
  };
}

// Topic in docs/API.md.
export function toTopicDetail(topic, authors, brandNames, user) {
  return {
    id: String(topic._id),
    title: topic.title,
    body: topic.body,
    brand: brandDto(topic.brand, brandNames),
    author: authors.get(String(topic.authorId)) ?? null,
    images: topic.images.map(toImageDto),
    replyCount: topic.replyCount,
    pinned: topic.pinned,
    locked: topic.locked,
    hidden: hiddenDto(topic),
    createdAt: topic.createdAt,
    editedAt: topic.editedAt,
    lastActivityAt: topic.lastActivityAt,
    permissions: {
      edit: editRefusal(topic, topic, user) === null,
      delete: canDelete(topic, user),
      reply: replyRefusal(topic, user) === null,
      moderate: isModerator(user),
    },
  };
}

// Reply in docs/API.md.
export function toReplyDto(reply, topic, authors, user) {
  return {
    id: String(reply._id),
    topicId: String(reply.topicId),
    body: reply.body,
    author: authors.get(String(reply.authorId)) ?? null,
    images: reply.images.map(toImageDto),
    hidden: hiddenDto(reply),
    createdAt: reply.createdAt,
    editedAt: reply.editedAt,
    permissions: {
      edit: editRefusal(reply, topic, user) === null,
      delete: canDelete(reply, user),
      moderate: isModerator(user),
    },
  };
}

// { topic: Topic } response body.
export async function topicResponse(topic, user) {
  const [authors, brandNames] = await Promise.all([loadAuthors([topic]), getBrandNames()]);
  return { topic: toTopicDetail(topic, authors, brandNames, user) };
}

// { reply: Reply } response body.
export async function replyResponse(reply, topic, user) {
  const authors = await loadAuthors([reply]);
  return { reply: toReplyDto(reply, topic, authors, user) };
}

// Saves `changes` to a topic or reply, replacing its images when `imageIds`
// is given. Removed images are deleted.
export async function saveWithImages(Model, post, kind, imageIds, changes) {
  const target = { kind, id: post._id };
  const currentIds = new Set(post.images.map((image) => String(image.uploadId)));
  let newIds = [];
  if (imageIds !== undefined) {
    newIds = imageIds.filter((id) => !currentIds.has(id));
    changes.images = await attachUploads(post.authorId, imageIds, target, currentIds);
  }
  let updated;
  try {
    updated = await Model.findByIdAndUpdate(post._id, changes, { returnDocument: 'after' }).lean();
  } catch (err) {
    await detachUploads(newIds, target);
    throw err;
  }
  if (!updated) {
    // Deleted meanwhile.
    await detachUploads(newIds, target);
    throw httpError(404, kind === 'topic' ? 'Topic not found' : 'Reply not found');
  }
  if (imageIds !== undefined) {
    const removed = [...currentIds].filter((id) => !imageIds.includes(id));
    if (removed.length > 0) {
      await deleteUploads({ _id: { $in: removed }, 'attachedTo.id': post._id });
    }
  }
  return updated;
}
