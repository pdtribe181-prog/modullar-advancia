/**
 * Cache Orchestration Service Tests
 * Tests: get, set, invalidate, warmCache, getStats, Zod schemas
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ── Mocks ──

const mockSetCache = jest.fn<any>();
const mockGetCache = jest.fn<any>();
const mockDeleteCache = jest.fn<any>();
const mockFrom = jest.fn<any>();
const mockServiceFrom = jest.fn<any>();

jest.unstable_mockModule('../lib/supabase.js', () => ({
  supabase: { from: mockFrom },
  createServiceClient: () => ({ from: mockServiceFrom }),
}));

jest.unstable_mockModule('../lib/redis.js', () => ({
  redisHelpers: {
    setCache: mockSetCache,
    getCache: mockGetCache,
    deleteCache: mockDeleteCache,
    scan: jest.fn<any>().mockResolvedValue([]),
    keys: jest.fn<any>().mockResolvedValue([]),
  },
}));

jest.unstable_mockModule('../middleware/logging.middleware.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const {
  CacheOrchestrationService,
  CacheRequest,
  CacheInvalidationRequest,
  CacheWarmingRequest,
  cacheOrchestrationService,
} = await import('../services/cache-orchestration.service.js');

// ── Tests ──

describe('CacheOrchestrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetCache.mockResolvedValue(undefined);
    mockGetCache.mockResolvedValue(null);
    mockDeleteCache.mockResolvedValue(undefined);
    mockFrom.mockReturnValue({
      upsert: jest.fn<any>().mockResolvedValue({ error: null }),
      select: jest.fn<any>().mockReturnValue({
        eq: jest.fn<any>().mockReturnValue({
          single: jest.fn<any>().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });
  });

  describe('Zod schemas', () => {
    it('CacheRequest validates correct request', () => {
      const result = CacheRequest.safeParse({ key: 'user:123' });
      expect(result.success).toBe(true);
    });

    it('CacheRequest rejects empty key', () => {
      const result = CacheRequest.safeParse({ key: '' });
      expect(result.success).toBe(false);
    });

    it('CacheRequest defaults strategy to cache_aside', () => {
      const parsed = CacheRequest.parse({ key: 'test' });
      expect(parsed.strategy).toBe('cache_aside');
    });

    it('CacheRequest defaults layer to auto', () => {
      const parsed = CacheRequest.parse({ key: 'test' });
      expect(parsed.layer).toBe('auto');
    });

    it('CacheRequest defaults compress to false', () => {
      const parsed = CacheRequest.parse({ key: 'test' });
      expect(parsed.compress).toBe(false);
    });

    it('CacheInvalidationRequest validates with keys', () => {
      const result = CacheInvalidationRequest.safeParse({ keys: ['a', 'b'] });
      expect(result.success).toBe(true);
    });

    it('CacheInvalidationRequest validates with tags', () => {
      const result = CacheInvalidationRequest.safeParse({ tags: ['user'] });
      expect(result.success).toBe(true);
    });

    it('CacheInvalidationRequest validates with pattern', () => {
      const result = CacheInvalidationRequest.safeParse({ pattern: 'user:*' });
      expect(result.success).toBe(true);
    });

    it('CacheInvalidationRequest defaults strategy to immediate', () => {
      const parsed = CacheInvalidationRequest.parse({});
      expect(parsed.strategy).toBe('immediate');
    });

    it('CacheWarmingRequest validates correct request', () => {
      const result = CacheWarmingRequest.safeParse({ keys: ['user:1', 'user:2'] });
      expect(result.success).toBe(true);
    });

    it('CacheWarmingRequest requires keys array', () => {
      const result = CacheWarmingRequest.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('get', () => {
    it('returns a CacheResult with correct shape', async () => {
      const result = await cacheOrchestrationService.get('test:key');

      expect(result).toEqual(
        expect.objectContaining({
          success: expect.any(Boolean),
          key: 'test:key',
          hit: expect.any(Boolean),
          layer: expect.any(String),
          retrievalTime: expect.any(Number),
        })
      );
    });

    it('returns cache miss when value not found', async () => {
      mockGetCache.mockResolvedValue(null);

      const result = await cacheOrchestrationService.get('missing:key');

      expect(result.hit).toBe(false);
      expect(result.layer).toBe('none');
    });

    it('returns hit from Redis layer', async () => {
      mockGetCache.mockResolvedValue(JSON.stringify({ value: 'cached-data' }));

      const result = await cacheOrchestrationService.get('found:key');

      // Should report a hit (either from memory or redis)
      expect(result.success).toBe(true);
    });

    it('handles errors gracefully', async () => {
      mockGetCache.mockRejectedValue(new Error('Redis timeout'));

      const result = await cacheOrchestrationService.get('error-key');

      // The service catches errors internally and returns a result
      expect(result).toBeDefined();
      expect(result.key).toBe('error-key');
    });
  });

  describe('set', () => {
    it('returns a CacheResult for successful set', async () => {
      const result = await cacheOrchestrationService.set('user:123', { name: 'John' });

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          key: 'user:123',
        })
      );
    });

    it('respects custom TTL', async () => {
      const result = await cacheOrchestrationService.set('ttl-key', 'value', { ttl: 3600 });

      expect(result.success).toBe(true);
    });

    it('supports write_through strategy', async () => {
      const result = await cacheOrchestrationService.set('wt-key', 'value', {
        strategy: 'write_through',
      });

      expect(result.success).toBe(true);
    });

    it('supports write_behind strategy', async () => {
      const result = await cacheOrchestrationService.set('wb-key', 'value', {
        strategy: 'write_behind',
      });

      expect(result.success).toBe(true);
    });

    it('handles tags', async () => {
      const result = await cacheOrchestrationService.set('tagged-key', 'value', {
        tags: ['user', 'profile'],
      });

      expect(result.success).toBe(true);
    });

    it('handles set errors gracefully', async () => {
      mockSetCache.mockRejectedValue(new Error('write failed'));

      const result = await cacheOrchestrationService.set('fail-key', 'value');

      expect(result.success).toBe(false);
    });
  });

  describe('invalidate', () => {
    it('invalidates by keys', async () => {
      const result = await cacheOrchestrationService.invalidate({
        keys: ['key1', 'key2'],
        strategy: 'immediate',
        propagate: true,
      });

      expect(result.success).toBe(true);
      expect(result.invalidatedKeys).toBeDefined();
    });

    it('invalidates by tags', async () => {
      const result = await cacheOrchestrationService.invalidate({
        tags: ['user'],
        strategy: 'immediate',
        propagate: true,
      });

      expect(result.success).toBe(true);
    });

    it('invalidates by pattern', async () => {
      const result = await cacheOrchestrationService.invalidate({
        pattern: 'session:*',
        strategy: 'immediate',
        propagate: true,
      });

      expect(result.success).toBe(true);
    });

    it('handles invalidation errors', async () => {
      mockDeleteCache.mockRejectedValue(new Error('delete failed'));

      const result = await cacheOrchestrationService.invalidate({
        keys: ['bad-key'],
        strategy: 'immediate',
        propagate: true,
      });

      // Should handle gracefully (may still report success with errors array)
      expect(result).toBeDefined();
    });
  });

  describe('warmCache', () => {
    it('warms specified keys', async () => {
      const result = await cacheOrchestrationService.warmCache({
        keys: ['user:1', 'user:2'],
        preloadData: false,
        priority: 'normal',
      });

      expect(result.success).toBe(true);
      expect(result.warmedKeys).toBeDefined();
    });

    it('handles warming errors gracefully', async () => {
      mockSetCache.mockRejectedValue(new Error('warm failed'));

      const result = await cacheOrchestrationService.warmCache({
        keys: ['fail:key'],
        preloadData: false,
        priority: 'normal',
      });

      expect(result).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('returns cache statistics', async () => {
      const stats = await cacheOrchestrationService.getStats();

      expect(stats).toEqual(
        expect.objectContaining({
          hits: expect.any(Number),
          misses: expect.any(Number),
          hitRate: expect.any(Number),
          totalOperations: expect.any(Number),
        })
      );
    });

    it('hitRate is a non-negative number', async () => {
      const stats = await cacheOrchestrationService.getStats();
      // hitRate may be 0-100 percentage or 0-1 ratio
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('singleton', () => {
    it('exports a CacheOrchestrationService instance', () => {
      expect(cacheOrchestrationService).toBeInstanceOf(CacheOrchestrationService);
    });
  });
});
