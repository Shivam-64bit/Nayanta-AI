/**
 * middleware/cors.middleware.ts
 *
 * Whitelist-only CORS with full preflight support.
 * ALLOWED_ORIGINS env var accepts comma-separated origins.
 * No hardcoded localhost fallbacks — all origins must be declared in env.
 */

import cors from 'cors';
import { RequestHandler } from 'express';
import { CACHE } from '../config/constants';

const allowedOrigins: string[] = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export const corsMiddleware: RequestHandler = cors({
  origin(origin, callback) {
    // Allow server-to-server requests with no Origin header
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error(`Origin "${origin}" is not permitted by CORS policy.`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
  credentials: true,
  maxAge: CACHE.CORS_PREFLIGHT_MAX_AGE,
});
