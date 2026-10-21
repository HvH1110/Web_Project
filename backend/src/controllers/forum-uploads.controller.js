import { createUpload, toImageDto } from '../services/uploads.service.js';
import { httpError } from '../utils/http-error.js';

export async function uploadImage(req, res) {
  if (!req.file) {
    throw httpError(400, 'Send the image as multipart/form-data in the field "image"');
  }
  const upload = await createUpload(req.user._id, req.file.buffer);
  res.status(201).json({ upload: toImageDto(upload) });
}
