/**
 * Unit tests for security middleware
 */

import { jest } from '@jest/globals';
import { Express, Request, Response, NextFunction } from 'express';

// Mock helmet
const mockHelmet = jest.fn(() => (req: Request, res: Response, next: NextFunction) => next());
jest.mock('helmet', () => {
  return jest.fn(() => mockHelmet());
});

// Mock logger
jest.mock('../middleware/logging.middleware', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

import { getCorsConfig } from '../middleware/security.middleware';

describe('Security Middleware', () => {
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

    it('should allow localhost:3001 (default frontend)', () => {
      const config = getCorsConfig();
      const callback = jest.fn();

      config.origin('http://localhost:3001', callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should allow localhost:5173 (Vite dev server)', () => {
      const config = getCorsConfig();
      const callback = jest.fn();

      config.origin('http://localhost:5173', callback);

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

    it('should reject unknown origins in development', () => {
      process.env.NODE_ENV = 'development';
      const config = getCorsConfig();
      const callback = jest.fn();

      config.origin('https://malicious-site.com', callback);

      expect(callback).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should allow production origins in production mode', async () => {
      process.env.NODE_ENV = 'production';

      jest.resetModules();
      const { getCorsConfig: getFreshConfig } = await import('../middleware/security.middleware');
      const config = getFreshConfig();
      const callback = jest.fn();

      config.origin('https://advancia.us', callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should allow www subdomain in production', async () => {
      process.env.NODE_ENV = 'production';

      jest.resetModules();
      const { getCorsConfig: getFreshConfig } = await import('../middleware/security.middleware');
      const config = getFreshConfig();
      const callback = jest.fn();

      config.origin('https://www.advancia.us', callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should allow app subdomain in production', async () => {
      process.env.NODE_ENV = 'production';

      jest.resetModules();
      const { getCorsConfig: getFreshConfig } = await import('../middleware/security.middleware');
      const config = getFreshConfig();
      const callback = jest.fn();

      config.origin('https://app.advancia.us', callback);

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
  });
});
