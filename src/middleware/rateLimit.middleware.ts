import rateLimit, { type Store } from 'express-rate-limit';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { createRequire } from 'module';
import { getEnv, Env } from '../config/env.js';
import { getRedisKind, getRedisClient } from '../lib/redis.js';

const require = createRequire(import.meta.url);
const { ipKeyGenerator } = require('express-rate-limit') as {
  ipKeyGenerator: (ip: string, ipv6Subnet?: number) => string;
};

/**
 * Rate limiting middleware for API protection
 * Uses Redis store when available (Upstash / ioredis), falls back to in-memory.
 * All limits are configurable via environment variables.
 */

// Cache env config once validated
let envConfig: Env | null = null;
const getConfig = (): Env => {
  if (!envConfig) {
    envConfig = getEnv();
  }
  return envConfig;
};

// Lazily create a Redis store for express-rate-limit when ioredis is available
let _redisStore: Store | null | undefined; // undefined = not yet attempted
async function getRedisStore(): Promise<Store | undefined> {
  if (_redisStore !== undefined) return _redisStore ?? undefined;

  try {
    const kind = getRedisKind();
    if (kind === 'ioredis') {
      // rate-limit-redis requires an ioredis instance
      const { default: RedisStore } = await import('rate-limit-redis');
      const client = getRedisClient();
      await client.connect?.();
      _redisStore = new RedisStore({
        // @ts-expect-error sendCommand type mismatch between ioredis and rate-limit-redis
        sendCommand: (...args: string[]) => client.call(...args),
        prefix: 'rl:',
      });
      console.log('[RateLimit] Using Redis store');
      return _redisStore;
    }
    // For Upstash or memory, fall through to the default MemoryStore
    _redisStore = null;
    return undefined;
  } catch {
    _redisStore = null;
    return undefined;
  }
}

// Cache the resolved Redis store so all limiters share it
let _resolvedStore: Store | undefined;
let _storeResolved = false;

async function resolveRedisStore(): Promise<Store | undefined> {
  if (_storeResolved) return _resolvedStore;
  _resolvedStore = await getRedisStore();
  _storeResolved = true;
  return _resolvedStore;
}

// Pre-resolve the store eagerly (non-blocking) so it's ready when first limiter fires
resolveRedisStore().catch(() => {});

// Factory functions that create limiters with config
function createApiLimiter(store?: Store) {
  const config = getConfig();
  return rateLimit({
    ...(store ? { store } : {}),
    windowMs: config.RATE_LIMIT_API_WINDOW_MS,
    max: config.RATE_LIMIT_API_MAX,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const userId = (req as any).user?.id as string | undefined;
      return userId || ipKeyGenerator(req.ip || 'unknown');
    },
    validate: { creationStack: false },
  });
}

function createAuthLimiter(store?: Store) {
  const config = getConfig();
  return rateLimit({
    ...(store ? { store } : {}),
    windowMs: config.RATE_LIMIT_AUTH_WINDOW_MS,
    max: config.RATE_LIMIT_AUTH_MAX,
    message: { error: 'Too many authentication attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    validate: { creationStack: false },
  });
}

function createPaymentLimiter(store?: Store) {
  const config = getConfig();
  return rateLimit({
    ...(store ? { store } : {}),
    windowMs: config.RATE_LIMIT_PAYMENT_WINDOW_MS,
    max: config.RATE_LIMIT_PAYMENT_MAX,
    message: { error: 'Too many payment requests, please slow down' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const userId = (req as any).user?.id as string | undefined;
      return userId || ipKeyGenerator(req.ip || 'unknown');
    },
    validate: { creationStack: false },
  });
}

function createSensitiveLimiter(store?: Store) {
  const config = getConfig();
  return rateLimit({
    ...(store ? { store } : {}),
    windowMs: config.RATE_LIMIT_SENSITIVE_WINDOW_MS,
    max: config.RATE_LIMIT_SENSITIVE_MAX,
    message: { error: 'Rate limit exceeded for sensitive operations' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const userId = (req as any).user?.id as string | undefined;
      return userId || ipKeyGenerator(req.ip || 'unknown');
    },
    validate: { creationStack: false },
  });
}

function createWebhookLimiter(store?: Store) {
  const config = getConfig();
  return rateLimit({
    ...(store ? { store } : {}),
    windowMs: config.RATE_LIMIT_WEBHOOK_WINDOW_MS,
    max: config.RATE_LIMIT_WEBHOOK_MAX,
    message: { error: 'Webhook rate limit exceeded' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { creationStack: false },
  });
}

function createOnboardingLimiter(store?: Store) {
  const config = getConfig();
  return rateLimit({
    ...(store ? { store } : {}),
    windowMs: config.RATE_LIMIT_ONBOARDING_WINDOW_MS,
    max: config.RATE_LIMIT_ONBOARDING_MAX,
    message: { error: 'Too many onboarding attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { creationStack: false },
  });
}

// Lazy-initialized singleton limiters (use Redis store when available)
let _apiLimiter: RequestHandler | null = null;
let _authLimiter: RequestHandler | null = null;
let _paymentLimiter: RequestHandler | null = null;
let _sensitiveLimiter: RequestHandler | null = null;
let _webhookLimiter: RequestHandler | null = null;
let _onboardingLimiter: RequestHandler | null = null;

export const apiLimiter: RequestHandler = (req, res, next) => {
  if (!_apiLimiter) _apiLimiter = createApiLimiter(_resolvedStore);
  return _apiLimiter(req, res, next);
};

export const authLimiter: RequestHandler = (req, res, next) => {
  if (!_authLimiter) _authLimiter = createAuthLimiter(_resolvedStore);
  return _authLimiter(req, res, next);
};

export const paymentLimiter: RequestHandler = (req, res, next) => {
  if (!_paymentLimiter) _paymentLimiter = createPaymentLimiter(_resolvedStore);
  return _paymentLimiter(req, res, next);
};

export const sensitiveLimiter: RequestHandler = (req, res, next) => {
  if (!_sensitiveLimiter) _sensitiveLimiter = createSensitiveLimiter(_resolvedStore);
  return _sensitiveLimiter(req, res, next);
};

export const webhookLimiter: RequestHandler = (req, res, next) => {
  if (!_webhookLimiter) _webhookLimiter = createWebhookLimiter(_resolvedStore);
  return _webhookLimiter(req, res, next);
};

export const onboardingLimiter: RequestHandler = (req, res, next) => {
  if (!_onboardingLimiter) _onboardingLimiter = createOnboardingLimiter(_resolvedStore);
  return _onboardingLimiter(req, res, next);
};
