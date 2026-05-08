/**
 * routes/admin.routes.ts
 *
 * GET /api/admin/stats         — aggregate platform statistics
 * GET /api/admin/applications  — list all applications with filters
 *
 * Both routes require the "admin" custom claim on the Firebase token.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rateLimit.middleware';
import { getFirestore } from '../config/firestore.config';
import { COLLECTIONS, PAGINATION } from '../config/constants';
import { ApiSuccess } from '../schemas';

const router = Router();

/**
 * GET /api/admin/stats
 * Returns aggregate counts: total users, applications by state, total disbursed.
 */
router.get(
  '/stats',
  authenticate,
  requireRole('admin'),
  rateLimiter('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const db = getFirestore();

      const [usersSnap, appsSnap] = await Promise.all([
        db.collection(COLLECTIONS.USERS).count().get(),
        db.collection(COLLECTIONS.APPLICATIONS).get(),
      ]);

      const totalUsers = usersSnap.data().count;
      const applications = appsSnap.docs.map((d) => d.data());

      const stateCounts: Record<string, number> = {};
      let disbursedCount = 0;

      for (const app of applications) {
        const state = (app.state as string) ?? 'PENDING';
        stateCounts[state] = (stateCounts[state] ?? 0) + 1;
        if (app.disbursementConfirmed === true) {
          disbursedCount += 1;
        }
      }

      const body: ApiSuccess<{
        totalUsers: number;
        totalApplications: number;
        stateCounts: Record<string, number>;
        totalDisbursed: number;
      }> = {
        success: true,
        data: {
          totalUsers,
          totalApplications: applications.length,
          stateCounts,
          totalDisbursed: disbursedCount,
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
 * GET /api/admin/applications
 * Returns all applications, optionally filtered by state or userId.
 * Query params: ?state=SUBMITTED&userId=xxx&limit=50&offset=0
 */
router.get(
  '/applications',
  authenticate,
  requireRole('admin'),
  rateLimiter('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const db = getFirestore();
      let query: FirebaseFirestore.Query = db.collection(COLLECTIONS.APPLICATIONS);

      const { state, userId, limit, offset } = req.query;

      if (typeof state === 'string' && state.length > 0) {
        query = query.where('state', '==', state);
      }
      if (typeof userId === 'string' && userId.length > 0) {
        query = query.where('userId', '==', userId);
      }

      query = query.orderBy('updatedAt', 'desc');

      const pageLimit = Math.min(Number(limit) || PAGINATION.DEFAULT_PAGE_SIZE, PAGINATION.MAX_PAGE_SIZE);
      const pageOffset = Number(offset) || 0;

      query = query.limit(pageLimit).offset(pageOffset);

      const snap = await query.get();
      const applications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const body: ApiSuccess<{ applications: unknown[]; count: number }> = {
        success: true,
        data: { applications, count: applications.length },
        requestId: req.requestId ?? 'unknown',
      };
      res.status(200).json(body);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
