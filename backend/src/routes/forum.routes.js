import { Router } from 'express';
import { moderateMember, moderateReply, moderateTopic } from '../controllers/forum-moderation.controller.js';
import { createReply, deleteReply, listReplies, updateReply } from '../controllers/forum-replies.controller.js';
import { createTopic, deleteTopic, getTopic, listTopics, updateTopic } from '../controllers/forum-topics.controller.js';
import { uploadImage } from '../controllers/forum-uploads.controller.js';
import { requireModerator, requireNotBanned, requireUser } from '../middleware/auth.js';
import { imageUpload } from '../middleware/image-upload.js';
import { rateLimit } from '../middleware/rate-limit.js';

const MINUTE = 60 * 1000;
const byUser = (req) => String(req.user._id);

const router = Router();

// The forum is members-only, reading included.
router.use(requireUser);

router.get('/topics', listTopics);
router.post('/topics', requireNotBanned, rateLimit({ windowMs: 60 * MINUTE, max: 10, key: byUser }), createTopic);
router.get('/topics/:id', getTopic);
router.patch('/topics/:id', updateTopic);
router.delete('/topics/:id', deleteTopic);
router.patch('/topics/:id/moderation', requireModerator, moderateTopic);

router.get('/topics/:id/replies', listReplies);
router.post(
  '/topics/:id/replies',
  requireNotBanned,
  rateLimit({ windowMs: 15 * MINUTE, max: 30, key: byUser }),
  createReply,
);
router.patch('/replies/:id', updateReply);
router.delete('/replies/:id', deleteReply);
router.patch('/replies/:id/moderation', requireModerator, moderateReply);

// The rate limit runs before the body is read, so refused uploads cost little.
router.post(
  '/uploads',
  requireNotBanned,
  rateLimit({ windowMs: 60 * MINUTE, max: 40, key: byUser }),
  imageUpload,
  uploadImage,
);

router.patch('/members/:id/moderation', requireModerator, moderateMember);

export default router;
