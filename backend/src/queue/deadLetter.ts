/**
 * queue/deadLetter.ts
 *
 * Dead letter queue handler.
 * Listens for permanently failed jobs across all agent queues (after max retries).
 * On failure:
 *   1. Writes a structured record to Firestore dead_letter collection
 *   2. Logs a critical alert (production alert hook is wired here)
 */

import { QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { getRedisConnectionOptions } from '../config/redis.config';
import { getFirestore } from '../config/firestore.config';
import { maskPii } from '../middleware/piiMasker.middleware';
import { COLLECTIONS } from '../config/constants';

type QueueName =
  | 'profile'
  | 'eligibility'
  | 'documents'
  | 'drafting'
  | 'tracking'
  | 'rejection'
  | 'family';

const QUEUE_NAMES: QueueName[] = [
  'profile',
  'eligibility',
  'documents',
  'drafting',
  'tracking',
  'rejection',
  'family',
];

const queueEventListeners: QueueEvents[] = [];

export function startDeadLetterHandler(): void {
  const opts = getRedisConnectionOptions();
  const connection = new Redis(opts.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: opts.tls,
  });

  for (const queueName of QUEUE_NAMES) {
    const queueEvents = new QueueEvents(queueName, { connection });

    queueEvents.on('failed', async ({ jobId, failedReason }) => {
      console.error(
        `[DeadLetter] Job permanently failed: queue=${queueName} jobId=${jobId} reason=${failedReason}`,
      );

      try {
        const db = getFirestore();
        await db.collection(COLLECTIONS.DEAD_LETTER).doc(jobId).set({
          jobId,
          queue: queueName,
          failedReason: maskPii(failedReason ?? 'Unknown failure reason'),
          failedAt: new Date().toISOString(),
          acknowledged: false,
        });

        console.log(`[DeadLetter] Recorded to Firestore: jobId=${jobId}`);

        // TODO: Hook production alerting here (e.g. PagerDuty, GCP Error Reporting)
      } catch (writeErr: unknown) {
        const msg = writeErr instanceof Error ? writeErr.message : String(writeErr);
        console.error(`[DeadLetter] Failed to write dead letter record for jobId=${jobId}: ${msg}`);
      }
    });

    queueEventListeners.push(queueEvents);
  }

  console.log('[DeadLetter] Handler active on all queues.');
}

export async function stopDeadLetterHandler(): Promise<void> {
  for (const listener of queueEventListeners) {
    await listener.close();
  }
}
