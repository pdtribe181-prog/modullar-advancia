/**
 * Cache Middleware Tests
 * Tests for cacheResponse, invalidateCache, invalidateResource
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// ── Mocks ──

const mockGetCache = jest.fn<any>();
const mockSetCache = jest.fn<any>();
const mockGetRedis = jest.fn<any>();
const mockGetRedisKind = jest.fn<any>();

jest.unstable_mockModule('../lib/redis.js', () => ({
  redisHelpers: {
    getCache: mockGetCache,
    setCache: mockSetCache,
  },
  getRedis: mockGetRedis,
  getRedisKind: mockGetRedisKind,
}));

jest.unstable_mockModule('../middleware/logging.middleware.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const { cacheResponse, invalidateCache, invalidateResource } =
  await import('../middleware/cache.middleware.js');

// ── Helpers ──

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    baseUrl: '/api',
    path: '/providers',
    query: {},
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response {
  const res: any = {
    statusCode: 200,
    setHeader: jest.fn<any>().mockReturnThis(),
    status: jest.fn<any>().mockImplementation(function (this: any, code: number) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn<any>().mockReturnThis(),
    locals: {},
  };
  return res;
}

describe('cache.middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetCache.mockResolvedValue(undefined);
  });

  // ────────────── cacheResponse ──────────────

  describe('cacheResponse', () => {
    it('should skip non-GET requests', async () => {
      const middleware = cacheResponse(60);
      const req = mockReq({ method: 'POST' });
      const res = mockRes();
      const next = jest.fn<any>();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(mockGetCache).not.toHaveBeenCalled();
    });

    it('should return cached response on cache hit', async () => {
      const cachedData = { status: 200, body: { success: true, data: [1, 2, 3] } };
      mockGetCache.mockResolvedValue(cachedData);

      const middleware = cacheResponse(60);
      const req = mockReq();
      const res = mockRes();
      const next = jest.fn<any>();

      await middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Cache', 'HIT');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(cachedData.body);
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next and intercept res.json on cache miss', async () => {
      mockGetCache.mockResolvedValue(null);

      const middleware = cacheResponse(60);
      const req = mockReq();
      const res = mockRes();
      const next = jest.fn<any>();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      // res.json should be replaced; calling it should trigger setCache
      res.json({ data: 'fresh' });

      // Flush microtasks so async cache write completes
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockSetCache).toHaveBeenCalledWith(
        expect.stringContaining('cache:'),
        expect.objectContaining({ status: 200, body: { data: 'fresh' } }),
        60
      );
    });

    it('should not cache non-2xx responses', async () => {
      mockGetCache.mockResolvedValue(null);

      const middleware = cacheResponse(60);
      const req = mockReq();
      const res = mockRes();
      res.statusCode = 500;
      const next = jest.fn<any>();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      // Simulate error response
      res.json({ error: 'Server error' });
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockSetCache).not.toHaveBeenCalled();
    });

    it('should skip cache when condition returns false', async () => {
      const middleware = cacheResponse({ ttl: 60, condition: () => false });
      const req = mockReq();
      const res = mockRes();
      const next = jest.fn<any>();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(mockGetCache).not.toHaveBeenCalled();
    });

    it('should proceed when condition returns true', async () => {
      mockGetCache.mockResolvedValue(null);

      const middleware = cacheResponse({ ttl: 30, condition: () => true });
      const req = mockReq();
      const res = mockRes();
      const next = jest.fn<any>();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(mockGetCache).toHaveBeenCalled();
    });

    it('should continue to next when Redis read fails', async () => {
      mockGetCache.mockRejectedValue(new Error('Redis connection error'));

      const middleware = cacheResponse(60);
      const req = mockReq();
      const res = mockRes();
      const next = jest.fn<any>();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should use custom keyFn when provided', async () => {
      mockGetCache.mockResolvedValue(null);

      const customKey = jest.fn<any>().mockReturnValue('custom:key');
      const middleware = cacheResponse({ ttl: 60, keyFn: customKey });
      const req = mockReq();
      const res = mockRes();
      const next = jest.fn<any>();

      await middleware(req, res, next);

      expect(customKey).toHaveBeenCalledWith(req);
      expect(mockGetCache).toHaveBeenCalledWith('custom:key');
    });

    it('should set X-Cache MISS header on fresh response', async () => {
      mockGetCache.mockResolvedValue(null);

      const middleware = cacheResponse(60);
      const req = mockReq();
      const res = mockRes();
      const next = jest.fn<any>();

      await middleware(req, res, next);
      res.json({ data: 'fresh' });

      expect(res.setHeader).toHaveBeenCalledWith('X-Cache', 'MISS');
    });

    it('should include role in default cache key', async () => {
      mockGetCache.mockResolvedValue(null);

      const middleware = cacheResponse(60);
      const req = mockReq();
      (req as any).userProfile = { role: 'admin' };
      const res = mockRes();
      const next = jest.fn<any>();

      await middleware(req, res, next);

      expect(mockGetCache).toHaveBeenCalledWith(expect.stringContaining('cache:admin:'));
    });

    it('should default to ttl 60 when not specified', async () => {
      mockGetCache.mockResolvedValue(null);

      const middleware = cacheResponse();
      const req = mockReq();
      const res = mockRes();
      const next = jest.fn<any>();

      await middleware(req, res, next);
      res.json({ data: 'test' });
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockSetCache).toHaveBeenCalledWith(expect.any(String), expect.any(Object), 60);
    });
  });

  // ────────────── invalidateCache ──────────────

  describe('invalidateCache', () => {
    it('should delete cache key for upstash', async () => {
      mockGetRedisKind.mockReturnValue('upstash');
      const mockDel = jest.fn<any>().mockResolvedValue(1);
      mockGetRedis.mockReturnValue({ del: mockDel });

      const deleted = await invalidateCache('cache:admin:/api/providers');
      expect(deleted).toBe(1);
      expect(mockDel).toHaveBeenCalledWith('cache:admin:/api/providers');
    });

    it('should scan and delete keys for ioredis', async () => {
      mockGetRedisKind.mockReturnValue('ioredis');
      const mockDel = jest.fn<any>().mockResolvedValue(2);
      const mockScan = jest
        .fn<any>()
        .mockResolvedValueOnce(['0', ['cache:admin:/api/p1', 'cache:admin:/api/p2']]);
      mockGetRedis.mockReturnValue({ scan: mockScan, del: mockDel });

      const deleted = await invalidateCache('cache:admin:/api');
      expect(deleted).toBe(2);
      expect(mockScan).toHaveBeenCalledWith('0', 'MATCH', 'cache:admin:/api*', 'COUNT', 100);
    });

    it('should handle ioredis SCAN pagination', async () => {
      mockGetRedisKind.mockReturnValue('ioredis');
      const mockDel = jest.fn<any>().mockResolvedValue(1);
      const mockScan = jest
        .fn<any>()
        .mockResolvedValueOnce(['5', ['key1']])
        .mockResolvedValueOnce(['0', ['key2']]);
      mockGetRedis.mockReturnValue({ scan: mockScan, del: mockDel });

      const deleted = await invalidateCache('cache:');
      expect(deleted).toBe(2);
      expect(mockScan).toHaveBeenCalledTimes(2);
    });

    it('should return 0 for unknown redis kind', async () => {
      mockGetRedisKind.mockReturnValue('memory');

      const deleted = await invalidateCache('cache:');
      expect(deleted).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      mockGetRedisKind.mockReturnValue('upstash');
      mockGetRedis.mockReturnValue({
        del: jest.fn<any>().mockRejectedValue(new Error('Redis error')),
      });

      const deleted = await invalidateCache('cache:');
      expect(deleted).toBe(0);
    });
  });

  // ────────────── invalidateResource ──────────────

  describe('invalidateResource', () => {
    it('should invalidate all role prefixes for a resource', async () => {
      mockGetRedisKind.mockReturnValue('upstash');
      const mockDel = jest.fn<any>().mockResolvedValue(1);
      mockGetRedis.mockReturnValue({ del: mockDel });

      await invalidateResource('/api/providers');

      expect(mockDel).toHaveBeenCalledTimes(4);
      expect(mockDel).toHaveBeenCalledWith('cache:admin:/api/providers');
      expect(mockDel).toHaveBeenCalledWith('cache:provider:/api/providers');
      expect(mockDel).toHaveBeenCalledWith('cache:patient:/api/providers');
      expect(mockDel).toHaveBeenCalledWith('cache:anon:/api/providers');
    });

    it('should invalidate all role prefixes via ioredis scan', async () => {
      mockGetRedisKind.mockReturnValue('ioredis');
      const mockDel = jest.fn<any>().mockResolvedValue(1);
      const mockScan = jest.fn<any>().mockResolvedValue(['0', []]);
      mockGetRedis.mockReturnValue({ scan: mockScan, del: mockDel });

      await invalidateResource('/api/patients');

      // Should call scan for each of the 4 role prefixes
      expect(mockScan).toHaveBeenCalledTimes(4);
      expect(mockScan).toHaveBeenCalledWith(
        '0',
        'MATCH',
        'cache:admin:/api/patients*',
        'COUNT',
        100
      );
      expect(mockScan).toHaveBeenCalledWith(
        '0',
        'MATCH',
        'cache:provider:/api/patients*',
        'COUNT',
        100
      );
      expect(mockScan).toHaveBeenCalledWith(
        '0',
        'MATCH',
        'cache:patient:/api/patients*',
        'COUNT',
        100
      );
      expect(mockScan).toHaveBeenCalledWith(
        '0',
        'MATCH',
        'cache:anon:/api/patients*',
        'COUNT',
        100
      );
    });

    it('should not throw when one role prefix fails', async () => {
      mockGetRedisKind.mockReturnValue('upstash');
      const mockDel = jest
        .fn<any>()
        .mockRejectedValueOnce(new Error('Redis down'))
        .mockResolvedValue(1);
      mockGetRedis.mockReturnValue({ del: mockDel });

      // Should not throw even though the first call rejects
      await expect(invalidateResource('/api/broken')).resolves.toBeUndefined();
    });
  });
});
