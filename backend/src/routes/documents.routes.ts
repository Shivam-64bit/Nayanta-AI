/**
 * routes/documents.routes.ts
 *
 * POST /api/documents/validate          — enqueue DocIntelligenceAgent job
 * GET  /api/documents/checklist/:schemeId — return required documents for a scheme
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rateLimit.middleware';
import { validate } from '../middleware/validate.middleware';
import { queueManager } from '../queue/QueueManager';
import { ValidateDocumentsRequestSchema, ApiSuccess } from '../schemas';
import { getFirestore } from '../config/firestore.config';
import { COLLECTIONS } from '../config/constants';

const router = Router();

/**
 * POST /api/documents/validate
 * Enqueues a DocIntelligenceAgent job for 7-layer document validation.
 */
router.post(
  '/validate',
  authenticate,
  rateLimiter('documents'),
  validate(ValidateDocumentsRequestSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const job = await queueManager.enqueue('documents', req.body);

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
 * GET /api/documents/checklist/:schemeId
 * Returns the list of required document types for a given scholarship scheme.
 */
router.get(
  '/checklist/:schemeId',
  authenticate,
  rateLimiter('documents'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { schemeId } = req.params;

      const db = getFirestore();
      const schemeDoc = await db.collection(COLLECTIONS.SCHOLARSHIPS).doc(schemeId).get();

      if (!schemeDoc.exists) {
        res.status(404).json({
          success: false,
          error: { code: 'SCHEME_NOT_FOUND', message: `No scheme found with id "${schemeId}".` },
          requestId: req.requestId ?? 'unknown',
        });
        return;
      }

      const scheme = schemeDoc.data();
      const requiredDocuments = scheme?.eligibility?.requiredDocuments ?? [];

      const body: ApiSuccess<{ schemeId: string; requiredDocuments: string[] }> = {
        success: true,
        data: { schemeId, requiredDocuments },
        requestId: req.requestId ?? 'unknown',
      };
      res.status(200).json(body);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
