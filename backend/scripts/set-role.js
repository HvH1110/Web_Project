// Sets a member's role, e.g. to make someone a forum moderator.
// Usage (from backend/): npm run set-role -- <email> <member|moderator|admin>
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { USER_ROLES, User } from '../src/models/user.model.js';

const [email, role] = process.argv.slice(2);
if (!email || !USER_ROLES.includes(role)) {
  console.error(`Usage: npm run set-role -- <email> <${USER_ROLES.join('|')}>`);
  process.exit(1);
}
if (!env.mongodbUri) {
  console.error('MONGODB_URI is not set in backend/.env');
  process.exit(1);
}

try {
  await mongoose.connect(env.mongodbUri);
  const user = await User.findOneAndUpdate(
    { email: email.trim().toLowerCase() },
    { role },
    { returnDocument: 'after' },
  ).lean();
  if (user) {
    console.log(`${user.email} is now ${user.role}.`);
  } else {
    console.error(`No account with the email ${email}.`);
    process.exitCode = 1;
  }
} catch (err) {
  // Log only the message: connection errors can carry connection details.
  console.error(`Setting the role failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
