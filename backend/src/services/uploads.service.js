import crypto from 'node:crypto';
import sharp from 'sharp';
import { Upload } from '../models/upload.model.js';
import { httpError } from '../utils/http-error.js';
import { storage } from './storage/index.js';

export const MAX_UPLOAD_MB = 10;
export const MAX_IMAGES_PER_POST = 4;
const MAX_SIDE = 2048;
const MAX_INPUT_PIXELS = 50_000_000;
// sharp reports AVIF as "heif".
const INPUT_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'heif']);
const UNUSED_UPLOAD_MS = 24 * 60 * 60 * 1000;

// Re-encodes an uploaded file as WebP, at most MAX_SIDE pixels on its longest
// side. Re-encoding drops EXIF data (camera GPS location included) and makes
// sure only real images are ever served. Animated GIFs keep their first frame.
async function toWebp(buffer) {
  let metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    metadata = null;
  }
  if (!metadata || !INPUT_FORMATS.has(metadata.format)) {
    throw httpError(400, 'image must be a JPEG, PNG, WebP, GIF or AVIF file');
  }
  // The prebuilt sharp decodes AVIF but not HEIC (iPhone photos).
  if (metadata.format === 'heif' && metadata.compression !== 'av1') {
    throw httpError(400, 'HEIC images are not supported; send a JPEG or PNG');
  }
  if (metadata.width * metadata.height > MAX_INPUT_PIXELS) {
    throw httpError(400, 'image must be at most 50 megapixels');
  }
  try {
    return await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' })
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw httpError(400, 'image could not be read');
  }
}

export async function createUpload(ownerId, buffer) {
  const { data, info } = await toWebp(buffer);
  const key = `forum/${crypto.randomBytes(16).toString('hex')}.webp`;
  await storage.put(key, data, 'image/webp');
  try {
    return await Upload.create({ key, ownerId, width: info.width, height: info.height, size: info.size });
  } catch (err) {
    await storage.remove(key).catch(() => {});
    throw err;
  }
}

// ForumImage in docs/API.md, from an Upload or a post's image.
export function toImageDto(image) {
  return {
    id: String(image.uploadId ?? image._id),
    url: storage.publicUrl(image.key),
    width: image.width,
    height: image.height,
  };
}

// Attaches the owner's uploads to a post (`target` = { kind, id }) and returns
// the post's images in the given order. IDs in `keep` are already attached to
// it (when editing). Fails with 400, attaching nothing, if any other upload
// is missing, belongs to someone else or is used by another post.
export async function attachUploads(ownerId, uploadIds, target, keep = new Set()) {
  const newIds = uploadIds.filter((id) => !keep.has(String(id)));
  if (newIds.length > 0) {
    const result = await Upload.updateMany(
      { _id: { $in: newIds }, ownerId, attachedTo: null },
      { attachedTo: target },
    );
    if (result.modifiedCount !== newIds.length) {
      await detachUploads(newIds, target);
      throw httpError(400, 'An image was not found, is not yours, or is already used in another post');
    }
  }
  const uploads = await Upload.find({ _id: { $in: uploadIds }, 'attachedTo.id': target.id }).lean();
  const byId = new Map(uploads.map((upload) => [String(upload._id), upload]));
  return uploadIds.map((id) => {
    const upload = byId.get(String(id));
    return { uploadId: upload._id, key: upload.key, width: upload.width, height: upload.height };
  });
}

// Undoes attachUploads, e.g. when saving the post failed.
export async function detachUploads(uploadIds, target) {
  if (uploadIds.length > 0) {
    await Upload.updateMany({ _id: { $in: uploadIds }, 'attachedTo.id': target.id }, { attachedTo: null });
  }
}

// Deletes uploads and their files. A file that fails to delete is logged and
// left in storage; the post no longer shows it either way.
export async function deleteUploads(filter) {
  const uploads = await Upload.find(filter).select('key').lean();
  if (uploads.length === 0) {
    return 0;
  }
  await Upload.deleteMany({ _id: { $in: uploads.map((upload) => upload._id) } });
  for (const upload of uploads) {
    try {
      await storage.remove(upload.key);
    } catch (err) {
      console.error(`Deleting upload file ${upload.key} failed: ${err.message}`);
    }
  }
  return uploads.length;
}

// Uploads never attached to a post within a day. One at a time, each deleted
// only if still unused, so a member attaching it at the same moment wins.
export async function purgeUnusedUploads(now = new Date()) {
  const cutoff = new Date(now.getTime() - UNUSED_UPLOAD_MS);
  const candidates = await Upload.find({ attachedTo: null, createdAt: { $lt: cutoff } })
    .select('_id')
    .limit(500)
    .lean();
  let purged = 0;
  for (const { _id } of candidates) {
    purged += await deleteUploads({ _id, attachedTo: null });
  }
  return purged;
}
