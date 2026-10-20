import dotenv from 'dotenv';

// Load backend/.env (if present) before anything reads process.env.
dotenv.config({ quiet: true });

const SAME_SITE_VALUES = ['lax', 'strict', 'none'];
const cookieSameSite = (process.env.COOKIE_SAME_SITE || 'lax').toLowerCase();
if (!SAME_SITE_VALUES.includes(cookieSameSite)) {
  throw new Error(`COOKIE_SAME_SITE must be one of: ${SAME_SITE_VALUES.join(', ')}`);
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  mongodbUri: process.env.MONGODB_URI || '',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  cookieSameSite,
  // Browsers only accept SameSite=None on Secure cookies.
  cookieSecure: process.env.COOKIE_SECURE === 'true' || cookieSameSite === 'none',
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
};
