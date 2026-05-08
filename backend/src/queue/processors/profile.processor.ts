/**
 * queue/processors/profile.processor.ts
 *
 * BullMQ worker for the "profile" queue.
 * Calls Person 2's ProfileAgent when the job is consumed.
 * Writes the resulting UserProfile to Firestore users collection.
 */

import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { getRedisConnectionOptions } from '../../config/redis.config';
import { getFirestore } from '../../config/firestore.config';
import { COLLECTIONS, QUEUE } from '../../config/constants';
import { ProfileAgentInput, ProfileAgentOutput } from '../../schemas';

import { runProfileAgent } from '../../agents/ProfileAgent';

let worker: Worker | null = null;

export function startProfileProcessor(): void {
  const opts = getRedisConnectionOptions();
  const connection = new Redis(opts.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: opts.tls,
  });

  worker = new Worker<ProfileAgentInput>(
    'profile',
    async (job: Job<ProfileAgentInput>) => {
      const input = job.data;
      console.log(`[ProfileProcessor] Processing job ${job.id} for userId=${input.userId}`);

      const output: ProfileAgentOutput = await runProfileAgent(input);

      const db = getFirestore();
      await db
        .collection(COLLECTIONS.USERS)
        .doc(output.profile.userId)
        .set(output.profile, { merge: true });

      console.log(`[ProfileProcessor] Job ${job.id} completed. Stored profile for userId=${output.profile.userId}`);
      return output;
    },
    { connection, concurrency: QUEUE.WORKER_CONCURRENCY_HIGH },
  );

  worker.on('failed', (job, err) => {
    console.error(`[ProfileProcessor] Job ${job?.id} failed: ${err.message}`);
  });

  console.log('[ProfileProcessor] Worker started.');
}

export async function stopProfileProcessor(): Promise<void> {
  await worker?.close();
}
