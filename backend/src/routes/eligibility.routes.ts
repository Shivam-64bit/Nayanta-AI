/**
 * routes/eligibility.routes.ts
 *
 * POST /api/eligibility/check  — enqueue DiscoveryAgent job
 * POST /api/eligibility/stack  — enqueue StackOptimizer job
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rateLimit.middleware';
import { validate } from '../middleware/validate.middleware';
import { queueManager } from '../queue/QueueManager';
import {
  CheckEligibilityRequestSchema,
  OptimizeStackRequestSchema,
  ApiSuccess,
} from '../schemas';
import { getFirestore } from '../config/firestore.config';
import { COLLECTIONS } from '../config/constants';

const router = Router();

/**
 * POST /api/eligibility/check
 * Fetches the user's stored profile and enqueues a DiscoveryAgent job.
 */
router.post(
  '/check',
  authenticate,
  rateLimiter('eligibility'),
  validate(CheckEligibilityRequestSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.body;

      const db = getFirestore();
      const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();

      if (!userDoc.exists) {
        res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: `No profile found for userId "${userId}".` },
          requestId: req.requestId ?? 'unknown',
        });
        return;
      }

      const profile = userDoc.data();
      const job = await queueManager.enqueue('eligibility', { userId, profile });

      const body: ApiSuccess<{ jobId: string }> = {
        success: true,
        data: { jobId: job.id! },
        requestId: req.requestId ?? 'unknown',
      };
      res.status(202).json(body);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/eligibility/stack
 * Enqueues a StackOptimizer job to find the best non-conflicting scholarship combination.
 */
router.post(
  '/stack',
  authenticate,
  rateLimiter('eligibility'),
  validate(OptimizeStackRequestSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const job = await queueManager.enqueue('eligibility', {
        ...req.body,
        _operation: 'stack_optimize',
      });

      const body: ApiSuccess<{ jobId: string }> = {
        success: true,
        data: { jobId: job.id! },
        requestId: req.requestId ?? 'unknown',
      };
      res.status(202).json(body);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
