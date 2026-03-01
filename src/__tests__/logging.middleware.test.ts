/**
 * Unit tests for logging middleware
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// Dynamic import after potential env setup
const { requestId, logger, requestLogger, errorHandler, notFoundHandler } =
  await import('../middleware/logging.middleware');

// Helper to create mock req/res/next
function createMocks(overrides?: { req?: Partial<Request>; res?: Partial<Response> }) {
  const req = {
    headers: {},
    method: 'GET',
    path: '/test',
    ip: '127.0.0.1',
    get: jest.fn<any>().mockReturnValue('test-agent'),
    body: {},
    ...overrides?.req,
  } as unknown as Request;

  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  const res = {
    statusCode: 200,
    setHeader: jest.fn<any>(),
    status: jest.fn<any>().mockReturnThis(),
    json: jest.fn<any>().mockReturnThis(),
    on: jest.fn<any>().mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
      return res;
    }),
    ...overrides?.res,
  } as unknown as Response;

  const next = jest.fn<any>() as unknown as NextFunction;

  // Helper to fire 'finish' event
  const fireFinish = () => {
    (listeners['finish'] || []).forEach((cb) => cb());
  };

  return { req, res, next, fireFinish };
}

describe('Logging Middleware', () => {
  let consoleLogSpy: ReturnType<typeof jest.spyOn>;
  let consoleWarnSpy: ReturnType<typeof jest.spyOn>;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;
  const origEnv = process.env.NODE_ENV;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    process.env.NODE_ENV = origEnv;
  });

  // ============================================================
  // requestId middleware
  // ============================================================
  describe('requestId', () => {
    it('should generate a UUID when no X-Request-ID header is present', () => {
      const { req, res, next } = createMocks();

      requestId(req, res, next);

      expect(req.requestId).toBeDefined();
      expect(typeof req.requestId).toBe('string');
      // UUID v4 pattern
      expect(req.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', req.requestId!);
      expect(next).toHaveBeenCalled();
    });

    it('should use existing X-Request-ID header', () => {
      const { req, res, next } = createMocks({
        req: { headers: { 'x-request-id': 'custom-id-123' } },
      });

      requestId(req, res, next);

      expect(req.requestId).toBe('custom-id-123');
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', 'custom-id-123');
      expect(next).toHaveBeenCalled();
    });
  });

  // ============================================================
  // logger
  // ============================================================
  describe('logger', () => {
    describe('info', () => {
      it('should output structured JSON to console.log', () => {
        logger.info('test message', { key: 'value' });

        expect(consoleLogSpy).toHaveBeenCalledTimes(1);
        const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
        expect(output.level).toBe('info');
        expect(output.message).toBe('test message');
        expect(output.key).toBe('value');
        expect(output.timestamp).toBeDefined();
      });

      it('should work without meta', () => {
        logger.info('simple message');

        const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
        expect(output.message).toBe('simple message');
      });
    });

    describe('warn', () => {
      it('should output structured JSON to console.warn', () => {
        logger.warn('warning message', { code: 'W001' });

        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
        const output = JSON.parse(consoleWarnSpy.mock.calls[0][0] as string);
        expect(output.level).toBe('warn');
        expect(output.message).toBe('warning message');
        expect(output.code).toBe('W001');
      });
    });

    describe('error', () => {
      it('should output error info with stack in non-production', () => {
        const err = new Error('boom');
        logger.error('error happened', err, { extra: 'data' });

        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        const output = JSON.parse(consoleErrorSpy.mock.calls[0][0] as string);
        expect(output.level).toBe('error');
        expect(output.message).toBe('error happened');
        expect(output.error.name).toBe('Error');
        expect(output.error.message).toBe('boom');
        expect(output.error.stack).toBeDefined();
        expect(output.extra).toBe('data');
      });

      it('should omit stack in production', () => {
        process.env.NODE_ENV = 'production';
        const err = new Error('secret');
        logger.error('prod error', err);

        const output = JSON.parse(consoleErrorSpy.mock.calls[0][0] as string);
        expect(output.error.stack).toBeUndefined();
      });

      it('should handle undefined error', () => {
        logger.error('no error object');

        const output = JSON.parse(consoleErrorSpy.mock.calls[0][0] as string);
        expect(output.error).toBeUndefined();
      });
    });

    describe('debug', () => {
      it('should log in non-production', () => {
        process.env.NODE_ENV = 'development';
        logger.debug('debug msg', { detail: true });

        expect(consoleLogSpy).toHaveBeenCalled();
        const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
        expect(output.level).toBe('debug');
        expect(output.message).toBe('debug msg');
      });

      it('should not log in production', () => {
        process.env.NODE_ENV = 'production';
        logger.debug('should be silent');

        expect(consoleLogSpy).not.toHaveBeenCalled();
      });
    });
  });

  // ============================================================
  // requestLogger
  // ============================================================
  describe('requestLogger', () => {
    it('should call next immediately', () => {
      const { req, res, next } = createMocks();

      requestLogger(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should log info on successful response (2xx)', () => {
      const { req, res, next, fireFinish } = createMocks();
      (req as any).requestId = 'req-123';

      requestLogger(req, res, next);
      // Simulate response finishing
      (res as any).statusCode = 200;
      fireFinish();

      // logger.info uses console.log
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(output.level).toBe('info');
      expect(output.message).toBe('Request completed');
      expect(output.requestId).toBe('req-123');
      expect(output.method).toBe('GET');
      expect(output.path).toBe('/test');
      expect(output.statusCode).toBe(200);
      expect(output.duration).toMatch(/^\d+ms$/);
    });

    it('should log warn on 4xx response', () => {
      const { req, res, next, fireFinish } = createMocks();

      requestLogger(req, res, next);
      (res as any).statusCode = 404;
      fireFinish();

      expect(consoleWarnSpy).toHaveBeenCalled();
      const output = JSON.parse(consoleWarnSpy.mock.calls[0][0] as string);
      expect(output.level).toBe('warn');
      expect(output.message).toBe('Request error');
    });

    it('should log error on 5xx response', () => {
      const { req, res, next, fireFinish } = createMocks();

      requestLogger(req, res, next);
      (res as any).statusCode = 500;
      fireFinish();

      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = JSON.parse(consoleErrorSpy.mock.calls[0][0] as string);
      expect(output.level).toBe('error');
      expect(output.message).toBe('Request failed');
    });
  });

  // ============================================================
  // errorHandler
  // ============================================================
  describe('errorHandler', () => {
    it('should return 400 for ValidationError', () => {
      const { req, res, next } = createMocks();
      (req as any).requestId = 'req-val';
      const err = new Error('Field is required');
      err.name = 'ValidationError';

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          message: 'Field is required',
          requestId: 'req-val',
        })
      );
    });

    it('should return 401 for UnauthorizedError', () => {
      const { req, res, next } = createMocks();
      (req as any).requestId = 'req-auth';
      const err = new Error('Token expired');
      err.name = 'UnauthorizedError';

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized',
          message: 'Invalid or expired token',
          requestId: 'req-auth',
        })
      );
    });

    it('should return 500 with stack for generic errors in dev', () => {
      process.env.NODE_ENV = 'development';
      const { req, res, next } = createMocks();
      (req as any).requestId = 'req-500';
      const err = new Error('Something broke');

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      const body = (res.json as jest.Mock<any>).mock.calls[0][0] as any;
      expect(body.error).toBe('Internal server error');
      expect(body.message).toBe('Something broke');
      expect(body.stack).toBeDefined();
      expect(body.requestId).toBe('req-500');
    });

    it('should hide error details in production', () => {
      process.env.NODE_ENV = 'production';
      const { req, res, next } = createMocks();
      const err = new Error('secret internal failure');

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      const body = (res.json as jest.Mock<any>).mock.calls[0][0] as any;
      expect(body.message).toBe('An unexpected error occurred');
      expect(body.stack).toBeUndefined();
    });

    it('should log the error', () => {
      const { req, res, next } = createMocks();
      const err = new Error('logged');

      errorHandler(err, req, res, next);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = JSON.parse(consoleErrorSpy.mock.calls[0][0] as string);
      expect(output.level).toBe('error');
      expect(output.message).toContain('error');
      expect(output.error).toBeDefined();
      expect(output.error.message).toBe('logged');
    });

    it('should handle a non-Error thrown object', () => {
      const { req, res, next } = createMocks();
      (req as any).requestId = 'req-non-error';
      const err = 'string error thrown';

      errorHandler(err as any, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
    });
  });

  // ============================================================
  // notFoundHandler
  // ============================================================
  describe('notFoundHandler', () => {
    it('should return 404 with route info', () => {
      const { req, res } = createMocks();
      (req as any).requestId = 'req-404';
      (req as any).method = 'POST';
      (req as any).path = '/api/missing';

      notFoundHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'Route POST /api/missing not found',
        requestId: 'req-404',
      });
    });
  });
});
