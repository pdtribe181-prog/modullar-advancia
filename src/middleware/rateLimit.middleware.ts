import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { createRequire } from 'module';
import { getEnv, Env } from '../config/env.js';

const require = createRequire(import.meta.url);
const { ipKeyGenerator } = require('express-rate-limit') as {
  ipKeyGenerator: (ip: string, ipv6Subnet?: number) => string;
};

/**
 * Rate limiting middleware for API protection
 * Uses in-memory store by default (use Redis for production clusters)
 * All limits are configurable via environment variables
 */

// Cache env config once validated
let envConfig: Env | null = null;
const getConfig = (): Env => {
  if (!envConfig) {
    envConfig = getEnv();
  }
  return envConfig;
};

// Factory functions that create limiters with config
function createApiLimiter() {
  const config = getConfig();
  return rateLimit({
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

function createAuthLimiter() {
  const config = getConfig();
  return rateLimit({
    windowMs: config.RATE_LIMIT_AUTH_WINDOW_MS,
    max: config.RATE_LIMIT_AUTH_MAX,
    message: { error: 'Too many authentication attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    validate: { creationStack: false },
  });
}

function createPaymentLimiter() {
  const config = getConfig();
  return rateLimit({
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

function createSensitiveLimiter() {
  const config = getConfig();
  return rateLimit({
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

function createWebhookLimiter() {
  const config = getConfig();
  return rateLimit({
    windowMs: config.RATE_LIMIT_WEBHOOK_WINDOW_MS,
    max: config.RATE_LIMIT_WEBHOOK_MAX,
    message: { error: 'Webhook rate limit exceeded' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { creationStack: false },
  });
}

function createOnboardingLimiter() {
  const config = getConfig();
  return rateLimit({
    windowMs: config.RATE_LIMIT_ONBOARDING_WINDOW_MS,
    max: config.RATE_LIMIT_ONBOARDING_MAX,
    message: { error: 'Too many onboarding attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { creationStack: false },
  });
}

// Lazy-initialized singleton limiters
let _apiLimiter: RequestHandler | null = null;
let _authLimiter: RequestHandler | null = null;
let _paymentLimiter: RequestHandler | null = null;
let _sensitiveLimiter: RequestHandler | null = null;
let _webhookLimiter: RequestHandler | null = null;
let _onboardingLimiter: RequestHandler | null = null;

export const apiLimiter: RequestHandler = (req, res, next) => {
  if (!_apiLimiter) _apiLimiter = createApiLimiter();
  return _apiLimiter(req, res, next);
};

export const authLimiter: RequestHandler = (req, res, next) => {
  if (!_authLimiter) _authLimiter = createAuthLimiter();
  return _authLimiter(req, res, next);
};

export const paymentLimiter: RequestHandler = (req, res, next) => {
  if (!_paymentLimiter) _paymentLimiter = createPaymentLimiter();
  return _paymentLimiter(req, res, next);
};

export const sensitiveLimiter: RequestHandler = (req, res, next) => {
  if (!_sensitiveLimiter) _sensitiveLimiter = createSensitiveLimiter();
  return _sensitiveLimiter(req, res, next);
};

export const webhookLimiter: RequestHandler = (req, res, next) => {
  if (!_webhookLimiter) _webhookLimiter = createWebhookLimiter();
  return _webhookLimiter(req, res, next);
};

export const onboardingLimiter: RequestHandler = (req, res, next) => {
  if (!_onboardingLimiter) _onboardingLimiter = createOnboardingLimiter();
  return _onboardingLimiter(req, res, next);
};
