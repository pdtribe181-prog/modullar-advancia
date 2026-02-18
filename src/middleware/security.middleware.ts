import helmet from 'helmet';
import { Express } from 'express';
import { logger } from './logging.middleware.js';

/**
 * Configure security headers using Helmet
 * https://helmetjs.github.io/
 */
export function configureSecurityHeaders(app: Express) {
  app.use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'js.stripe.com'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'api.stripe.com', '*.supabase.co'],
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
 * Configure CORS based on environment
 */
export function getCorsConfig() {
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3001',
    'http://localhost:3001',
    'http://localhost:5173', // Vite dev server
  ];

  // Add production origins
  if (process.env.NODE_ENV === 'production') {
    allowedOrigins.push(
      'https://advancia.us',
      'https://www.advancia.us',
      'https://app.advancia.us'
    );
  }

  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn('CORS blocked origin', { origin });
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400, // 24 hours
  };
}
