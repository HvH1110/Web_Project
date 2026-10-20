import { Router } from 'express';
import { changePassword, getMe, updateMe } from '../controllers/me.controller.js';
import { requireUser } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';

const MINUTE = 60 * 1000;

const router = Router();

router.get('/', getMe);
router.patch('/', requireUser, updateMe);
router.put(
  '/password',
  requireUser,
  rateLimit({ windowMs: 15 * MINUTE, max: 10, key: (req) => String(req.user._id) }),
  changePassword,
);

export default router;
