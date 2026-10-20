import { User } from '../models/user.model.js';
import { hashPassword, verifyAgainstDummy, verifyPassword } from '../services/password.service.js';
import { SESSION_COOKIE, endSession, startSession } from '../services/session.service.js';
import { toConflictError, toUserDto } from '../services/users.service.js';
import { parseDisplayName, parseEmail, parseNewPassword } from '../utils/account-fields.js';
import { httpError } from '../utils/http-error.js';

export async function register(req, res) {
  const email = parseEmail(req.body);
  const password = parseNewPassword(req.body, 'password');
  const displayName = parseDisplayName(req.body);

  let user;
  try {
    user = await User.create({ email, passwordHash: await hashPassword(password), displayName });
  } catch (err) {
    throw toConflictError(err);
  }
  await startSession(res, user._id, req.cookies?.[SESSION_COOKIE]);

  res.status(201).json({ user: toUserDto(user) });
}

export async function login(req, res) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = req.body?.password;
  if (!email || typeof password !== 'string' || password === '') {
    throw httpError(400, 'email and password are required');
  }

  const user = await User.findOne({ email }).select('+passwordHash').lean();
  const correct = user ? await verifyPassword(password, user.passwordHash) : await verifyAgainstDummy(password);
  if (!correct) {
    throw httpError(401, 'Email or password is incorrect');
  }
  await startSession(res, user._id, req.cookies?.[SESSION_COOKIE]);

  res.json({ user: toUserDto(user) });
}

export async function logout(req, res) {
  await endSession(res, req.cookies?.[SESSION_COOKIE]);
  res.status(204).end();
}
