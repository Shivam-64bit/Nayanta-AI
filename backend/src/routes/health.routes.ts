/**
 * routes/health.routes.ts
 *
 * GET /api/health             — system health, service connectivity, queue depths
 * GET /api/jobs/:jobId/status — poll job completion status across all queues
 */

import { Router, Request, Response, NextFunction } from 'express';
import { rateLimiter } from '../middleware/rateLimit.middleware';
import { queueManager } from '../queue/QueueManager';
import { getRedisClient } from '../config/redis.config';
import { COLLECTIONS, EXTERNAL } from '../config/constants';
import { ApiSuccess, HealthStatus } from '../schemas';

const APP_VERSION = process.env.npm_package_version ?? '0.0.0';

const router = Router();

/**
 * GET /api/health
 * No auth required — used by Cloud Run, load balancers, and uptime monitors.
 */
router.get(
  '/',
  rateLimiter('health'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check Redis connectivity
      let redisStatus: 'up' | 'down' = 'down';
      try {
        const redis = getRedisClient();
        const pong = await redis.ping();
        redisStatus = pong === 'PONG' ? 'up' : 'down';
      } catch {
        redisStatus = 'down';
      }

      // Check Firestore connectivity
      let firestoreStatus: 'up' | 'down' = 'down';
      try {
        const { getFirestore } = await import('../config/firestore.config');
        const db = getFirestore();
        await db.collection(COLLECTIONS.HEALTH_CHECK).limit(1).get();
        firestoreStatus = 'up';
      } catch {
        firestoreStatus = 'down';
      }

      // Check Qdrant connectivity (Person 3's service — best-effort check)
      let qdrantStatus: 'up' | 'down' = 'down';
      try {
        const qdrantUrl = EXTERNAL.QDRANT_URL;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), EXTERNAL.QDRANT_HEALTH_TIMEOUT_MS);
        const resp = await fetch(`${qdrantUrl}/healthz`, { signal: controller.signal });
        clearTimeout(timeout);
        qdrantStatus = resp.ok ? 'up' : 'down';
      } catch {
        qdrantStatus = 'down';
      }

      // Get queue depths
      let queues: HealthStatus['queues'] = {};
      try {
        queues = await queueManager.getQueueHealth();
      } catch {
        // Queue manager may not be initialized yet
      }

      const allServicesUp =
        redisStatus === 'up' && firestoreStatus === 'up';

      const overallStatus: HealthStatus['status'] = allServicesUp
        ? 'healthy'
        : redisStatus === 'up' || firestoreStatus === 'up'
          ? 'degraded'
          : 'unhealthy';

      const health: HealthStatus = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        services: {
          firestore: firestoreStatus,
          redis: redisStatus,
          qdrant: qdrantStatus,
        },
        queues,
        version: APP_VERSION,
      };

      const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;

      const body: ApiSuccess<HealthStatus> = {
        success: true,
        data: health,
        requestId: req.requestId ?? 'unknown',
      };
      res.status(httpStatus).json(body);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/jobs/:jobId/status
 * Polls job status. Checks all queues until the job is found.
 */
router.get(
  '/jobs/:jobId/status',
  rateLimiter('health'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { jobId } = req.params;

      const queueNames = [
        'profile',
        'eligibility',
        'documents',
        'drafting',
        'tracking',
        'rejection',
        'family',
      ] as const;

      for (const queueName of queueNames) {
        const job = await queueManager.getJobStatus(queueName, jobId);
        if (job) {
          const state = await job.getState();

          const body: ApiSuccess<{
            jobId: string;
            queue: string;
            status: string;
            progress: number;
            result: unknown;
            failReason: string | undefined;
            createdAt: number;
            processedAt: number | undefined;
            finishedAt: number | undefined;
          }> = {
            success: true,
            data: {
              jobId: job.id!,
              queue: queueName,
              status: state,
              progress: typeof job.progress === 'number' ? job.progress : 0,
              result: job.returnvalue ?? null,
              failReason: job.failedReason ?? undefined,
              createdAt: job.timestamp,
              processedAt: job.processedOn ?? undefined,
              finishedAt: job.finishedOn ?? undefined,
            },
            requestId: req.requestId ?? 'unknown',
          };
          res.status(200).json(body);
          return;
        }
      }

      res.status(404).json({
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: `No job found with id "${jobId}" in any queue.`,
        },
        requestId: req.requestId ?? 'unknown',
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
