/**
 * Redis Client Configuration
 *
 * Unified Redis interface that supports:
 * 1. Upstash Redis (REST-based, preferred for production/serverless)
 * 2. ioredis (TCP-based, fallback for local development)
 * 3. In-memory fallback (when no Redis is available)
 *
 * The client automatically selects the best available option.
 */
import { Redis as UpstashRedis } from '@upstash/redis';
import IORedis from 'ioredis';

/** ioredis client type (avoids using namespace as type under strict TS) */
type IORedisClient = InstanceType<typeof IORedis>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { ex?: number }): Promise<unknown>;
  del(key: string | string[]): Promise<unknown>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
  ping(): Promise<string>;
}

type ClientKind = 'upstash' | 'ioredis' | 'memory';

// ---------------------------------------------------------------------------
// Module-level singletons
// ---------------------------------------------------------------------------

let _upstash: UpstashRedis | null = null;
let _ioredis: IORedisClient | null = null;
let _activeKind: ClientKind | null = null;

// ---------------------------------------------------------------------------
// Upstash Redis (REST – preferred for production / serverless)
// ---------------------------------------------------------------------------

export function getUpstashRedis(): UpstashRedis {
  if (!_upstash) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error(
        'Upstash Redis configuration missing. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.'
      );
    }

    _upstash = new UpstashRedis({
      url,
      token,
      retry: {
        retries: 2, // Reasonable retry count for balanced reliability
        backoff: (retryCount) => retryCount * 100, // Simple linear backoff
      },
      responseEncoding: false, // Disable base64 encoding for better performance with valid UTF-8 data
      automaticDeserialization: true, // Balanced feature set
    });
  }
  return _upstash;
}

// ---------------------------------------------------------------------------
// ioredis (TCP – fallback for local development)
// ---------------------------------------------------------------------------

export function getRedisClient(): IORedisClient {
  if (!_ioredis) {
    _ioredis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryStrategy: (times) => Math.min(times * 200, 5000),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    _ioredis.on('error', (err) => {
      // Silently swallow connection errors; callers handle null gracefully
      console.error('[Redis] connection error:', err.message);
    });
  }
  return _ioredis;
}

// ---------------------------------------------------------------------------
// In-memory fallback (zero-dependency, single-process only)
// ---------------------------------------------------------------------------

class MemoryRedis implements RedisLike {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  private isExpired(entry: { value: string; expiresAt?: number }): boolean {
    return entry.expiresAt !== undefined && Date.now() > entry.expiresAt;
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry || this.isExpired(entry)) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, options?: { ex?: number }): Promise<'OK'> {
    const expiresAt = options?.ex ? Date.now() + options.ex * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(key: string | string[]): Promise<number> {
    const keys = Array.isArray(key) ? key : [key];
    let count = 0;
    for (const k of keys) {
      if (this.store.delete(k)) count++;
    }
    return count;
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const next = (current ? parseInt(current, 10) : 0) + 1;
    const entry = this.store.get(key);
    this.store.set(key, { value: String(next), expiresAt: entry?.expiresAt });
    return next;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async ping(): Promise<string> {
    return 'PONG';
  }
}

// ---------------------------------------------------------------------------
// Unified client factory
// ---------------------------------------------------------------------------

let _unified: RedisLike | null = null;

/**
 * Returns a unified Redis-like client. Selection order:
 * 1. Upstash (if UPSTASH_REDIS_REST_URL is set)
 * 2. ioredis (if REDIS_URL is set)
 * 3. In-memory fallback
 */
export function getRedis(): RedisLike {
  if (_unified) return _unified;

  // 1. Try Upstash
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const client = getUpstashRedis();
      _activeKind = 'upstash';
      // Upstash REST client already implements get/set/del/incr/expire/ping
      _unified = client as unknown as RedisLike;
      console.log('[Redis] Using Upstash REST client');
      return _unified;
    } catch {
      // fall through
    }
  }

  // 2. Try ioredis
  if (process.env.REDIS_URL) {
    try {
      const client = getRedisClient();
      _activeKind = 'ioredis';
      // Wrap ioredis to match RedisLike interface
      _unified = {
        get: (key) => client.get(key),
        set: (key, value, opts) =>
          opts?.ex ? client.setex(key, opts.ex, value) : client.set(key, value),
        del: (key) => client.del(...(Array.isArray(key) ? key : [key])),
        incr: (key) => client.incr(key),
        expire: (key, sec) => client.expire(key, sec),
        ping: () => client.ping(),
      };
      console.log('[Redis] Using ioredis TCP client');
      return _unified;
    } catch {
      // fall through
    }
  }

  // 3. In-memory fallback
  _activeKind = 'memory';
  _unified = new MemoryRedis();
  console.log('[Redis] Using in-memory fallback (single-process only)');
  return _unified;
}

/**
 * Returns the active client kind: 'upstash' | 'ioredis' | 'memory'
 */
export function getRedisKind(): ClientKind {
  if (!_activeKind) getRedis(); // ensure initialized
  return _activeKind!;
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

export const redisHelpers = {
  /** Set a JSON-serializable value with optional TTL (seconds) */
  async setCache(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const redis = getRedis();
    const serialized = JSON.stringify(value);
    await redis.set(key, serialized, ttlSeconds ? { ex: ttlSeconds } : undefined);
  },

  /** Get a cached value, parsed from JSON */
  async getCache<T = unknown>(key: string): Promise<T | null> {
    const redis = getRedis();
    const raw = await redis.get(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  },

  /** Delete a cached key */
  async deleteCache(key: string): Promise<void> {
    await getRedis().del(key);
  },

  /** Set a session with a default TTL of 24 hours */
  async setSession(sessionId: string, data: unknown, ttl = 86400): Promise<void> {
    await this.setCache(`session:${sessionId}`, data, ttl);
  },

  async getSession<T = unknown>(sessionId: string): Promise<T | null> {
    return this.getCache(`session:${sessionId}`) as Promise<T | null>;
  },

  async deleteSession(sessionId: string): Promise<void> {
    await this.deleteCache(`session:${sessionId}`);
  },

  /** Simple rate-limit counter with auto-expire */
  async incrementRateLimit(key: string, windowMs = 900_000): Promise<number> {
    const redis = getRedis();
    const ttl = Math.ceil(windowMs / 1000);
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, ttl);
    }
    return count;
  },

  async getRateLimit(key: string): Promise<number> {
    const raw = await getRedis().get(key);
    return raw ? parseInt(raw, 10) : 0;
  },

  /** Health check — returns true if Redis is reachable */
  async isHealthy(): Promise<boolean> {
    try {
      const result = await getRedis().ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  },
};

/** Default export — unified Redis client */
export default getRedis;
