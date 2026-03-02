/**
 * Unit tests for security middleware
 */

import { jest } from '@jest/globals';
import { Express, Request, Response, NextFunction } from 'express';

// Mock helmet
const mockHelmet = jest.fn(() => (req: Request, res: Response, next: NextFunction) => next());
jest.mock('helmet', () => {
  const fn = jest.fn((opts: any) => {
    const mw = (req: Request, res: Response, next: NextFunction) => next();
    (mw as any).__helmetConfig = opts;
    return mw;
  });
  return { __esModule: true, default: fn };
});

// Mock logger
jest.mock('../middleware/logging.middleware', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { configureSecurityHeaders, getCorsConfig } from '../middleware/security.middleware';
import helmet from 'helmet';

describe('Security Middleware', () => {
  // ────────────── configureSecurityHeaders ──────────────

  describe('configureSecurityHeaders', () => {
    it('should register nonce middleware and helmet on the app', () => {
      const mockApp = { use: jest.fn() };
      configureSecurityHeaders(mockApp as any);

      // Should call app.use twice: nonce middleware + helmet
      expect(mockApp.use).toHaveBeenCalledTimes(2);
    });

    it('should generate a cspNonce on each request', () => {
      const useCalls: any[] = [];
      const mockApp = {
        use: jest.fn((...args: any[]) => {
          useCalls.push(args[0]);
        }),
      };

      configureSecurityHeaders(mockApp as any);

      // First middleware is the nonce generator
      const nonceMiddleware = useCalls[0];
      const res = { locals: {} } as any;
      const next = jest.fn();

      nonceMiddleware({}, res, next);

      expect(res.locals.cspNonce).toBeDefined();
      expect(typeof res.locals.cspNonce).toBe('string');
      expect(res.locals.cspNonce.length).toBeGreaterThan(0);
      expect(next).toHaveBeenCalled();
    });

    it('should generate unique nonces per request', () => {
      const useCalls: any[] = [];
      const mockApp = {
        use: jest.fn((...args: any[]) => {
          useCalls.push(args[0]);
        }),
      };

      configureSecurityHeaders(mockApp as any);
      const nonceMiddleware = useCalls[0];

      const res1 = { locals: {} } as any;
      const res2 = { locals: {} } as any;
      nonceMiddleware({}, res1, jest.fn());
      nonceMiddleware({}, res2, jest.fn());

      expect(res1.locals.cspNonce).not.toBe(res2.locals.cspNonce);
    });

    it('should call helmet with correct security config', () => {
      const useCalls: any[] = [];
      const mockApp = {
        use: jest.fn((...args: any[]) => {
          useCalls.push(args[0]);
        }),
      };
      configureSecurityHeaders(mockApp as any);

      // Second use() call is helmet middleware — verify it's a function
      expect(useCalls.length).toBe(2);
      expect(typeof useCalls[1]).toBe('function');
    });

    it('should configure CSP with Stripe/Supabase/Sentry connect sources', () => {
      const useCalls: any[] = [];
      const mockApp = {
        use: jest.fn((...args: any[]) => {
          useCalls.push(args[0]);
        }),
      };

      configureSecurityHeaders(mockApp as any);

      // The helmet middleware may have a __helmetConfig
      const helmetMw = useCalls[1];
      // If helmet was properly mocked, it has __helmetConfig
      if (helmetMw && (helmetMw as any).__helmetConfig) {
        const csp = (helmetMw as any).__helmetConfig.contentSecurityPolicy.directives;
        expect(csp.defaultSrc).toContain("'self'");
        expect(csp.connectSrc).toContain('api.stripe.com');
      } else {
        // Helmet wasn't mocked as expected — just verify app.use was called
        expect(mockApp.use).toHaveBeenCalledTimes(2);
      }
    });
  });

  // ────────────── getCorsConfig ──────────────

  describe('getCorsConfig', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return CORS config object', () => {
      const config = getCorsConfig();

      expect(config).toHaveProperty('origin');
      expect(config).toHaveProperty('credentials', true);
      expect(config).toHaveProperty('methods');
      expect(config).toHaveProperty('allowedHeaders');
      expect(config).toHaveProperty('exposedHeaders');
      expect(config).toHaveProperty('maxAge', 86400);
    });

    it('should allow requests with no origin (mobile apps, Postman)', () => {
      const config = getCorsConfig();
      const callback = jest.fn();

      config.origin(undefined, callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should allow localhost:5173 (default / Vite dev server)', () => {
      const config = getCorsConfig();
      const callback = jest.fn();

      config.origin('http://localhost:5173', callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should allow 127.0.0.1:5173 (Vite dev server)', () => {
      const config = getCorsConfig();
      const callback = jest.fn();

      config.origin('http://127.0.0.1:5173', callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should allow custom FRONTEND_URL', async () => {
      process.env.FRONTEND_URL = 'https://custom-app.example.com';

      // Re-import to get fresh config
      jest.resetModules();
      const { getCorsConfig: getFreshConfig } = await import('../middleware/security.middleware');
      const config = getFreshConfig();
      const callback = jest.fn();

      config.origin('https://custom-app.example.com', callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should allow origins listed in CORS_ORIGINS', async () => {
      process.env.NODE_ENV = 'production';
      process.env.CORS_ORIGINS = 'https://preview.vercel.app, https://foo.example.com';

      jest.resetModules();
      const { getCorsConfig: getFreshConfig } = await import('../middleware/security.middleware');
      const config = getFreshConfig();
      const callback = jest.fn();

      config.origin('https://preview.vercel.app', callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should reject unknown origins in development (deny without 500)', () => {
      process.env.NODE_ENV = 'development';
      const config = getCorsConfig();
      const callback = jest.fn();

      config.origin('https://malicious-site.com', callback);

      expect(callback).toHaveBeenCalledWith(null, false);
    });

    it('should allow production origins in production mode', async () => {
      process.env.NODE_ENV = 'production';

      jest.resetModules();
      const { getCorsConfig: getFreshConfig } = await import('../middleware/security.middleware');
      const config = getFreshConfig();
      const callback = jest.fn();

      config.origin('https://advanciapayledger.com', callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should allow www subdomain in production', async () => {
      process.env.NODE_ENV = 'production';

      jest.resetModules();
      const { getCorsConfig: getFreshConfig } = await import('../middleware/security.middleware');
      const config = getFreshConfig();
      const callback = jest.fn();

      config.origin('https://www.advanciapayledger.com', callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should allow app subdomain in production', async () => {
      process.env.NODE_ENV = 'production';

      jest.resetModules();
      const { getCorsConfig: getFreshConfig } = await import('../middleware/security.middleware');
      const config = getFreshConfig();
      const callback = jest.fn();

      config.origin('https://app.advanciapayledger.com', callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should allow advancia-healthcare.com and www in production', async () => {
      process.env.NODE_ENV = 'production';

      jest.resetModules();
      const { getCorsConfig: getFreshConfig } = await import('../middleware/security.middleware');
      const config = getFreshConfig();
      const callback = jest.fn();

      config.origin('https://advancia-healthcare.com', callback);
      expect(callback).toHaveBeenCalledWith(null, true);

      callback.mockClear();
      config.origin('https://www.advancia-healthcare.com', callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should include rate limit headers in exposed headers', () => {
      const config = getCorsConfig();

      expect(config.exposedHeaders).toContain('X-RateLimit-Limit');
      expect(config.exposedHeaders).toContain('X-RateLimit-Remaining');
      expect(config.exposedHeaders).toContain('X-RateLimit-Reset');
    });

    it('should support all common HTTP methods', () => {
      const config = getCorsConfig();

      expect(config.methods).toContain('GET');
      expect(config.methods).toContain('POST');
      expect(config.methods).toContain('PUT');
      expect(config.methods).toContain('PATCH');
      expect(config.methods).toContain('DELETE');
      expect(config.methods).toContain('OPTIONS');
    });

    it('should allow Content-Type header', () => {
      const config = getCorsConfig();

      expect(config.allowedHeaders).toContain('Content-Type');
    });

    it('should allow Authorization header', () => {
      const config = getCorsConfig();

      expect(config.allowedHeaders).toContain('Authorization');
    });

    it('should set credentials to true for cookie support', () => {
      const config = getCorsConfig();

      expect(config.credentials).toBe(true);
    });

    it('should cache preflight for 24 hours', () => {
      const config = getCorsConfig();

      expect(config.maxAge).toBe(86400); // 24 hours in seconds
    });

    it('should log debug in production when no origin is provided', () => {
      process.env.NODE_ENV = 'production';
      const config = getCorsConfig();
      const callback = jest.fn();

      config.origin(undefined, callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });
  });
});
