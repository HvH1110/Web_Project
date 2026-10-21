import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../../config/env.js';

// Any S3-compatible service: Cloudflare R2, Backblaze B2, AWS S3, MinIO...
// The bucket must be publicly readable at UPLOADS_PUBLIC_URL.
const client = new S3Client({
  endpoint: env.s3.endpoint || undefined,
  region: env.s3.region,
  credentials: { accessKeyId: env.s3.accessKeyId, secretAccessKey: env.s3.secretAccessKey },
  // R2 and MinIO need path-style URLs when an endpoint is given.
  forcePathStyle: Boolean(env.s3.endpoint),
});

export async function put(key, body, contentType) {
  await client.send(
    new PutObjectCommand({
      Bucket: env.s3.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      // Keys are random and never reused, so the files can be cached forever.
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
}

export async function remove(key) {
  await client.send(new DeleteObjectCommand({ Bucket: env.s3.bucket, Key: key }));
}
