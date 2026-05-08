/**
 * config/storage.config.ts
 *
 * Google Cloud Storage client.
 * Provides helpers for uploading files and generating signed URLs.
 */

import { Storage } from '@google-cloud/storage';
import { CACHE } from './constants';

let storageInstance: Storage | null = null;

function getStorage(): Storage {
  if (!storageInstance) {
    storageInstance = new Storage({
      projectId: process.env.GCP_PROJECT_ID,
    });
  }
  return storageInstance;
}

function getBucketName(): string {
  const name = process.env.GCS_BUCKET_NAME;
  if (!name) throw new Error('GCS_BUCKET_NAME environment variable is not set.');
  return name;
}

/**
 * Uploads a file buffer to GCS and returns the GCS object path.
 */
export async function uploadFile(
  fileBuffer: Buffer,
  destinationPath: string,
  contentType: string,
): Promise<string> {
  const bucket = getStorage().bucket(getBucketName());
  const file = bucket.file(destinationPath);

  await file.save(fileBuffer, {
    contentType,
    resumable: false,
    metadata: { cacheControl: 'private, max-age=0' },
  });

  return destinationPath;
}

/**
 * Generates a V4 signed URL for a GCS object, valid for the configured expiry.
 */
export async function getSignedUrl(gcsPath: string): Promise<string> {
  const bucket = getStorage().bucket(getBucketName());
  const file = bucket.file(gcsPath);

  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + CACHE.SIGNED_URL_EXPIRY_MS,
  });

  return url;
}

/**
 * Deletes a GCS object. Used when an application is permanently deleted.
 */
export async function deleteFile(gcsPath: string): Promise<void> {
  const bucket = getStorage().bucket(getBucketName());
  await bucket.file(gcsPath).delete({ ignoreNotFound: true });
}
