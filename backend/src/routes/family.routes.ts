/**
 * routes/family.routes.ts
 *
 * POST /api/family/map — enqueue FamilyMapperAgent job
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rateLimit.middleware';
import { validate } from '../middleware/validate.middleware';
import { queueManager } from '../queue/QueueManager';
import { MapFamilyRequestSchema, ApiSuccess } from '../schemas';

const router = Router();

router.post(
  '/map',
  authenticate,
  rateLimiter('family'),
  validate(MapFamilyRequestSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const job = await queueManager.enqueue('family', req.body);

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
