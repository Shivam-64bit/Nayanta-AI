/**
 * middleware/errorHandler.middleware.ts
 *
 * Global Express error handler — must be the last middleware registered.
 * Normalizes all thrown errors into the standard ApiError shape.
 * Never exposes stack traces in production.
 */

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ApiError } from '../schemas';

interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const isProd = process.env.NODE_ENV === 'production';

  // Determine HTTP status code
  const statusCode = err.statusCode ?? 500;

  // Log the full error server-side
  console.error(
    JSON.stringify({
      level: 'error',
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode,
      message: err.message,
      stack: isProd ? undefined : err.stack,
    }),
  );

  const body: ApiError = {
    success: false,
    error: {
      code: err.code ?? 'INTERNAL_SERVER_ERROR',
      message: isProd
        ? 'An unexpected error occurred. Please try again later.'
        : err.message,
    },
    requestId: req.requestId ?? 'unknown',
  };

  res.status(statusCode).json(body);
};

/**
 * Factory for creating typed application errors with a specific status code.
 */
export function createError(
  message: string,
  statusCode: number,
  code: string,
): AppError {
  const err = new Error(message) as AppError;
  err.statusCode = statusCode;
  err.code = code;
  return err;
}
