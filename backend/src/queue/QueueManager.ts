/**
 * queue/QueueManager.ts
 *
 * Central BullMQ queue registry.
 * One queue per agent (7 total).
 * Configuration driven by constants — no hardcoded retry counts or TTLs.
 */

import { Queue, Job, JobsOptions } from 'bullmq';
import Redis from 'ioredis';
import { getRedisConnectionOptions } from '../config/redis.config';
import { QUEUE } from '../config/constants';

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

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: QUEUE.MAX_ATTEMPTS,
  backoff: {
    type: 'exponential',
    delay: QUEUE.BACKOFF_BASE_MS,
  },
  removeOnComplete: { age: QUEUE.COMPLETED_TTL_SECONDS },
  removeOnFail: { age: QUEUE.FAILED_TTL_SECONDS },
};

class QueueManager {
  private readonly queues = new Map<QueueName, Queue>();
  private connection: Redis | null = null;

  initialize(): void {
    const opts = getRedisConnectionOptions();
    this.connection = new Redis(opts.url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: opts.tls,
    });

    for (const name of QUEUE_NAMES) {
      this.queues.set(
        name,
        new Queue(name, {
          connection: this.connection,
          defaultJobOptions: DEFAULT_JOB_OPTIONS,
        }),
      );
    }

    console.log('[QueueManager] All queues initialized:', QUEUE_NAMES.join(', '));
  }

  private getQueue(name: QueueName): Queue {
    const queue = this.queues.get(name);
    if (!queue) {
      throw new Error(
        `Queue "${name}" is not initialized. Call queueManager.initialize() first.`,
      );
    }
    return queue;
  }

  /**
   * Enqueues a job on the specified agent queue.
   * Returns the created BullMQ Job instance.
   */
  async enqueue<T>(queueName: QueueName, data: T, jobOptions?: JobsOptions): Promise<Job<T>> {
    const queue = this.getQueue(queueName);
    const job = await queue.add(queueName, data, jobOptions);
    console.log(`[QueueManager] Job enqueued: queue=${queueName} jobId=${job.id}`);
    return job;
  }

  /**
   * Returns the current status and metadata of a job by ID and queue name.
   */
  async getJobStatus(queueName: QueueName, jobId: string): Promise<Job | null> {
    const queue = this.getQueue(queueName);
    return queue.getJob(jobId);
  }

  /**
   * Returns waiting, active, and failed counts for every queue.
   */
  async getQueueHealth(): Promise<
    Record<QueueName, { waiting: number; active: number; failed: number }>
  > {
    const result = {} as Record<QueueName, { waiting: number; active: number; failed: number }>;

    for (const name of QUEUE_NAMES) {
      const queue = this.getQueue(name);
      const [waiting, active, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getFailedCount(),
      ]);
      result[name] = { waiting, active, failed };
    }

    return result;
  }

  /**
   * Gracefully closes all queues and the Redis connection.
   * Call during server shutdown.
   */
  async shutdown(): Promise<void> {
    for (const [name, queue] of this.queues.entries()) {
      await queue.close();
      console.log(`[QueueManager] Queue closed: ${name}`);
    }
    if (this.connection) {
      this.connection.disconnect();
    }
  }
}

export const queueManager = new QueueManager();
