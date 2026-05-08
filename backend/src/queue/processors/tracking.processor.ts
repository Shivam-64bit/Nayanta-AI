/**
 * queue/processors/tracking.processor.ts
 *
 * BullMQ worker for the "tracking" queue.
 * Calls Person 3's TrackingAgent.
 * Writes the latest state and tracking history to Firestore applications collection.
 */

import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { getRedisConnectionOptions } from '../../config/redis.config';
import { getFirestore } from '../../config/firestore.config';
import { COLLECTIONS, QUEUE } from '../../config/constants';
import { TrackingAgentInput, TrackingAgentOutput } from '../../schemas';

import { runTrackingAgent } from '../../agents/TrackingAgent';

let worker: Worker | null = null;

export function startTrackingProcessor(): void {
  const opts = getRedisConnectionOptions();
  const connection = new Redis(opts.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: opts.tls,
  });

  worker = new Worker<TrackingAgentInput>(
    'tracking',
    async (job: Job<TrackingAgentInput>) => {
      const input = job.data;
      console.log(`[TrackingProcessor] Processing job ${job.id} for applicationId=${input.applicationId}`);

      const output: TrackingAgentOutput = await runTrackingAgent(input);

      const db = getFirestore();
      await db.collection(COLLECTIONS.APPLICATIONS).doc(input.applicationId).set(
        {
          state: output.currentState,
          nspStatus: output.nspStatus,
          pfmsStatus: output.pfmsStatus,
          nextCheckAt: output.nextCheckAt,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      console.log(`[TrackingProcessor] Job ${job.id} completed. State is now ${output.currentState}`);
      return output;
    },
    { connection, concurrency: QUEUE.WORKER_CONCURRENCY_HIGH },
  );

  worker.on('failed', (job, err) => {
    console.error(`[TrackingProcessor] Job ${job?.id} failed: ${err.message}`);
  });

  console.log('[TrackingProcessor] Worker started.');
}

export async function stopTrackingProcessor(): Promise<void> {
  await worker?.close();
}
