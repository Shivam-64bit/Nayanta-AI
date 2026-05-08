/**
 * routes/tracking.routes.ts
 *
 * GET  /api/track/:applicationId — return application state + state history
 * POST /api/track/confirm-receipt — confirm disbursal received
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rateLimit.middleware';
import { validate } from '../middleware/validate.middleware';
import { ConfirmReceiptRequestSchema, ApiSuccess } from '../schemas';
import { getFirestore } from '../config/firestore.config';
import { COLLECTIONS } from '../config/constants';

const router = Router();

/**
 * GET /api/track/:applicationId
 * Returns the current state, state history, and tracking metadata.
 */
router.get(
  '/:applicationId',
  authenticate,
  rateLimiter('tracking'),
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

      const data = appDoc.data()!;
      const body: ApiSuccess<{
        applicationId: string;
        state: string;
        stateHistory: unknown[];
        nspStatus: string | null;
        pfmsStatus: string | null;
        disbursementConfirmed: boolean;
      }> = {
        success: true,
        data: {
          applicationId,
          state: data.state ?? 'PENDING',
          stateHistory: data.stateHistory ?? [],
          nspStatus: data.nspStatus ?? null,
          pfmsStatus: data.pfmsStatus ?? null,
          disbursementConfirmed: data.disbursementConfirmed ?? false,
        },
        requestId: req.requestId ?? 'unknown',
      };
      res.status(200).json(body);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/track/confirm-receipt
 * Marks disbursal as confirmed in Firestore.
 */
router.post(
  '/confirm-receipt',
  authenticate,
  rateLimiter('tracking'),
  validate(ConfirmReceiptRequestSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { applicationId, confirmedAt } = req.body;

      const db = getFirestore();
      const appRef = db.collection(COLLECTIONS.APPLICATIONS).doc(applicationId);
      const appDoc = await appRef.get();

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

      await appRef.set(
        {
          disbursementConfirmed: true,
          disbursementConfirmedAt: confirmedAt,
          state: 'RECEIVED',
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      const body: ApiSuccess<{ applicationId: string; confirmed: boolean }> = {
        success: true,
        data: { applicationId, confirmed: true },
        requestId: req.requestId ?? 'unknown',
      };
      res.status(200).json(body);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
