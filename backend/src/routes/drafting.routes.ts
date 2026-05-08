/**
 * routes/drafting.routes.ts
 *
 * POST /api/draft/application      — enqueue DraftingAgent job
 * GET  /api/draft/:applicationId   — return drafted application from Firestore
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rateLimit.middleware';
import { validate } from '../middleware/validate.middleware';
import { queueManager } from '../queue/QueueManager';
import { DraftApplicationRequestSchema, ApiSuccess } from '../schemas';
import { getFirestore } from '../config/firestore.config';
import { COLLECTIONS } from '../config/constants';

const router = Router();

/**
 * POST /api/draft/application
 * Fetches the user profile, then enqueues a DraftingAgent job.
 */
router.post(
  '/application',
  authenticate,
  rateLimiter('drafting'),
  validate(DraftApplicationRequestSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, schemeId, applicationId } = req.body;

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
      const job = await queueManager.enqueue('drafting', {
        userId,
        applicationId,
        profile,
        schemeId,
        documentUrls: profile?.documentUrls ?? {},
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

/**
 * GET /api/draft/:applicationId
 * Returns the drafted application from Firestore including the PDF URL.
 */
router.get(
  '/:applicationId',
  authenticate,
  rateLimiter('drafting'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { applicationId } = req.params;

      const db = getFirestore();
      const appDoc = await db.collection(COLLECTIONS.APPLICATIONS).doc(applicationId).get();

      if (!appDoc.exists) {
        res.status(404).json({
          success: false,
          error: {
            code: 'APPLICATION_NOT_FOUND',
            message: `No application found with id "${applicationId}".`,
          },
          requestId: req.requestId ?? 'unknown',
        });
        return;
      }

      const body: ApiSuccess<FirebaseFirestore.DocumentData> = {
        success: true,
        data: appDoc.data()!,
        requestId: req.requestId ?? 'unknown',
      };
      res.status(200).json(body);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
