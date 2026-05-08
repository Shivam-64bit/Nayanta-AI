/**
 * config/constants.ts
 *
 * Centralized application constants.
 * All magic numbers, collection names, and tunable defaults live here.
 * Environment variables override where applicable.
 */

// ---------------------------------------------------------------------------
// Firestore Collection Names
// ---------------------------------------------------------------------------
export const COLLECTIONS = {
  USERS: 'users',
  APPLICATIONS: 'applications',
  SCHOLARSHIPS: 'scholarships',
  DEAD_LETTER: 'dead_letter',
  HEALTH_CHECK: '_health_check',
} as const;

// ---------------------------------------------------------------------------
// Server Defaults
// ---------------------------------------------------------------------------
export const SERVER = {
  PORT: parseInt(process.env.PORT ?? '8080', 10),
  BODY_LIMIT: process.env.BODY_LIMIT ?? '100kb',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
} as const;

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
} as const;

// ---------------------------------------------------------------------------
// External Service Defaults
// ---------------------------------------------------------------------------
export const EXTERNAL = {
  QDRANT_URL: process.env.QDRANT_URL ?? 'http://localhost:6333',
  QDRANT_HEALTH_TIMEOUT_MS: 3000,
} as const;

// ---------------------------------------------------------------------------
// Queue Configuration
// ---------------------------------------------------------------------------
export const QUEUE = {
  MAX_ATTEMPTS: 3,
  BACKOFF_BASE_MS: 1_000,
  COMPLETED_TTL_SECONDS: 86_400,      // 24 hours
  FAILED_TTL_SECONDS: 259_200,        // 72 hours
  WORKER_CONCURRENCY_HIGH: 5,
  WORKER_CONCURRENCY_LOW: 3,
} as const;

// ---------------------------------------------------------------------------
// Cache / Secret TTLs
// ---------------------------------------------------------------------------
export const CACHE = {
  SECRET_TTL_MS: 5 * 60 * 1000,         // 5 minutes
  SIGNED_URL_EXPIRY_MS: 60 * 60 * 1000, // 1 hour
  CORS_PREFLIGHT_MAX_AGE: 86_400,       // 24 hours
} as const;

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------
export const SECURITY = {
  HSTS_MAX_AGE: 31_536_000,  // 1 year
} as const;
