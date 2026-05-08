/**
 * middleware/security.middleware.ts
 *
 * Helmet with strict CSP, HSTS with preload, and X-Frame-Options DENY.
 * Applied as the first middleware in the stack.
 */

import helmet from 'helmet';
import { RequestHandler } from 'express';
import { SECURITY } from '../config/constants';

export const securityMiddleware: RequestHandler[] = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'none'"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: SECURITY.HSTS_MAX_AGE,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'no-referrer' },
  }),
];
