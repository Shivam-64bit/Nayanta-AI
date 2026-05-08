/**
 * middleware/auth.middleware.ts
 *
 * Firebase ID token verification.
 * Attaches decoded token payload to req.user on success.
 * Returns 401 on missing, invalid, or expired tokens.
 */

import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { ApiError } from '../schemas';

declare global {
  namespace Express {
    interface Request {
      user?: admin.auth.DecodedIdToken;
      requestId?: string;
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const body: ApiError = {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authorization header is missing or malformed. Expected: Bearer <token>',
      },
      requestId: req.requestId ?? 'unknown',
    };
    res.status(401).json(body);
    return;
  }

  const idToken = authHeader.slice(7);

  try {
    const decoded = await admin.auth().verifyIdToken(idToken, true /* checkRevoked */);
    req.user = decoded;
    next();
  } catch (err: unknown) {
    const code =
      err instanceof Error && err.message.includes('expired')
        ? 'TOKEN_EXPIRED'
        : 'INVALID_TOKEN';

    const body: ApiError = {
      success: false,
      error: {
        code,
        message: 'The provided Firebase ID token is invalid or has expired.',
      },
      requestId: req.requestId ?? 'unknown',
    };
    res.status(401).json(body);
  }
}

/**
 * Role guard — restricts a route to users with a specific custom claim.
 * Usage: router.get('/admin/...', authenticate, requireRole('admin'), handler)
 */
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const claims = req.user;
    if (!claims || claims[role] !== true) {
      const body: ApiError = {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires "${role}" role.`,
        },
        requestId: req.requestId ?? 'unknown',
      };
      res.status(403).json(body);
      return;
    }
    next();
  };
}
