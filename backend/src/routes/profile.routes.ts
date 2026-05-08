/**
 * routes/profile.routes.ts
 *
 * POST /api/profile/submit
 *   Auth: required
 *   Body: SubmitProfileRequestSchema
 *   Response: ApiSuccess<{ jobId: string }> — HTTP 202
 *   Enqueues a ProfileAgent job via QueueManager.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rateLimit.middleware';
import { validate } from '../middleware/validate.middleware';
import { queueManager } from '../queue/QueueManager';
import { SubmitProfileRequestSchema, ApiSuccess } from '../schemas';

const router = Router();

router.post(
  '/submit',
  authenticate,
  rateLimiter('profile'),
  validate(SubmitProfileRequestSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const job = await queueManager.enqueue('profile', req.body);

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
