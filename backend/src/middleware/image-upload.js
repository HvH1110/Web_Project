import multer from 'multer';
import { MAX_UPLOAD_MB } from '../services/uploads.service.js';
import { httpError } from '../utils/http-error.js';

// Reads one file from the multipart field "image" into req.file.buffer.
// Nothing touches disk; services/uploads.service.js checks and re-encodes it.
const parseImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 1, fields: 0, parts: 1 },
}).single('image');

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
