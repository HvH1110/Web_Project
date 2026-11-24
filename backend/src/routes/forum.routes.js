import { Router } from 'express';
import { moderateMember, moderateReply, moderateTopic } from '../controllers/forum-moderation.controller.js';
import { createReply, deleteReply, listReplies, updateReply } from '../controllers/forum-replies.controller.js';
import { createTopic, deleteTopic, getTopic, listTopics, updateTopic } from '../controllers/forum-topics.controller.js';
import { uploadImage } from '../controllers/forum-uploads.controller.js';
import { requireModerator, requireNotBanned, requireUser } from '../middleware/auth.js';
import { imageUpload, uploadSlot } from '../middleware/image-upload.js';
import { rateLimit } from '../middleware/rate-limit.js';

const MINUTE = 60 * 1000;
const byUser = (req) => String(req.user._id);

const router = Router();

// The forum is members-only, reading included.
router.use(requireUser);

/**
 * @api {get} /api/forum/topics List topics
 * @apiName ListTopics
 * @apiGroup Forum
 * @apiVersion 1.0.0
 * @apiPermission Member
 * @apiDescription The topic list. Hidden topics are left out, except for their author and moderators.
 *
 * @apiQuery {String{..100}} [q] Words that must all appear in the title or body, ignoring case and accents.
 * @apiQuery {String} [brand] Brand slug.
 * @apiQuery {String} [author] Member ID: only that member's topics.
 * @apiQuery {String="activity","newest"} [sort=activity] `activity`: pinned first, then latest activity. `newest`: newest first.
 * @apiQuery {Number{1-}} [page=1] Page number.
 * @apiQuery {Number{1-50}} [limit=20] Topics per page.
 *
 * @apiSuccess {Object[]} items The topics: `id`, `title`, `excerpt` (start of the body, at most 200 characters), `brand`, `author`, `thumbnail` (first image or `null`), `imageCount`, `replyCount`, `pinned`, `locked`, `hidden`, `createdAt`, `lastActivityAt`.
 * @apiUse Paging
 * @apiSuccessExample {json} Success
 *     HTTP/1.1 200 OK
 *     {
 *       "items": [
 *         {
 *           "id": "6720f3b10c1d2e3f40516273",
 *           "title": "Rolex Submariner: buy in Hong Kong or Singapore?",
 *           "excerpt": "The SG price looks lower after the latest rate change, but…",
 *           "brand": { "slug": "rolex", "name": "Rolex" },
 *           "author": { "id": "6720f1c2a1b2c3d4e5f60719", "displayName": "Nguyễn An", "role": "member" },
 *           "thumbnail": null,
 *           "imageCount": 0,
 *           "replyCount": 5,
 *           "pinned": false,
 *           "locked": false,
 *           "hidden": null,
 *           "createdAt": "2026-11-21T08:30:00.000Z",
 *           "lastActivityAt": "2026-11-21T10:12:00.000Z"
 *         }
 *       ],
 *       "page": 1,
 *       "limit": 20,
 *       "total": 42,
 *       "totalPages": 3
 *     }
 *
 * @apiError (Error 4xx) 400 `sort` is not allowed, `author` is not an ID, bad `page` or `limit`, or `q` above 100 characters.
 * @apiUse ErrorLogin
 * @apiUse ErrorRate
 * @apiUse ErrorDb
 */
router.get('/topics', listTopics);

/**
 * @api {post} /api/forum/topics Start a topic
 * @apiName CreateTopic
 * @apiGroup Forum
 * @apiVersion 1.0.0
 * @apiPermission Member
 * @apiDescription Creates a topic. Upload its images first with `POST /api/forum/uploads` and send their IDs.
 *
 * @apiBody {String{5..120}} title Title, one line (newlines become spaces).
 * @apiBody {String{1..10000}} body Plain text.
 * @apiBody {String} [brand] Slug of the house the topic is about.
 * @apiBody {String[]} [images] Up to 4 IDs of the member's own unused uploads, in display order.
 * @apiParamExample {json} Request
 *     { "title": "Rolex Submariner: buy in Hong Kong or Singapore?", "body": "…", "brand": "rolex", "images": ["6720f2aa0b1c2d3e4f506172"] }
 *
 * @apiUse TopicResponse
 *
 * @apiError (Error 4xx) 400 A field is missing or invalid; `brand is not a known brand slug`; `An image was not found, is not yours, or is already used in another post`.
 * @apiUse ErrorLogin
 * @apiUse ErrorBanned
 * @apiError (Error 4xx) 429 More than 10 topics in an hour.
 * @apiUse ErrorOrigin
 * @apiUse ErrorDb
 */
