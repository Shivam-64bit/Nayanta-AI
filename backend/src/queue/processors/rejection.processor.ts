/**
 * queue/processors/rejection.processor.ts
 *
 * BullMQ worker for the "rejection" queue.
 * Calls Person 2's RejectionAgent.
 * Writes the analysis and grievance info to Firestore applications collection.
 */

import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { getRedisConnectionOptions } from '../../config/redis.config';
import { getFirestore } from '../../config/firestore.config';
import { COLLECTIONS, QUEUE } from '../../config/constants';
import { RejectionAgentInput, RejectionAgentOutput } from '../../schemas';

import { runRejectionAgent } from '../../agents/RejectionAgent';

let worker: Worker | null = null;

export function startRejectionProcessor(): void {
  const opts = getRedisConnectionOptions();
  const connection = new Redis(opts.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: opts.tls,
  });

  worker = new Worker<RejectionAgentInput>(
    'rejection',
    async (job: Job<RejectionAgentInput>) => {
      const input = job.data;
      console.log(`[RejectionProcessor] Processing job ${job.id} for applicationId=${input.applicationId}`);

      const output: RejectionAgentOutput = await runRejectionAgent(input);

      const db = getFirestore();

      const updateData: Record<string, unknown> = {
        rejectionAnalysis: {
          explanation: output.plainLanguageExplanation,
          reapplyRecommended: output.reapplyRecommended,
          fixedFields: output.fixedFields,
        },
        updatedAt: new Date().toISOString(),
      };

      if (output.grievanceId) {
        updateData.grievanceId = output.grievanceId;
      }

      await db.collection(COLLECTIONS.APPLICATIONS).doc(input.applicationId).set(updateData, { merge: true });

      console.log(`[RejectionProcessor] Job ${job.id} completed. Reapply: ${output.reapplyRecommended}`);
      return output;
    },
    { connection, concurrency: QUEUE.WORKER_CONCURRENCY_LOW },
  );

  worker.on('failed', (job, err) => {
    console.error(`[RejectionProcessor] Job ${job?.id} failed: ${err.message}`);
  });

  console.log('[RejectionProcessor] Worker started.');
}

export async function stopRejectionProcessor(): Promise<void> {
  await worker?.close();
}

