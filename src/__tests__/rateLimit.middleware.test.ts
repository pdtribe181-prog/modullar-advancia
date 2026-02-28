/**
 * Unit tests for rate limiting middleware
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction, RequestHandler } from 'express';

// Mock express-rate-limit before importing the middleware
const mockRateLimit = jest.fn<any>();
jest.unstable_mockModule('express-rate-limit', () => ({
  __esModule: true,
  default: mockRateLimit,
}));

// Mock environment config
jest.unstable_mockModule('../config/env', () => ({
  getEnv: jest.fn(() => ({
    RATE_LIMIT_API_WINDOW_MS: 900000,
    RATE_LIMIT_API_MAX: 100,
    RATE_LIMIT_AUTH_WINDOW_MS: 900000,
    RATE_LIMIT_AUTH_MAX: 5,
    RATE_LIMIT_PAYMENT_WINDOW_MS: 60000,
    RATE_LIMIT_PAYMENT_MAX: 10,
    RATE_LIMIT_SENSITIVE_WINDOW_MS: 3600000,
    RATE_LIMIT_SENSITIVE_MAX: 5,
    RATE_LIMIT_WEBHOOK_WINDOW_MS: 60000,
    RATE_LIMIT_WEBHOOK_MAX: 100,
    RATE_LIMIT_ONBOARDING_WINDOW_MS: 3600000,
    RATE_LIMIT_ONBOARDING_MAX: 3,
  })),
}));

describe('Rate Limit Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockHandler: ReturnType<typeof jest.fn>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    mockReq = {
      ip: '127.0.0.1',
    };
    mockRes = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn() as any,
    };
    mockNext = jest.fn() as NextFunction;

    // Create mock handler that calls next
    mockHandler = jest.fn((req, res, next) => next());
    mockRateLimit.mockReturnValue(mockHandler);
  });

  describe('apiLimiter', () => {
    it('should create limiter with correct config', async () => {
      const { apiLimiter } = await import('../middleware/rateLimit.middleware');

      apiLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          windowMs: 900000,
          max: 100,
          standardHeaders: true,
          legacyHeaders: false,
        })
      );
    });

    it('should use user ID as key when available', async () => {
      const { apiLimiter } = await import('../middleware/rateLimit.middleware');

      apiLimiter(mockReq as Request, mockRes as Response, mockNext);

      const config = mockRateLimit.mock.calls[0][0] as any;
      const keyGenerator = config.keyGenerator;

      const reqWithUser = { ...mockReq, user: { id: 'user-123' } } as any;
      expect(keyGenerator(reqWithUser)).toBe('user-123');
    });

    it('should use IP as fallback key', async () => {
      const { apiLimiter } = await import('../middleware/rateLimit.middleware');

      apiLimiter(mockReq as Request, mockRes as Response, mockNext);

      const config = mockRateLimit.mock.calls[0][0] as any;
      const keyGenerator = config.keyGenerator;

      expect(keyGenerator(mockReq)).toBe('127.0.0.1');
    });

    it('should use "unknown" as final fallback', async () => {
      const { apiLimiter } = await import('../middleware/rateLimit.middleware');

      apiLimiter(mockReq as Request, mockRes as Response, mockNext);

      const config = mockRateLimit.mock.calls[0][0] as any;
      const keyGenerator = config.keyGenerator;

      expect(keyGenerator({})).toBe('unknown');
    });

    it('should be lazily initialized (singleton)', async () => {
      const { apiLimiter } = await import('../middleware/rateLimit.middleware');

      apiLimiter(mockReq as Request, mockRes as Response, mockNext);
      apiLimiter(mockReq as Request, mockRes as Response, mockNext);
      apiLimiter(mockReq as Request, mockRes as Response, mockNext);

      // rateLimit should only be called once due to lazy initialization
      expect(mockRateLimit).toHaveBeenCalledTimes(1);
      // But the handler should be called each time
      expect(mockHandler).toHaveBeenCalledTimes(3);
    });

    it('should have correct error message', async () => {
      const { apiLimiter } = await import('../middleware/rateLimit.middleware');

      apiLimiter(mockReq as Request, mockRes as Response, mockNext);

      const config = mockRateLimit.mock.calls[0][0] as any;
      expect(config.message).toEqual({ error: 'Too many requests, please try again later' });
    });
  });

  describe('authLimiter', () => {
    it('should create limiter with stricter limits', async () => {
      jest.resetModules();
      mockRateLimit.mockReturnValue(mockHandler);

      const { authLimiter } = await import('../middleware/rateLimit.middleware');

      authLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          windowMs: 900000,
          max: 5,
          skipSuccessfulRequests: true,
        })
      );
    });

    it('should have authentication-specific error message', async () => {
      jest.resetModules();
      mockRateLimit.mockReturnValue(mockHandler);

      const { authLimiter } = await import('../middleware/rateLimit.middleware');

      authLimiter(mockReq as Request, mockRes as Response, mockNext);

      const config = mockRateLimit.mock.calls[0][0] as any;
      expect(config.message).toEqual({
        error: 'Too many authentication attempts, please try again later',
      });
    });
  });

  describe('paymentLimiter', () => {
    it('should create limiter with payment-specific config', async () => {
      jest.resetModules();
      mockRateLimit.mockReturnValue(mockHandler);

      const { paymentLimiter } = await import('../middleware/rateLimit.middleware');

      paymentLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          windowMs: 60000,
          max: 10,
        })
      );
    });

    it('should have payment-specific error message', async () => {
      jest.resetModules();
      mockRateLimit.mockReturnValue(mockHandler);

      const { paymentLimiter } = await import('../middleware/rateLimit.middleware');

      paymentLimiter(mockReq as Request, mockRes as Response, mockNext);

      const config = mockRateLimit.mock.calls[0][0] as any;
      expect(config.message).toEqual({ error: 'Too many payment requests, please slow down' });
    });

    it('keyGenerator should use userId when available', async () => {
      jest.resetModules();
      mockRateLimit.mockReturnValue(mockHandler);

      const { paymentLimiter } = await import('../middleware/rateLimit.middleware');
      paymentLimiter(mockReq as Request, mockRes as Response, mockNext);

      const config = mockRateLimit.mock.calls[0][0] as any;
      expect(config.keyGenerator).toBeDefined();
      const key = config.keyGenerator({ user: { id: 'user-pay-1' }, ip: '10.0.0.1' });
      expect(key).toBe('user-pay-1');
    });

    it('keyGenerator should fall back to IP key when no user', async () => {
      jest.resetModules();
      mockRateLimit.mockReturnValue(mockHandler);

      const { paymentLimiter } = await import('../middleware/rateLimit.middleware');
      paymentLimiter(mockReq as Request, mockRes as Response, mockNext);

      const config = mockRateLimit.mock.calls[0][0] as any;
      const key = config.keyGenerator({ ip: '10.0.0.1' });
      expect(key).toBeDefined();
      expect(key).not.toBe('');
    });
  });

  describe('sensitiveLimiter', () => {
    it('should create limiter with very strict limits', async () => {
      jest.resetModules();
      mockRateLimit.mockReturnValue(mockHandler);

      const { sensitiveLimiter } = await import('../middleware/rateLimit.middleware');

      sensitiveLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          windowMs: 3600000, // 1 hour
          max: 5,
        })
      );
    });

    it('keyGenerator should use userId when available', async () => {
      jest.resetModules();
      mockRateLimit.mockReturnValue(mockHandler);

      const { sensitiveLimiter } = await import('../middleware/rateLimit.middleware');
      sensitiveLimiter(mockReq as Request, mockRes as Response, mockNext);

      const config = mockRateLimit.mock.calls[0][0] as any;
      expect(config.keyGenerator).toBeDefined();
      const key = config.keyGenerator({ user: { id: 'user-sens-1' }, ip: '10.0.0.2' });
      expect(key).toBe('user-sens-1');
    });

    it('keyGenerator should fall back to IP key when no user', async () => {
      jest.resetModules();
      mockRateLimit.mockReturnValue(mockHandler);

      const { sensitiveLimiter } = await import('../middleware/rateLimit.middleware');
      sensitiveLimiter(mockReq as Request, mockRes as Response, mockNext);

      const config = mockRateLimit.mock.calls[0][0] as any;
      const key = config.keyGenerator({ ip: '10.0.0.2' });
      expect(key).toBeDefined();
      expect(key).not.toBe('');
    });
  });

  describe('webhookLimiter', () => {
    it('should create limiter with high throughput config', async () => {
      jest.resetModules();
      mockRateLimit.mockReturnValue(mockHandler);

      const { webhookLimiter } = await import('../middleware/rateLimit.middleware');

      webhookLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          windowMs: 60000,
          max: 100,
        })
      );
    });

    it('should not use user-based key generator', async () => {
      jest.resetModules();
      mockRateLimit.mockReturnValue(mockHandler);

      const { webhookLimiter } = await import('../middleware/rateLimit.middleware');

      webhookLimiter(mockReq as Request, mockRes as Response, mockNext);

      const config = mockRateLimit.mock.calls[0][0] as any;
      // Webhook limiter should not have a custom keyGenerator
      expect(config.keyGenerator).toBeUndefined();
    });
  });

  describe('onboardingLimiter', () => {
    it('should create limiter with onboarding-specific config', async () => {
      jest.resetModules();
      mockRateLimit.mockReturnValue(mockHandler);

      const { onboardingLimiter } = await import('../middleware/rateLimit.middleware');

      onboardingLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          windowMs: 3600000, // 1 hour
          max: 3,
        })
      );
    });

    it('should have onboarding-specific error message', async () => {
      jest.resetModules();
      mockRateLimit.mockReturnValue(mockHandler);

      const { onboardingLimiter } = await import('../middleware/rateLimit.middleware');

      onboardingLimiter(mockReq as Request, mockRes as Response, mockNext);

      const config = mockRateLimit.mock.calls[0][0] as any;
      expect(config.message).toEqual({
        error: 'Too many onboarding attempts, please try again later',
      });
    });
  });

  describe('common configuration', () => {
    it('should use standard headers', async () => {
      jest.resetModules();
      mockRateLimit.mockReturnValue(mockHandler);

      const { apiLimiter } = await import('../middleware/rateLimit.middleware');

      apiLimiter(mockReq as Request, mockRes as Response, mockNext);

      const config = mockRateLimit.mock.calls[0][0] as any;
      expect(config.standardHeaders).toBe(true);
      expect(config.legacyHeaders).toBe(false);
    });

    it('should call next when rate limit not exceeded', async () => {
      jest.resetModules();
      mockRateLimit.mockReturnValue(mockHandler);

      const { apiLimiter } = await import('../middleware/rateLimit.middleware');

      apiLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should properly delegate to underlying limiter', async () => {
      jest.resetModules();
      const customHandler = jest.fn();
      mockRateLimit.mockReturnValue(customHandler);

      const { apiLimiter } = await import('../middleware/rateLimit.middleware');

      apiLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(customHandler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    });
  });
});
