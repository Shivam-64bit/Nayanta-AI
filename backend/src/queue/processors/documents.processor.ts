/**
 * queue/processors/documents.processor.ts
 *
 * BullMQ worker for the "documents" queue.
 * Calls Person 2's DocIntelligenceAgent (7-layer validation).
 * Writes validation result to Firestore applications collection.
 */

import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { getRedisConnectionOptions } from '../../config/redis.config';
import { getFirestore } from '../../config/firestore.config';
import { COLLECTIONS, QUEUE } from '../../config/constants';
import { DocAgentInput, DocAgentOutput } from '../../schemas';

import { runDocIntelligenceAgent } from '../../agents/DocIntelligenceAgent';

let worker: Worker | null = null;

export function startDocumentsProcessor(): void {
  const opts = getRedisConnectionOptions();
  const connection = new Redis(opts.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: opts.tls,
  });

  worker = new Worker<DocAgentInput>(
    'documents',
    async (job: Job<DocAgentInput>) => {
      const input = job.data;
      console.log(`[DocumentsProcessor] Processing job ${job.id} for applicationId=${input.applicationId}`);

      const output: DocAgentOutput = await runDocIntelligenceAgent(input);

      const db = getFirestore();
      await db
        .collection(COLLECTIONS.APPLICATIONS)
        .doc(input.applicationId)
        .set({ docValidation: output, updatedAt: new Date().toISOString() }, { merge: true });

      console.log(`[DocumentsProcessor] Job ${job.id} completed. Health score=${output.healthScore}`);
      return output;
    },
    { connection, concurrency: QUEUE.WORKER_CONCURRENCY_LOW },
  );

  worker.on('failed', (job, err) => {
    console.error(`[DocumentsProcessor] Job ${job?.id} failed: ${err.message}`);
  });

  console.log('[DocumentsProcessor] Worker started.');
}

export async function stopDocumentsProcessor(): Promise<void> {
  await worker?.close();
}
