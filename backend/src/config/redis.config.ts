/**
 * config/redis.config.ts
 *
 * Redis client configuration using ioredis for BullMQ compatibility.
 * Upstash TLS URL is used in production.
 * Reconnects automatically with capped exponential backoff.
 */

import Redis from 'ioredis';

let redisInstance: Redis | null = null;

export function getRedisClient(): Redis {
  if (redisInstance) return redisInstance;

  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error('REDIS_URL environment variable is not set.');
  }

  const isTls = url.startsWith('rediss://');

  redisInstance = new Redis(url, {
    maxRetriesPerRequest: null,    // required by BullMQ
    enableReadyCheck: false,       // required by BullMQ
    tls: isTls ? {} : undefined,
    retryStrategy(times: number) {
      if (times > 10) {
        console.error('[Redis] Maximum reconnection attempts reached. Giving up.');
        return null;
      }
      const delay = Math.min(100 * Math.pow(2, times), 10_000);
      console.warn(`[Redis] Reconnecting in ${delay}ms (attempt ${times})`);
      return delay;
    },
  });

  redisInstance.on('connect', () => console.log('[Redis] Connected.'));
  redisInstance.on('error', (err: Error) => console.error('[Redis] Error:', err.message));
  redisInstance.on('close', () => console.warn('[Redis] Connection closed.'));

  return redisInstance;
}

/**
 * Returns the Redis connection options object for BullMQ workers and queues.
 * BullMQ requires its own connection instance per worker; do not share.
 */
export function getRedisConnectionOptions() {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL environment variable is not set.');
  const isTls = url.startsWith('rediss://');
  return {
    url,
    ...(isTls ? { tls: {} } : {}),
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
  };
}
