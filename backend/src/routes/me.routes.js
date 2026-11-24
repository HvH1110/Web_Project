import { Router } from 'express';
import { changePassword, getMe, updateMe } from '../controllers/me.controller.js';
import { requireUser } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';

const MINUTE = 60 * 1000;

const router = Router();

/**
 * @api {get} /api/me Current member
 * @apiName GetMe
 * @apiGroup Account
 * @apiVersion 1.0.0
 * @apiPermission Public
 * @apiDescription The logged-in member, or `{ "user": null }` (not an error) when not logged in. The website calls it on page load to show "Log in" or the member's name.
 *
 * @apiUse UserResponse
 * @apiUse ErrorRate
 * @apiUse ErrorDb
 */
router.get('/', getMe);

/**
 * @api {patch} /api/me Edit profile
 * @apiName UpdateMe
 * @apiGroup Account
 * @apiVersion 1.0.0
 * @apiPermission Member
 * @apiDescription Changes the display name, the only editable field for now.
 *
 * @apiBody {String{2..30}} displayName New name shown on the forum.
 * @apiParamExample {json} Request
 *     { "displayName": "An Nguyễn" }
 *
 * @apiUse UserResponse
 *
 * @apiError (Error 4xx) 400 No `displayName`, or it is invalid.
 * @apiUse ErrorLogin
 * @apiError (Error 4xx) 409 `This display name is taken`.
 * @apiUse ErrorOrigin
 * @apiUse ErrorDb
 */
router.patch('/', requireUser, updateMe);

/**
 * @api {put} /api/me/password Change password
 * @apiName ChangePassword
 * @apiGroup Account
 * @apiVersion 1.0.0
 * @apiPermission Member
 * @apiDescription Changes the password and logs out every other session of this member. This browser stays logged in with a new session cookie sent with the response.
 *
 * @apiBody {String} currentPassword The current password.
 * @apiBody {String{8..128}} newPassword The new password.
 * @apiParamExample {json} Request
 *     { "currentPassword": "…", "newPassword": "at least 8 characters" }
 *
 * @apiSuccessExample {text} Success
 *     HTTP/1.1 204 No Content
 *
 * @apiError (Error 4xx) 400 A field is missing, or `newPassword` is not 8 to 128 characters.
 * @apiUse ErrorLogin
 * @apiError (Error 4xx) 403 `Current password is incorrect` (still logged in).
 * @apiError (Error 4xx) 429 More than 10 attempts in 15 minutes.
 * @apiUse ErrorOrigin
 * @apiUse ErrorDb
 */
router.put(
  '/password',
  requireUser,
  rateLimit({ windowMs: 15 * MINUTE, max: 10, key: (req) => String(req.user._id) }),
  changePassword,
);

export default router;
