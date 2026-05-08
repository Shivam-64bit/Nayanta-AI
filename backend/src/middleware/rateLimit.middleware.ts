/**
 * middleware/rateLimit.middleware.ts
 *
 * Per-endpoint rate limiting using express-rate-limit.
 * Sliding window, per-IP keyed by X-Forwarded-For (trust Cloud Run proxy).
 * Returns 429 with Retry-After header on breach.
 */

import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';
import { ApiError } from '../schemas';

type EndpointKey =
  | 'profile'
  | 'eligibility'
  | 'documents'
  | 'drafting'
  | 'tracking'
  | 'rejection'
  | 'family'
  | 'health'
  | 'admin';

const LIMITS: Record<EndpointKey, { windowMs: number; max: number }> = {
  profile:     { windowMs: 60_000,       max: 10  },  // 10 req/min
  eligibility: { windowMs: 60_000,       max: 20  },  // 20 req/min
  documents:   { windowMs: 60_000,       max: 10  },  // 10 req/min
  drafting:    { windowMs: 60_000,       max: 5   },  // 5  req/min
  tracking:    { windowMs: 60_000,       max: 30  },  // 30 req/min
  rejection:   { windowMs: 60_000,       max: 5   },  // 5  req/min
  family:      { windowMs: 60_000,       max: 5   },  // 5  req/min
  health:      { windowMs: 10_000,       max: 30  },  // 30 req/10s
  admin:       { windowMs: 60_000,       max: 60  },  // 60 req/min
};

const handlerCache = new Map<EndpointKey, RateLimitRequestHandler>();

/**
 * Returns a memoized rate limiter for the given endpoint key.
 */
export function rateLimiter(endpoint: EndpointKey): RateLimitRequestHandler {
  if (handlerCache.has(endpoint)) {
    return handlerCache.get(endpoint)!;
  }

  const { windowMs, max } = LIMITS[endpoint];

  const limiter = rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator(req: Request) {
      // Use authenticated user ID if available, else fall back to IP
      return req.user?.uid ?? (req.ip ?? 'unknown');
    },
    handler(req: Request, res: Response) {
      const body: ApiError = {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests to "${endpoint}". Please slow down and retry.`,
        },
        requestId: req.requestId ?? 'unknown',
      };
      res.status(429).json(body);
    },
  });

  handlerCache.set(endpoint, limiter);
  return limiter;
}
