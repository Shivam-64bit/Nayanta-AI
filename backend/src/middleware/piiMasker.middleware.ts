/**
 * middleware/piiMasker.middleware.ts
 *
 * Masks sensitive Indian PII patterns before any logging.
 * Intercepts the logging stream — not the actual request/response bodies.
 * Patterns: Aadhaar (12-digit), phone (10-digit Indian), bank account (9-18 digit numeric).
 */

import { Request, Response, NextFunction } from 'express';

// Aadhaar: 12 consecutive digits (may be space-separated in groups of 4)
const AADHAAR_PATTERN = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;

// Indian mobile: +91 or 91 prefix followed by 10 digits, or plain 10-digit starting with 6-9
const PHONE_PATTERN = /(?:\+91|91)?[6-9]\d{9}\b/g;

// Bank account: 9 to 18 consecutive digits (not already matched as Aadhaar)
const BANK_ACCOUNT_PATTERN = /\b\d{9,18}\b/g;

// IFSC code: 4 letters + 0 + 6 alphanumeric
const IFSC_PATTERN = /\b[A-Z]{4}0[A-Z0-9]{6}\b/g;

/**
 * Masks all PII patterns in a string for safe logging.
 */
export function maskPii(input: string): string {
  return input
    .replace(AADHAAR_PATTERN, 'AADHAAR-XXXX')
    .replace(PHONE_PATTERN, 'PHONE-XXXX')
    .replace(BANK_ACCOUNT_PATTERN, 'ACCOUNT-XXXX')
    .replace(IFSC_PATTERN, 'IFSC-XXXX');
}

/**
 * Express middleware that attaches a safe logging helper to res.locals.
 * Route handlers should use res.locals.safeLog() instead of console.log()
 * when logging user-supplied data.
 */
export function piiMaskerMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.locals['safeLog'] = (data: unknown): string => {
    const serialized = typeof data === 'string' ? data : JSON.stringify(data);
    return maskPii(serialized);
  };
  next();
}