router.post('/topics', requireNotBanned, rateLimit({ windowMs: 60 * MINUTE, max: 10, key: byUser }), createTopic);

/**
 * @api {get} /api/forum/topics/:id Get a topic
 * @apiName GetTopic
 * @apiGroup Forum
 * @apiVersion 1.0.0
 * @apiPermission Member
 *
 * @apiParam {String} id Topic ID.
 *
 * @apiUse TopicResponse
 *
 * @apiError (Error 4xx) 404 `Topic not found` (also when it is hidden and the viewer is neither its author nor a moderator).
 * @apiUse ErrorLogin
 * @apiUse ErrorRate
 * @apiUse ErrorDb
 */
router.get('/topics/:id', getTopic);

/**
 * @api {patch} /api/forum/topics/:id Edit a topic
 * @apiName UpdateTopic
 * @apiGroup Forum
 * @apiVersion 1.0.0
 * @apiPermission Member
 * @apiDescription The author edits the topic. Send only the fields to change, at least one, with the same rules as when creating. `brand: null` removes the brand. `images` replaces the whole list; removed images are deleted.
 *
 * @apiParam {String} id Topic ID.
 * @apiBody {String{5..120}} [title] New title.
 * @apiBody {String{1..10000}} [body] New text.
 * @apiBody {String} [brand] Brand slug, or `null`.
 * @apiBody {String[]} [images] The full new list of image IDs.
 *
 * @apiUse TopicResponse
 *
 * @apiError (Error 4xx) 400 `Nothing to update: send title, body, brand or images`, or a field is invalid.
 * @apiUse ErrorLogin
 * @apiError (Error 4xx) 403 `Only the author can edit this post`, `This topic is locked`, `This post was hidden by a moderator`, or banned.
 * @apiError (Error 4xx) 404 `Topic not found`.
 * @apiUse ErrorOrigin
 * @apiUse ErrorDb
 */
router.patch('/topics/:id', updateTopic);

/**
 * @api {delete} /api/forum/topics/:id Delete a topic
 * @apiName DeleteTopic
 * @apiGroup Forum
 * @apiVersion 1.0.0
 * @apiPermission Member
 * @apiDescription The author or a moderator deletes the topic, with all its replies and images. Permanent.
 *
 * @apiParam {String} id Topic ID.
 *
 * @apiSuccessExample {text} Success
 *     HTTP/1.1 204 No Content
 *
 * @apiUse ErrorLogin
 * @apiError (Error 4xx) 403 `Only the author or a moderator can delete this topic`.
 * @apiError (Error 4xx) 404 `Topic not found`.
 * @apiUse ErrorOrigin
 * @apiUse ErrorDb
 */
router.delete('/topics/:id', deleteTopic);

/**
 * @api {patch} /api/forum/topics/:id/moderation Pin, lock or hide a topic
 * @apiName ModerateTopic
 * @apiGroup Moderation
 * @apiVersion 1.0.0
 * @apiPermission Moderator
 *
 * @apiParam {String} id Topic ID.
 * @apiBody {Boolean} [pinned] Show it first in the list.
 * @apiBody {Boolean} [locked] Stop new replies and edits.
 * @apiBody {Boolean} [hidden] Hide it from everyone but its author and moderators.
 * @apiBody {String{..200}} [reason] Why it was hidden, shown to the author.
 * @apiParamExample {json} Request
 *     { "hidden": true, "reason": "Off-topic" }
 *
 * @apiUse TopicResponse
 *
 * @apiError (Error 4xx) 400 `Nothing to change: send pinned, locked or hidden`, or a value is not a boolean.
 * @apiUse ErrorLogin
 * @apiError (Error 4xx) 403 `Moderators only`.
 * @apiError (Error 4xx) 404 `Topic not found`.
 * @apiUse ErrorOrigin
 * @apiUse ErrorDb
 */
router.patch('/topics/:id/moderation', requireModerator, moderateTopic);

