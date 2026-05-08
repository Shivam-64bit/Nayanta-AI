/**
 * queue/processors/family.processor.ts
 *
 * BullMQ worker for the "family" queue.
 * Calls Person 2's FamilyAgent.
 * Writes family matching results to Firestore users collection.
 */

import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { getRedisConnectionOptions } from '../../config/redis.config';
import { getFirestore } from '../../config/firestore.config';
import { COLLECTIONS, QUEUE } from '../../config/constants';
import { FamilyAgentInput, FamilyAgentOutput } from '../../schemas';

import { runFamilyMapperAgent as runFamilyAgent } from '../../agents/FamilyMapperAgent';

let worker: Worker | null = null;

export function startFamilyProcessor(): void {
  const opts = getRedisConnectionOptions();
  const connection = new Redis(opts.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: opts.tls,
  });

  worker = new Worker<FamilyAgentInput>(
    'family',
    async (job: Job<FamilyAgentInput>) => {
      const input = job.data;
      console.log(`[FamilyProcessor] Processing job ${job.id} for primaryUserId=${input.primaryUserId}`);

      const output: FamilyAgentOutput = await runFamilyAgent(input);

      const db = getFirestore();
      await db.collection(COLLECTIONS.USERS).doc(input.primaryUserId).set(
        {
          familyMatches: output.perMemberMatches,
          householdTotalPotentialValue: output.householdTotalPotentialValue,
          applicationOrder: output.applicationOrder,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      const memberCount = Object.keys(output.perMemberMatches).length;
      console.log(`[FamilyProcessor] Job ${job.id} completed. Processed ${memberCount} family members.`);
      return output;
    },
    { connection, concurrency: QUEUE.WORKER_CONCURRENCY_LOW },
  );

  worker.on('failed', (job, err) => {
    console.error(`[FamilyProcessor] Job ${job?.id} failed: ${err.message}`);
  });

  console.log('[FamilyProcessor] Worker started.');
}

export async function stopFamilyProcessor(): Promise<void> {
  await worker?.close();
}
