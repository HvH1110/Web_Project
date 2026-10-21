import { ForumReply } from '../models/forum-reply.model.js';
import { ForumTopic } from '../models/forum-topic.model.js';
import { User } from '../models/user.model.js';
import { findReply, findTopic, replyResponse, topicResponse } from '../services/forum.service.js';
import { isBanned } from '../services/users.service.js';
import { OBJECT_ID, parseBoolean, parseReason } from '../utils/forum-fields.js';
import { httpError } from '../utils/http-error.js';

// Moderator routes (requireModerator runs first).

function hideChanges(hidden, user, reason) {
  return hidden
    ? { hiddenAt: new Date(), hiddenBy: user._id, hiddenReason: reason }
    : { hiddenAt: null, hiddenBy: null, hiddenReason: null };
}

export async function moderateTopic(req, res) {
  const topic = await findTopic(req.params.id, req.user);
  const pinned = parseBoolean(req.body, 'pinned');
  const locked = parseBoolean(req.body, 'locked');
  const hidden = parseBoolean(req.body, 'hidden');
  const reason = parseReason(req.body);
  if ([pinned, locked, hidden].every((value) => value === undefined)) {
    throw httpError(400, 'Nothing to change: send pinned, locked or hidden');
  }

  const changes = {};
  if (pinned !== undefined) changes.pinned = pinned;
  if (locked !== undefined) changes.locked = locked;
  // Hiding again only updates the reason, not the date.
  if (hidden !== undefined && hidden !== Boolean(topic.hiddenAt)) {
    Object.assign(changes, hideChanges(hidden, req.user, reason));
  } else if (hidden && reason) {
    changes.hiddenReason = reason;
  }
  const updated = await ForumTopic.findByIdAndUpdate(topic._id, changes, { returnDocument: 'after' }).lean();
  if (!updated) {
    throw httpError(404, 'Topic not found');
  }

  res.json(await topicResponse(updated, req.user));
}

export async function moderateReply(req, res) {
  const { reply, topic } = await findReply(req.params.id, req.user);
  const hidden = parseBoolean(req.body, 'hidden');
  const reason = parseReason(req.body);
  if (hidden === undefined) {
    throw httpError(400, 'hidden must be true or false');
  }

  let updated;
  if (hidden === Boolean(reply.hiddenAt)) {
    const changes = hidden && reason ? { hiddenReason: reason } : {};
    updated = await ForumReply.findByIdAndUpdate(reply._id, changes, { returnDocument: 'after' }).lean();
  } else {
    // Conditional on the current state, so replyCount moves once even if two
    // moderators click at the same time.
    updated = await ForumReply.findOneAndUpdate(
      { _id: reply._id, hiddenAt: hidden ? null : { $ne: null } },
      hideChanges(hidden, req.user, reason),
      { returnDocument: 'after' },
    ).lean();
    if (updated) {
      await ForumTopic.updateOne({ _id: topic._id }, { $inc: { replyCount: hidden ? -1 : 1 } });
    } else {
      updated = await ForumReply.findById(reply._id).lean();
    }
  }
  if (!updated) {
    throw httpError(404, 'Reply not found');
  }

  res.json(await replyResponse(updated, topic, req.user));
}

// Bans a member from posting, or lifts the ban. Moderators can ban members;
// only admins can ban moderators; admins can't be banned.
export async function moderateMember(req, res) {
  const target = OBJECT_ID.test(req.params.id) ? await User.findById(req.params.id).lean() : null;
  if (!target) {
    throw httpError(404, 'Member not found');
  }
  const banned = parseBoolean(req.body, 'banned');
  const reason = parseReason(req.body);
  if (banned === undefined) {
    throw httpError(400, 'banned must be true or false');
  }
  if (String(target._id) === String(req.user._id)) {
    throw httpError(403, 'You cannot moderate your own account');
  }
  if (target.role === 'admin') {
    throw httpError(403, 'Admins cannot be banned');
  }
  if (target.role === 'moderator' && req.user.role !== 'admin') {
    throw httpError(403, 'Only an admin can ban a moderator');
  }

  const changes = banned
    ? { bannedAt: target.bannedAt ?? new Date(), banReason: reason }
    : { bannedAt: null, banReason: null };
  const updated = await User.findByIdAndUpdate(target._id, changes, { returnDocument: 'after' }).lean();
  if (!updated) {
    throw httpError(404, 'Member not found');
  }

  res.json({
    member: {
      id: String(updated._id),
      displayName: updated.displayName,
      role: updated.role,
      banned: isBanned(updated),
      bannedAt: updated.bannedAt,
      banReason: updated.banReason,
    },
  });
}
