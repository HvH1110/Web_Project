import { Router } from 'express';
import { login, logout, register } from '../controllers/auth.controller.js';
import { rateLimit } from '../middleware/rate-limit.js';

const MINUTE = 60 * 1000;
const byIp = (req) => req.ip;
const byEmail = (req) => (typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : null);

const router = Router();

router.post('/register', rateLimit({ windowMs: 60 * MINUTE, max: 10, key: byIp }), register);
router.post(
  '/login',
  rateLimit({ windowMs: 15 * MINUTE, max: 30, key: byIp }),
  rateLimit({ windowMs: 15 * MINUTE, max: 10, key: byEmail }),
  login,
);
router.post('/logout', logout);

export default router;
