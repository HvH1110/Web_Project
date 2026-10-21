import dotenv from 'dotenv';

// Load backend/.env (if present) before anything reads process.env.
dotenv.config({ quiet: true });

const SAME_SITE_VALUES = ['lax', 'strict', 'none'];
const cookieSameSite = (process.env.COOKIE_SAME_SITE || 'lax').toLowerCase();
if (!SAME_SITE_VALUES.includes(cookieSameSite)) {
  throw new Error(`COOKIE_SAME_SITE must be one of: ${SAME_SITE_VALUES.join(', ')}`);
}

const port = Number(process.env.PORT) || 5000;

const UPLOAD_STORAGES = ['local', 's3'];
const uploadStorage = (process.env.UPLOAD_STORAGE || 'local').toLowerCase();
if (!UPLOAD_STORAGES.includes(uploadStorage)) {
  throw new Error(`UPLOAD_STORAGE must be one of: ${UPLOAD_STORAGES.join(', ')}`);
}
const s3 = {
  endpoint: process.env.S3_ENDPOINT || '',
  region: process.env.S3_REGION || 'auto',
  bucket: process.env.S3_BUCKET || '',
  accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
};
if (uploadStorage === 's3') {
  const missing = ['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'UPLOADS_PUBLIC_URL'].filter(
    (name) => !process.env[name],
  );
  if (missing.length > 0) {
    throw new Error(`UPLOAD_STORAGE=s3 needs ${missing.join(', ')}`);
  }
}

export const env = {
  port,
  mongodbUri: process.env.MONGODB_URI || '',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  cookieSameSite,
  // Browsers only accept SameSite=None on Secure cookies.
  cookieSecure: process.env.COOKIE_SECURE === 'true' || cookieSameSite === 'none',
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
  uploadStorage,
  // Local storage folder, relative to backend/.
  uploadsDir: process.env.UPLOADS_DIR || 'uploads',
  // Where browsers load uploaded images from; a file's URL is this + "/" + its key.
  uploadsPublicUrl: (process.env.UPLOADS_PUBLIC_URL || `http://localhost:${port}/api/uploads`).replace(/\/+$/, ''),
  s3,
};
