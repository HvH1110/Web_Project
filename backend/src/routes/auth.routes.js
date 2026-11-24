import { Router } from 'express';
import { login, logout, register } from '../controllers/auth.controller.js';
import { rateLimit } from '../middleware/rate-limit.js';

const MINUTE = 60 * 1000;
const byIp = (req) => req.ip;
// Holds when IP addresses are faked (middleware/require-proxy.js). Refusing all
// sign-ups or logins for a while beats a database or CPU overrun; existing sessions
// keep working.
const overall = () => 'all';
const byEmail = (req) => (typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : null);

const router = Router();

/**
 * @api {post} /api/auth/register Sign up
 * @apiName Register
 * @apiGroup Account
 * @apiVersion 1.0.0
 * @apiPermission Public
 * @apiDescription Creates a member account and logs it in: the response sets the session cookie `sid` (`httpOnly`, `SameSite=Lax`). The password is stored only as a scrypt hash.
 *
 * @apiBody {String{..254}} email A valid email address; stored in lowercase.
 * @apiBody {String{8..128}} password Password, 8 to 128 characters.
 * @apiBody {String{2..30}} displayName Name shown on the forum: letters, digits, spaces, `.`, `_` and `-`, starting and ending with a letter or digit.
 * @apiParamExample {json} Request
 *     { "email": "an@example.com", "password": "at least 8 characters", "displayName": "Nguyễn An" }
 *
 * @apiUse UserResponse
 *
 * @apiError (Error 4xx) 400 A field is missing or invalid (the message says which).
 * @apiError (Error 4xx) 409 `An account with this email already exists`, or `This display name is taken`.
 * @apiError (Error 4xx) 429 More than 10 sign-ups from one IP address in an hour, or 100 overall.
 * @apiUse ErrorOrigin
 * @apiUse ErrorDb
 */
router.post(
  '/register',
  rateLimit({ windowMs: 60 * MINUTE, max: 10, key: byIp }),
  rateLimit({ windowMs: 60 * MINUTE, max: 100, key: overall }),
  register,
);

/**
 * @api {post} /api/auth/login Log in
 * @apiName Login
 * @apiGroup Account
 * @apiVersion 1.0.0
 * @apiPermission Public
 * @apiDescription Logs in and sets the session cookie, replacing any previous session in this browser. A session lasts 30 days.
 *
 * @apiBody {String} email Account email.
 * @apiBody {String} password Password.
 * @apiParamExample {json} Request
 *     { "email": "an@example.com", "password": "…" }
 *
 * @apiUse UserResponse
 *
 * @apiError (Error 4xx) 400 `email and password are required`.
 * @apiError (Error 4xx) 401 `Email or password is incorrect` (the same message whether or not the email has an account).
 * @apiError (Error 4xx) 429 More than 10 attempts for one email, 30 from one IP address, or 300 overall, in 15 minutes.
 * @apiUse ErrorOrigin
 * @apiUse ErrorDb
 */
router.post(
  '/login',
  rateLimit({ windowMs: 15 * MINUTE, max: 30, key: byIp }),
  rateLimit({ windowMs: 15 * MINUTE, max: 10, key: byEmail }),
  rateLimit({ windowMs: 15 * MINUTE, max: 300, key: overall }),
  login,
);

/**
 * @api {post} /api/auth/logout Log out
 * @apiName Logout
 * @apiGroup Account
 * @apiVersion 1.0.0
 * @apiPermission Public
 * @apiDescription Ends the current session and clears the cookie. No request body. Safe to call when not logged in.
 *
 * @apiSuccessExample {text} Success
 *     HTTP/1.1 204 No Content
 *
 * @apiUse ErrorOrigin
 * @apiUse ErrorDb
 */
router.post('/logout', logout);

export default router;