/**
 * @api {get} /api/forum/topics/:id/replies List replies
 * @apiName ListReplies
 * @apiGroup Forum
 * @apiVersion 1.0.0
 * @apiPermission Member
 * @apiDescription The topic's replies, oldest first. `total` counts the replies this viewer sees, so for moderators it can be higher than `replyCount`.
 *
 * @apiParam {String} id Topic ID.
 * @apiQuery {Number{1-}} [page=1] Page number.
 * @apiQuery {Number{1-100}} [limit=50] Replies per page.
 *
 * @apiSuccess {Object[]} items The replies, each as in `POST /api/forum/topics/:id/replies`.
 * @apiUse Paging
 *
 * @apiError (Error 4xx) 400 Bad `page` or `limit`.
 * @apiUse ErrorLogin
 * @apiError (Error 4xx) 404 `Topic not found`.
 * @apiUse ErrorRate
 * @apiUse ErrorDb
 */
router.get('/topics/:id/replies', listReplies);

/**
 * @api {post} /api/forum/topics/:id/replies Reply to a topic
 * @apiName CreateReply
 * @apiGroup Forum
 * @apiVersion 1.0.0
 * @apiPermission Member
 *
 * @apiParam {String} id Topic ID.
 * @apiBody {String{..5000}} [body] Plain text. Optional when `images` has at least one ID.
 * @apiBody {String[]} [images] Up to 4 upload IDs, as for topics.
 * @apiParamExample {json} Request
 *     { "body": "Bought mine at the Pacific Place boutique in August.", "images": [] }
 *
 * @apiUse ReplyResponse
 *
 * @apiError (Error 4xx) 400 `A reply needs body text or at least one image`, or a field is invalid.
 * @apiUse ErrorLogin
 * @apiError (Error 4xx) 403 `This topic is locked`, `This topic was hidden by a moderator`, or banned.
 * @apiError (Error 4xx) 404 `Topic not found`.
 * @apiError (Error 4xx) 429 More than 30 replies in 15 minutes.
 * @apiUse ErrorOrigin
 * @apiUse ErrorDb
 */
router.post(
  '/topics/:id/replies',
  requireNotBanned,
  rateLimit({ windowMs: 15 * MINUTE, max: 30, key: byUser }),
  createReply,
);

/**
 * @api {patch} /api/forum/replies/:id Edit a reply
 * @apiName UpdateReply
 * @apiGroup Forum
 * @apiVersion 1.0.0
 * @apiPermission Member
 * @apiDescription The author edits a reply. Send `body`, `images` or both; the reply must still have text or an image. `images` replaces the whole list.
 *
 * @apiParam {String} id Reply ID.
 * @apiBody {String{..5000}} [body] New text.
 * @apiBody {String[]} [images] The full new list of image IDs.
 *
 * @apiUse ReplyResponse
 *
 * @apiError (Error 4xx) 400 `Nothing to update: send body or images`, the reply would be empty, or a field is invalid.
 * @apiUse ErrorLogin
 * @apiError (Error 4xx) 403 As for editing a topic.
 * @apiError (Error 4xx) 404 `Reply not found`.
 * @apiUse ErrorOrigin
 * @apiUse ErrorDb
 */
router.patch('/replies/:id', updateReply);

/**
 * @api {delete} /api/forum/replies/:id Delete a reply
 * @apiName DeleteReply
 * @apiGroup Forum
 * @apiVersion 1.0.0
 * @apiPermission Member
 * @apiDescription The author or a moderator deletes a reply and its images. Permanent.
 *
 * @apiParam {String} id Reply ID.
 *
 * @apiSuccessExample {text} Success
 *     HTTP/1.1 204 No Content
 *
 * @apiUse ErrorLogin
 * @apiError (Error 4xx) 403 `Only the author or a moderator can delete this reply`.
 * @apiError (Error 4xx) 404 `Reply not found`.
 * @apiUse ErrorOrigin
 * @apiUse ErrorDb
 */
router.delete('/replies/:id', deleteReply);

/**
 * @api {patch} /api/forum/replies/:id/moderation Hide a reply
 * @apiName ModerateReply
 * @apiGroup Moderation
 * @apiVersion 1.0.0
 * @apiPermission Moderator
 *
 * @apiParam {String} id Reply ID.
 * @apiBody {Boolean} hidden `true` to hide, `false` to show it again.
 * @apiBody {String{..200}} [reason] Why it was hidden, shown to the author.
 * @apiParamExample {json} Request
 *     { "hidden": true, "reason": "Personal information" }
 *
 * @apiUse ReplyResponse
 *
 * @apiError (Error 4xx) 400 `hidden must be true or false`.
 * @apiUse ErrorLogin
 * @apiError (Error 4xx) 403 `Moderators only`.
 * @apiError (Error 4xx) 404 `Reply not found`.
 * @apiUse ErrorOrigin
 * @apiUse ErrorDb
 */
