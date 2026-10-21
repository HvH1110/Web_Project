import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../../config/env.js';

const backendRoot = fileURLToPath(new URL('../../../', import.meta.url));

// Folder holding the files; app.js serves it at /api/uploads.
export const localUploadsDir = path.resolve(backendRoot, env.uploadsDir);

function filePath(key) {
  return path.join(localUploadsDir, ...key.split('/'));
}

export async function put(key, body) {
  const target = filePath(key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, body);
}

export async function remove(key) {
  await fs.rm(filePath(key), { force: true });
}
