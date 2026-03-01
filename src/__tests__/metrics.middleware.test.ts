/**
 * Unit tests for metrics middleware
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// Mock the metrics service
const mockRecordRequest = jest.fn<any>();
jest.unstable_mockModule('../services/metrics.service.js', () => ({
  recordRequest: mockRecordRequest,
}));

const { metricsMiddleware } = await import('../middleware/metrics.middleware');

describe('Metrics Middleware', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;
  let finishListeners: ((...args: unknown[]) => void)[];

  beforeEach(() => {
    jest.clearAllMocks();
    finishListeners = [];

    req = {
      method: 'GET',
      originalUrl: '/api/v1/health',
      url: '/health',
    } as unknown as Request;

    res = {
      statusCode: 200,
      on: jest.fn<any>().mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
        if (event === 'finish') finishListeners.push(cb);
        return res;
      }),
    } as unknown as Response;

    next = jest.fn<any>() as unknown as NextFunction;
  });

  it('should call next immediately', () => {
    metricsMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should register a finish listener', () => {
    metricsMiddleware(req, res, next);
    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('should record request on finish with correct args', () => {
    metricsMiddleware(req, res, next);
    finishListeners.forEach((cb) => cb());

    expect(mockRecordRequest).toHaveBeenCalledTimes(1);
    const [method, url, statusCode, durationMs, userId] = mockRecordRequest.mock.calls[0];
    expect(method).toBe('GET');
    expect(url).toBe('/api/v1/health');
    expect(statusCode).toBe(200);
    expect(typeof durationMs).toBe('number');
    expect(durationMs).toBeGreaterThanOrEqual(0);
    expect(userId).toBeUndefined();
  });

  it('should extract userId from req.user when present', () => {
    (req as any).user = { id: 'user-abc-123' };

    metricsMiddleware(req, res, next);
    finishListeners.forEach((cb) => cb());

    const userId = mockRecordRequest.mock.calls[0][4];
    expect(userId).toBe('user-abc-123');
  });

  it('should fall back to req.url when originalUrl is missing', () => {
    (req as any).originalUrl = undefined;

    metricsMiddleware(req, res, next);
    finishListeners.forEach((cb) => cb());

    const url = mockRecordRequest.mock.calls[0][1];
    expect(url).toBe('/health');
  });

  it('should use the final statusCode', () => {
    metricsMiddleware(req, res, next);
    (res as any).statusCode = 404;
    finishListeners.forEach((cb) => cb());

    const statusCode = mockRecordRequest.mock.calls[0][2];
    expect(statusCode).toBe(404);
  });
});