router.patch('/replies/:id/moderation', requireModerator, moderateReply);

/**
 * @api {post} /api/forum/uploads Upload an image
 * @apiName UploadImage
 * @apiGroup Forum
 * @apiVersion 1.0.0
 * @apiPermission Member
 * @apiDescription Uploads one image for a later topic or reply, as `multipart/form-data` with the file in the field `image` and no other fields. JPEG, PNG, WebP, GIF (first frame) or AVIF, at most 10 MB and 50 megapixels; HEIC is refused. The image is re-encoded to WebP, which removes camera and location data, and stored in Cloudflare R2. An upload not used in a post within 24 hours is deleted.
 *
 * @apiExample {js} Browser
 *     const form = new FormData();
 *     form.append('image', file);
 *     await fetch('/api/forum/uploads', { method: 'POST', body: form, credentials: 'include' });
 *
 * @apiSuccess (Success 201) {Object} upload The stored image.
 * @apiSuccess (Success 201) {String} upload.id Send it in a post's `images`.
 * @apiSuccess (Success 201) {String} upload.url Public, unguessable address of the WebP file.
 * @apiSuccess (Success 201) {Number} upload.width Width in pixels (at most 2048 on the longest side).
 * @apiSuccess (Success 201) {Number} upload.height Height in pixels.
 * @apiSuccessExample {json} Success
 *     HTTP/1.1 201 Created
 *     { "upload": { "id": "6720f2aa0b1c2d3e4f506172", "url": "https://…/forum/9f2c4e0b7a1d3c5e8f6a2b4c6d8e0f1a.webp", "width": 1600, "height": 1200 } }
 *
 * @apiError (Error 4xx) 400 No file or more than one; `image must be a JPEG, PNG, WebP, GIF or AVIF file`; `HEIC images are not supported; send a JPEG or PNG`; `image must be at most 50 megapixels`; `image could not be read`.
 * @apiUse ErrorLogin
 * @apiUse ErrorBanned
 * @apiError (Error 4xx) 413 `image must be at most 10 MB`.
 * @apiError (Error 4xx) 429 More than 40 uploads in an hour, or `Too many uploads at the moment, try again shortly` when 8 are already in progress.
 * @apiUse ErrorOrigin
 * @apiUse ErrorDb
 */
// The rate limit runs before the body is read, so refused uploads cost little.
router.post(
  '/uploads',
  requireNotBanned,
  rateLimit({ windowMs: 60 * MINUTE, max: 40, key: byUser }),
  uploadSlot,
  imageUpload,
  uploadImage,
);

/**
 * @api {patch} /api/forum/members/:id/moderation Ban or unban a member
 * @apiName ModerateMember
 * @apiGroup Moderation
 * @apiVersion 1.0.0
 * @apiPermission Moderator
 * @apiDescription Bans a member from posting, or lifts the ban. A banned member can still log in, read and delete their own posts. Only an admin can ban a moderator; admins cannot be banned.
 *
 * @apiParam {String} id The member's ID (a forum author's `id`).
 * @apiBody {Boolean} banned `true` to ban, `false` to lift the ban.
 * @apiBody {String{..200}} [reason] Why.
 * @apiParamExample {json} Request
 *     { "banned": true, "reason": "Spam" }
 *
 * @apiSuccess {Object} member `{ id, displayName, role, banned, bannedAt, banReason }`.
 * @apiSuccessExample {json} Success
 *     HTTP/1.1 200 OK
 *     { "member": { "id": "6720f1c2a1b2c3d4e5f60719", "displayName": "Nguyễn An", "role": "member", "banned": true, "bannedAt": "2026-11-21T11:00:00.000Z", "banReason": "Spam" } }
 *
 * @apiError (Error 4xx) 400 `banned must be true or false`.
 * @apiUse ErrorLogin
 * @apiError (Error 4xx) 403 `Moderators only`, `You cannot moderate your own account`, `Admins cannot be banned`, or `Only an admin can ban a moderator`.
 * @apiError (Error 4xx) 404 `Member not found`.
 * @apiUse ErrorOrigin
 * @apiUse ErrorDb
 */
router.patch('/members/:id/moderation', requireModerator, moderateMember);

export default router;
