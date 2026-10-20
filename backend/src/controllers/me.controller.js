import { User } from '../models/user.model.js';
import { hashPassword, verifyPassword } from '../services/password.service.js';
import { endOtherSessions } from '../services/session.service.js';
import { toConflictError, toUserDto } from '../services/users.service.js';
import { parseDisplayName, parseNewPassword, requiredString } from '../utils/account-fields.js';
import { httpError } from '../utils/http-error.js';

export function getMe(req, res) {
  res.json({ user: req.user ? toUserDto(req.user) : null });
}

export async function updateMe(req, res) {
  const displayName = parseDisplayName(req.body);

  let user;
  try {
    user = await User.findByIdAndUpdate(req.user._id, { displayName }, { returnDocument: 'after' }).lean();
  } catch (err) {
    throw toConflictError(err);
  }

  res.json({ user: toUserDto(user) });
}

export async function changePassword(req, res) {
  const currentPassword = requiredString(req.body, 'currentPassword');
  const newPassword = parseNewPassword(req.body, 'newPassword');

  const user = await User.findById(req.user._id).select('+passwordHash').lean();
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    // 403, not 401: the member is still logged in.
    throw httpError(403, 'Current password is incorrect');
  }
  await User.updateOne({ _id: user._id }, { passwordHash: await hashPassword(newPassword) });
  await endOtherSessions(user._id, req.sessionId);

  res.status(204).end();
}
