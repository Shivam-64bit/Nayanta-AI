/**
 * config/secrets.config.ts
 *
 * Google Secret Manager wrapper.
 * Caches secret values in memory for a configurable TTL (default 5 minutes).
 */

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { CACHE } from './constants';

interface CachedSecret {
  value: string;
  expiresAt: number;
}

const secretCache = new Map<string, CachedSecret>();
let client: SecretManagerServiceClient | null = null;

function getClient(): SecretManagerServiceClient {
  if (!client) {
    client = new SecretManagerServiceClient();
  }
  return client;
}

/**
 * Retrieves the latest version of a secret by its short name.
 * Results are cached for the configured TTL.
 */
export async function getSecret(secretName: string): Promise<string> {
  const now = Date.now();
  const cached = secretCache.get(secretName);

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const projectId = process.env.GCP_PROJECT_ID;
  if (!projectId) {
    throw new Error('GCP_PROJECT_ID environment variable is not set.');
  }

  const secretPath = `projects/${projectId}/secrets/${secretName}/versions/latest`;

  const [version] = await getClient().accessSecretVersion({ name: secretPath });

  const payload = version.payload?.data;
  if (!payload) {
    throw new Error(`Secret "${secretName}" has no payload.`);
  }

  const value = typeof payload === 'string' ? payload : payload.toString('utf-8');

  secretCache.set(secretName, { value, expiresAt: now + CACHE.SECRET_TTL_MS });

  return value;
}

/**
 * Invalidates a specific secret from the in-memory cache.
 * Call this if a secret has been rotated.
 */
export function invalidateSecret(secretName: string): void {
  secretCache.delete(secretName);
}
