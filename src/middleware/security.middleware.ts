import helmet from 'helmet';
import { Express, Request, Response, NextFunction } from 'express';
import { logger } from './logging.middleware.js';
import crypto from 'crypto';
import { APP_ORIGINS, getAllowedAppOrigins } from '../utils/app-origins.js';

/**
 * Configure security headers using Helmet
 * https://helmetjs.github.io/
 */
export function configureSecurityHeaders(app: Express) {
  // Generate a unique nonce per request for inline scripts
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
    next();
  });

  app.use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // Use nonce instead of unsafe-inline for scripts
          scriptSrc: [
            "'self'",
            'js.stripe.com',
            // The nonce is injected per-request via res.locals.cspNonce
            ((_req: Request, res: Response) =>
              `'nonce-${(res as any).locals.cspNonce}'`) as unknown as string,
          ],
          // Stripe elements require unsafe-inline for styles — acceptable tradeoff
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'api.stripe.com', '*.supabase.co', '*.ingest.sentry.io'],
          frameSrc: ["'self'", 'js.stripe.com', 'hooks.stripe.com'],
          fontSrc: ["'self'", 'https:', 'data:'],
        },
      },
      // Prevent clickjacking
      frameguard: { action: 'deny' },
      // Hide X-Powered-By header
      hidePoweredBy: true,
      // Strict Transport Security
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      // Prevent MIME type sniffing
      noSniff: true,
      // XSS Protection (legacy browsers)
      xssFilter: true,
      // Referrer Policy
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );
}

/**
 * Configure CORS based on environment.
 * All three app domains (PayLedger, Healthcare, app subdomain) are always allowed.
 */
export function getCorsConfig() {
  const allowedOrigins = getAllowedAppOrigins();

  return {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      if (!origin) {
        if (process.env.NODE_ENV === 'production') {
          logger.debug('Request with no origin allowed (server-to-server)', {});
        }
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn('CORS blocked origin', { origin });
        // Deny without throwing so response is 200 and browser gets no CORS header (clean block)
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400, // 24 hours
  };
}
