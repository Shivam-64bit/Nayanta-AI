/**
 * queue/processors/eligibility.processor.ts
 *
 * BullMQ worker for the "eligibility" queue.
 * Calls Person 2's DiscoveryAgent and Person 3's StackOptimizer.
 * Writes matched scholarships to Firestore users collection.
 */

import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { getRedisConnectionOptions } from '../../config/redis.config';
import { getFirestore } from '../../config/firestore.config';
import { COLLECTIONS, QUEUE } from '../../config/constants';
import { DiscoveryAgentInput, DiscoveryAgentOutput } from '../../schemas';

// TODO: Replace with Person 2's real agent once available
async function runDiscoveryAgent(_input: DiscoveryAgentInput): Promise<DiscoveryAgentOutput> {
  throw new Error('DiscoveryAgent is not yet implemented by Person 2. Connect agent here.');
}

let worker: Worker | null = null;

export function startEligibilityProcessor(): void {
  const opts = getRedisConnectionOptions();
  const connection = new Redis(opts.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: opts.tls,
  });

  worker = new Worker<DiscoveryAgentInput>(
    'eligibility',
    async (job: Job<DiscoveryAgentInput>) => {
      const input = job.data;
      console.log(`[EligibilityProcessor] Processing job ${job.id} for userId=${input.userId}`);

      const output: DiscoveryAgentOutput = await runDiscoveryAgent(input);

      const db = getFirestore();
      await db.collection(COLLECTIONS.USERS).doc(input.userId).set(
        {
          matchedSchemes: output.matches.map((m) => m.schemeId),
          totalPotentialValue: output.totalPotentialValue,
          recommendedStack: output.recommendedStack,
          updatedAt: new Date().toISOString(),
        },
        {
          merge: true
        },
      );

      console.log(`[EligibilityProcessor] Job ${job.id} completed. Found ${output.matches.length} matches.`);
      return output;
    },
    { connection, concurrency: QUEUE.WORKER_CONCURRENCY_HIGH },
  );

  worker.on('failed', (job, err) => {
    console.error(`[EligibilityProcessor] Job ${job?.id} failed: ${err.message}`);
  });

  console.log('[EligibilityProcessor] Worker started.');
}

export async function stopEligibilityProcessor(): Promise<void> {
  await worker?.close();
}
