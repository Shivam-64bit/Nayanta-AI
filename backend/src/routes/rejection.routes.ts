/**
 * routes/rejection.routes.ts
 *
 * POST /api/rejection/analyze — enqueue RejectionAgent job
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rateLimit.middleware';
import { validate } from '../middleware/validate.middleware';
import { queueManager } from '../queue/QueueManager';
import { AnalyzeRejectionRequestSchema, ApiSuccess } from '../schemas';

const router = Router();

router.post(
  '/analyze',
  authenticate,
  rateLimiter('rejection'),
  validate(AnalyzeRejectionRequestSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const job = await queueManager.enqueue('rejection', req.body);

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
