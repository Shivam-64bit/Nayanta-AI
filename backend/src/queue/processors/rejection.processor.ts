/**
 * queue/processors/rejection.processor.ts
 *
 * BullMQ worker for the "rejection" queue.
 * Calls Person 3's RejectionAgent.
 * Writes the analysis and grievance draft to Firestore applications collection.
 */

import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { getRedisConnectionOptions } from '../../config/redis.config';
import { getFirestore } from '../../config/firestore.config';
import { COLLECTIONS, QUEUE } from '../../config/constants';
import { RejectionAgentInput, RejectionAgentOutput } from '../../schemas';

// TODO: Replace with Person 3's real agent once available
async function runRejectionAgent(_input: RejectionAgentInput): Promise<RejectionAgentOutput> {
  throw new Error('RejectionAgent is not yet implemented by Person 3. Connect agent here.');
}

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
      
      const updateData: any = {
        rejectionAnalysis: {
          confidenceScore: output.confidenceScore,
          suggestedAction: output.suggestedAction,
          reasoning: output.reasoning,
        },
        updatedAt: new Date().toISOString(),
      };

      if (output.grievanceDraftUrl) {
        updateData.grievanceDraftUrl = output.grievanceDraftUrl;
      }

      await db.collection(COLLECTIONS.APPLICATIONS).doc(input.applicationId).set(updateData, { merge: true });

      console.log(`[RejectionProcessor] Job ${job.id} completed. Action: ${output.suggestedAction}`);
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
