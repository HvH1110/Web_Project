import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);

// scrypt cost: 2^15 x 8 uses 32 MiB and takes tens of milliseconds per hash.
const COST = { N: 2 ** 15, r: 8, p: 1 };
const MAX_MEMORY = 64 * 1024 * 1024;
const KEY_LENGTH = 64;

// The same password typed as composed or decomposed Unicode (common with
// Vietnamese input methods) must give the same hash.
function normalize(password) {
  return password.normalize('NFKC');
}

// Returns "scrypt$N$r$p$salt$hash" (base64), so the cost can be raised later
// without breaking existing hashes.
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(normalize(password), salt, KEY_LENGTH, { ...COST, maxmem: MAX_MEMORY });
  return ['scrypt', COST.N, COST.r, COST.p, salt.toString('base64'), hash.toString('base64')].join('$');
}

export async function verifyPassword(password, stored) {
  const [algorithm, N, r, p, salt, hash] = stored.split('$');
  if (algorithm !== 'scrypt') {
    return false;
  }
  const expected = Buffer.from(hash, 'base64');
  const actual = await scrypt(normalize(password), Buffer.from(salt, 'base64'), expected.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
    maxmem: MAX_MEMORY,
  });
  return crypto.timingSafeEqual(actual, expected);
}

// Checked against when the email has no account, so a login takes as long
// either way and doesn't reveal which emails are registered.
let dummyHash;
export async function verifyAgainstDummy(password) {
  dummyHash ??= hashPassword('placeholder password for timing');
  await verifyPassword(password, await dummyHash);
  return false;
}
