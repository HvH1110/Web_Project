import { env } from '../../config/env.js';

// The storage service for uploaded files, chosen by UPLOAD_STORAGE. Files never
// go in MongoDB (the free cluster has 512 MB, see devops/ENVIRONMENT.md).
// Each driver has put(key, body, contentType) and remove(key); removing a
// missing file is not an error.
const driver = env.uploadStorage === 's3' ? await import('./s3.js') : await import('./local.js');

export const storage = {
  put: driver.put,
  remove: driver.remove,
  publicUrl: (key) => `${env.uploadsPublicUrl}/${key}`,
};
