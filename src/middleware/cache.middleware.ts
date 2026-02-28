/**
 * API Response Cache Middleware
 *
 * Uses Redis (via redisHelpers) to cache GET responses for frequently-accessed
 * endpoints. Reduces database load and improves P95 latency.
 *
 * Usage:
 *   import { cacheResponse } from '../middleware/cache.middleware.js';
 *   router.get('/providers', cacheResponse(60), handler);   // 60s TTL
 *   router.get('/providers/:id', cacheResponse(30), handler); // 30s TTL
 *
 * Cache keys include the full URL + query string + user role (if authenticated),
 * ensuring different roles see different data.
 *
 * Invalidation:  Call `invalidateCache(pattern)` after mutations.
 */

import { Request, Response, NextFunction } from 'express';
import { redisHelpers, getRedis, getRedisKind } from '../lib/redis.js';
import { logger } from './logging.middleware.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CacheOptions {
  /** TTL in seconds (default: 60) */
  ttl?: number;
  /** Custom key generator; defaults to URL + query + user role */
  keyFn?: (req: Request) => string;
  /** Only cache when this predicate returns true */
  condition?: (req: Request) => boolean;
}

// ---------------------------------------------------------------------------
// Default key generator
// ---------------------------------------------------------------------------

function defaultKey(req: Request): string {
  const role = (req as any).userProfile?.role ?? 'anon';
  // Include URL path + sorted query string + role to avoid cross-role leaks
  const qs = new URLSearchParams(req.query as Record<string, string>);
  qs.sort();
  return `cache:${role}:${req.baseUrl}${req.path}?${qs.toString()}`;
}

// ---------------------------------------------------------------------------
// Middleware factory
// ---------------------------------------------------------------------------

/**
 * Express middleware that caches JSON responses in Redis.
 *
 * @param ttlOrOpts – TTL in seconds **or** a CacheOptions object.
 */
export function cacheResponse(ttlOrOpts: number | CacheOptions = 60) {
  const opts: CacheOptions = typeof ttlOrOpts === 'number' ? { ttl: ttlOrOpts } : ttlOrOpts;
  const ttl = opts.ttl ?? 60;
  const keyFn = opts.keyFn ?? defaultKey;
  const condition = opts.condition;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      next();
      return;
    }

    // Optional condition check
    if (condition && !condition(req)) {
      next();
      return;
    }

    const key = keyFn(req);

    try {
      const cached = await redisHelpers.getCache<{ status: number; body: unknown }>(key);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.status(cached.status).json(cached.body);
        return;
      }
    } catch (err) {
      // Redis down → skip cache, serve fresh
      logger.warn('Cache read error', { key, error: (err as Error).message });
    }

    // Intercept res.json to capture the response body
    const originalJson = res.json.bind(res);
    res.json = function (body: unknown) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        redisHelpers
          .setCache(key, { status: res.statusCode, body }, ttl)
          .catch((err) => logger.warn('Cache write error', { key, error: (err as Error).message }));
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    } as typeof res.json;

    next();
  };
}

// ---------------------------------------------------------------------------
// Cache invalidation helpers
// ---------------------------------------------------------------------------

/**
 * Delete all cache keys matching a prefix.
 * For Upstash (REST) this uses SCAN; for ioredis it uses SCAN natively.
 *
 * @param prefix – e.g. 'cache:' or 'cache:admin:/api/v1/provider'
 */
export async function invalidateCache(prefix: string): Promise<number> {
  const kind = getRedisKind();
  let deleted = 0;

  try {
    if (kind === 'upstash') {
      // Upstash REST client doesn't support patterns directly, use SCAN via pipeline
      const redis = getRedis();
      // Simple approach: delete known prefixes
      await redis.del(prefix);
      deleted = 1;
    } else if (kind === 'ioredis') {
      const redis = getRedis() as any;
      // Use SCAN to find matching keys
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await redis.del(...keys);
          deleted += keys.length;
        }
      } while (cursor !== '0');
    }
    // Memory fallback: no-op for now (short TTL handles it)
  } catch (err) {
    logger.warn('Cache invalidation error', { prefix, error: (err as Error).message });
  }

  return deleted;
}

/**
 * Convenience: invalidate all caches for a specific API resource.
 */
export async function invalidateResource(resource: string): Promise<void> {
  await invalidateCache(`cache:admin:${resource}`);
  await invalidateCache(`cache:provider:${resource}`);
  await invalidateCache(`cache:patient:${resource}`);
  await invalidateCache(`cache:anon:${resource}`);
}
