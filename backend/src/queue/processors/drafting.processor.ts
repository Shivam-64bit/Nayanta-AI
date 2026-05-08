/**
 * queue/processors/drafting.processor.ts
 *
 * BullMQ worker for the "drafting" queue.
 * Calls Person 2's DraftingAgent.
 * Writes the PDF URL to Firestore applications collection.
 */

import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { getRedisConnectionOptions } from '../../config/redis.config';
import { getFirestore } from '../../config/firestore.config';
import { COLLECTIONS, QUEUE } from '../../config/constants';
import { DraftingAgentInput, DraftingAgentOutput } from '../../schemas';

// TODO: Replace with Person 2's real agent once available
async function runDraftingAgent(_input: DraftingAgentInput): Promise<DraftingAgentOutput> {
  throw new Error('DraftingAgent is not yet implemented by Person 2. Connect agent here.');
}

let worker: Worker | null = null;

export function startDraftingProcessor(): void {
  const opts = getRedisConnectionOptions();
  const connection = new Redis(opts.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: opts.tls,
  });

  worker = new Worker<DraftingAgentInput>(
    'drafting',
    async (job: Job<DraftingAgentInput>) => {
      const input = job.data;
      console.log(`[DraftingProcessor] Processing job ${job.id} for applicationId=${input.applicationId}`);

      const output: DraftingAgentOutput = await runDraftingAgent(input);

      const db = getFirestore();
      await db.collection(COLLECTIONS.APPLICATIONS).doc(input.applicationId).set(
        {
          draftedApplicationUrl: output.pdfUrl,
          state: 'REVIEW',
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      console.log(`[DraftingProcessor] Job ${job.id} completed. PDF at: ${output.pdfUrl}`);
      return output;
    },
    { connection, concurrency: QUEUE.WORKER_CONCURRENCY_LOW },
  );

  worker.on('failed', (job, err) => {
    console.error(`[DraftingProcessor] Job ${job?.id} failed: ${err.message}`);
  });

  console.log('[DraftingProcessor] Worker started.');
}

export async function stopDraftingProcessor(): Promise<void> {
  await worker?.close();
}
