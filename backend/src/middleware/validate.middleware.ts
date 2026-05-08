/**
 * middleware/validate.middleware.ts
 *
 * Generic Zod validation middleware factory.
 * Validates req.body against the provided Zod schema.
 * Returns 422 with field-level error details on failure.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiError } from '../schemas';

/**
 * Returns an Express middleware that validates req.body against the given Zod schema.
 * On success: req.body is replaced with the parsed (coerced) value.
 * On failure: responds immediately with 422 and structured validation errors.
 */
export function validate<T>(schema: ZodSchema<T>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (result.success) {
      req.body = result.data;
      next();
      return;
    }

    const zodError = result.error as ZodError;
    const firstIssue = zodError.issues[0];

    const body: ApiError = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: firstIssue
          ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
          : 'Request body failed validation.',
        field: firstIssue?.path.join('.'),
      },
      requestId: req.requestId ?? 'unknown',
    };

    res.status(422).json(body);
  };
}
