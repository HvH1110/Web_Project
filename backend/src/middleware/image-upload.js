import multer from 'multer';
import { MAX_UPLOADS_AT_ONCE, MAX_UPLOAD_MB } from '../services/uploads.service.js';
import { httpError } from '../utils/http-error.js';

// Reads one file from the multipart field "image" into req.file.buffer.
// Nothing touches disk; services/uploads.service.js checks and re-encodes it.
const parseImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 1, fields: 0, parts: 1 },
}).single('image');

const UPLOAD_TIMEOUT_MS = 2 * 60 * 1000;
let activeUploads = 0;

// Files are held in memory while they arrive, so this limits the memory uploads
// can take on a small server. A request that stalls is dropped after a while, so
// it can't keep its place. Runs before the body is read.
export function uploadSlot(req, res, next) {
  if (activeUploads >= MAX_UPLOADS_AT_ONCE) {
    res.set('Retry-After', '10');
    return next(httpError(429, 'Too many uploads at the moment, try again shortly'));
  }
  activeUploads += 1;
  const timeout = setTimeout(() => req.destroy(), UPLOAD_TIMEOUT_MS);
  res.once('close', () => {
    activeUploads -= 1;
    clearTimeout(timeout);
  });
  next();
}

export function imageUpload(req, res, next) {
  parseImage(req, res, (err) => {
    if (!err) {
      return next();
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(httpError(413, `image must be at most ${MAX_UPLOAD_MB} MB`));
    }
    // Other multer and multipart parsing errors are all malformed requests.
    next(httpError(400, 'Send one image as multipart/form-data in the field "image"'));
  });
}
