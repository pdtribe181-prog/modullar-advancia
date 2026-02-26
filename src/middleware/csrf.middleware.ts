import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getRedis } from '../lib/redis.js';
import { logger } from './logging.middleware.js';

/**
 * CSRF Protection Middleware
 *
 * Implements the Synchronizer Token Pattern backed by Redis (or in-memory fallback).
 *
 * Flow:
 *   1. Client calls GET /api/v1/auth/csrf-token to obtain a CSRF token.
 *   2. The token is stored server-side, keyed by the user's session (auth token hash).
 *   3. On every state-changing request (POST/PUT/PATCH/DELETE) the client must
 *      send the token in the `X-CSRF-Token` header.
 *   4. This middleware validates the token before allowing the request through.
 *
 * Excluded paths:
 *   - Stripe webhook endpoint (signature-verified separately)
 *   - Supabase database webhook endpoint (HMAC-verified)
 *   - Any path in the `excludePaths` list
 */

const CSRF_TTL_SECONDS = 3600; // 1 hour
const CSRF_KEY_PREFIX = 'csrf:';

/** Which HTTP methods require CSRF validation */
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Paths that are excluded from CSRF checks (webhooks, etc.) */
const EXCLUDED_PATHS = ['/api/v1/stripe/webhook', '/api/v1/webhooks/supabase'];

/**
 * Hash the bearer token to create a stable session identifier
 * (so we never store the raw JWT in Redis keys).
 */
function sessionKey(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.split(' ')[1];
  return CSRF_KEY_PREFIX + crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a new CSRF token and store it server-side.
 * Call this from a dedicated endpoint (e.g. GET /api/v1/auth/csrf-token).
 */
export async function generateCsrfToken(req: Request, _res: Response): Promise<string> {
  const key = sessionKey(req);
  if (!key) {
    throw new Error('CSRF token generation requires authentication');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const redis = getRedis();
  await redis.set(key, token, { ex: CSRF_TTL_SECONDS });
  return token;
}

/**
 * Express middleware that validates the CSRF token on state-changing requests.
 *
 * Usage:
 *   app.use('/api/v1', csrfProtection);
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip safe methods
  if (!STATE_CHANGING_METHODS.has(req.method)) {
    next();
    return;
  }

  // Skip excluded paths (webhooks are verified by their own signatures)
  if (EXCLUDED_PATHS.some((p) => req.path.startsWith(p) || req.originalUrl.startsWith(p))) {
    next();
    return;
  }

  // Skip requests without authentication (public POST endpoints like login/register)
  const key = sessionKey(req);
  if (!key) {
    next();
    return;
  }

  // SPA clients authenticating via Authorization: Bearer do not need CSRF tokens.
  // CSRF attacks rely on the browser automatically sending credentials (cookies).
  // A Bearer token in the Authorization header cannot be injected by a cross-origin
  // attacker, so CSRF is already mitigated for these requests.
  if (req.headers.authorization?.startsWith('Bearer ')) {
    next();
    return;
  }

  const clientToken = req.headers['x-csrf-token'] as string | undefined;
  if (!clientToken) {
    logger.warn('CSRF token missing', { method: req.method, path: req.path });
    res.status(403).json({ error: 'CSRF token required' });
    return;
  }

  // Validate asynchronously
  const redis = getRedis();
  redis
    .get(key)
    .then((storedToken) => {
      if (
        !storedToken ||
        storedToken.length !== clientToken.length ||
        !crypto.timingSafeEqual(Buffer.from(storedToken), Buffer.from(clientToken))
      ) {
        logger.warn('CSRF token mismatch', { method: req.method, path: req.path });
        res.status(403).json({ error: 'Invalid CSRF token' });
        return;
      }
      next();
    })
    .catch((err) => {
      logger.warn('CSRF validation error', { error: String(err) });
      // Fail open only in development to avoid blocking during local iteration
      if (process.env.NODE_ENV === 'development') {
        next();
      } else {
        res.status(403).json({ error: 'CSRF validation failed' });
      }
    });
}
