/**
 * server.ts
 *
 * Express application entry point.
 *
 * Middleware stack is applied in this exact order:
 *   1. Request ID injection
 *   2. Helmet (security headers)
 *   3. CORS
 *   4. JSON body parser (configurable limit via BODY_LIMIT env)
 *   5. PII masker
 *   6. Routes (each route applies its own auth, rate limit, and validation)
 *   7. Error handler (must be last)
 *
 * Graceful shutdown handles: HTTP server drain, BullMQ queue close, Redis disconnect.
 */

import express from 'express';
import { randomUUID } from 'node:crypto';
import { SERVER } from './config/constants';
import { securityMiddleware } from './middleware/security.middleware';
import { corsMiddleware } from './middleware/cors.middleware';
import { piiMaskerMiddleware } from './middleware/piiMasker.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';
import { initializeFirestore } from './config/firestore.config';
import { queueManager } from './queue/QueueManager';
import { startDeadLetterHandler, stopDeadLetterHandler } from './queue/deadLetter';
import { startProfileProcessor, stopProfileProcessor } from './queue/processors/profile.processor';
import { startEligibilityProcessor, stopEligibilityProcessor } from './queue/processors/eligibility.processor';
import { startDocumentsProcessor, stopDocumentsProcessor } from './queue/processors/documents.processor';
import { startDraftingProcessor, stopDraftingProcessor } from './queue/processors/drafting.processor';
import { startTrackingProcessor, stopTrackingProcessor } from './queue/processors/tracking.processor';
import { startRejectionProcessor, stopRejectionProcessor } from './queue/processors/rejection.processor';
import { startFamilyProcessor, stopFamilyProcessor } from './queue/processors/family.processor';

import profileRoutes from './routes/profile.routes';
import eligibilityRoutes from './routes/eligibility.routes';
import documentsRoutes from './routes/documents.routes';
import draftingRoutes from './routes/drafting.routes';
import trackingRoutes from './routes/tracking.routes';
import rejectionRoutes from './routes/rejection.routes';
import familyRoutes from './routes/family.routes';
import adminRoutes from './routes/admin.routes';
import healthRoutes from './routes/health.routes';

const app = express();

// ---------------------------------------------------------------------------
// 1. Request ID — injected before anything else for traceability
// ---------------------------------------------------------------------------
app.use((req, _res, next) => {
  req.requestId = (req.headers['x-request-id'] as string) ?? randomUUID();
  next();
});

// ---------------------------------------------------------------------------
// 2. Security headers (Helmet)
// ---------------------------------------------------------------------------
app.use(securityMiddleware);

// ---------------------------------------------------------------------------
// 3. CORS
// ---------------------------------------------------------------------------
app.use(corsMiddleware);

// ---------------------------------------------------------------------------
// 4. Body parser — limit driven by BODY_LIMIT env var
// ---------------------------------------------------------------------------
app.use(express.json({ limit: SERVER.BODY_LIMIT }));

// ---------------------------------------------------------------------------
// 5. PII masker — attaches res.locals.safeLog() for route handlers
// ---------------------------------------------------------------------------
app.use(piiMaskerMiddleware);

// ---------------------------------------------------------------------------
// 6. Route mounting
//    Auth, rate limiting, and Zod validation are applied per-route.
// ---------------------------------------------------------------------------
app.use('/api/profile', profileRoutes);
app.use('/api/eligibility', eligibilityRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/draft', draftingRoutes);
app.use('/api/track', trackingRoutes);
app.use('/api/rejection', rejectionRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/health', healthRoutes);
// Job status is nested under health routes at /api/health/jobs/:jobId/status

// ---------------------------------------------------------------------------
// 7. Global error handler — must be registered last
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Bootstrap — initialize all external connections, then start listening
// ---------------------------------------------------------------------------
async function bootstrap(): Promise<void> {
  console.log('[Server] Initializing Firestore...');
  await initializeFirestore();

  console.log('[Server] Initializing BullMQ queues...');
  queueManager.initialize();

  console.log('[Server] Starting dead letter handler...');
  startDeadLetterHandler();

  console.log('[Server] Starting queue processors...');
  startProfileProcessor();
  startEligibilityProcessor();
  startDocumentsProcessor();
  startDraftingProcessor();
  startTrackingProcessor();
  startRejectionProcessor();
  startFamilyProcessor();

  const server = app.listen(SERVER.PORT, () => {
    console.log(`[Server] Nayanta AI backend listening on port ${SERVER.PORT}`);
    console.log(`[Server] Environment: ${SERVER.NODE_ENV}`);
  });

  // -------------------------------------------------------------------------
  // Graceful shutdown
  // -------------------------------------------------------------------------
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[Server] Received ${signal}. Starting graceful shutdown...`);

    // 1. Stop accepting new connections
    server.close(() => {
      console.log('[Server] HTTP server closed.');
    });

    // 2. Stop all queue processors (let in-progress jobs finish)
    console.log('[Server] Stopping queue processors...');
    await Promise.allSettled([
      stopProfileProcessor(),
      stopEligibilityProcessor(),
      stopDocumentsProcessor(),
      stopDraftingProcessor(),
      stopTrackingProcessor(),
      stopRejectionProcessor(),
      stopFamilyProcessor(),
    ]);

    // 3. Stop dead letter handler
    await stopDeadLetterHandler();

    // 4. Close queue manager (closes queues and Redis connection)
    console.log('[Server] Closing queue manager...');
    await queueManager.shutdown();

    console.log('[Server] Shutdown complete.');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('[Server] Fatal error during startup:', err);
  process.exit(1);
});

export default app;
