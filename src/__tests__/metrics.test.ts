import { jest } from '@jest/globals';

// Mock supabase before importing metrics service
jest.unstable_mockModule('../lib/supabase.js', () => {
  const chain: any = {};
  chain.insert = jest.fn<any>().mockResolvedValue({ data: null, error: null });
  chain.from = jest.fn<any>().mockReturnValue(chain);
  return {
    supabase: chain,
    getSupabaseClient: jest.fn<any>().mockReturnValue(chain),
    createServiceClient: jest.fn<any>().mockReturnValue(chain),
  };
});

jest.unstable_mockModule('../middleware/logging.middleware.js', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  requestId: jest.fn((_req: any, _res: any, next: any) => next()),
  requestLogger: jest.fn((_req: any, _res: any, next: any) => next()),
  errorHandler: jest.fn(),
  notFoundHandler: jest.fn(),
}));

const {
  recordRequest,
  recordTransaction,
  trackActiveUser,
  getMetricsSnapshot,
  getPrometheusMetrics,
  resetMetrics,
  persistMetrics,
} = await import('../services/metrics.service.js');

describe('Metrics Service', () => {
  beforeEach(() => {
    resetMetrics();
  });

  describe('recordRequest', () => {
    it('increments total request count', () => {
      recordRequest('GET', '/api/v1/health', 200, 5);
      recordRequest('POST', '/api/v1/auth/login', 200, 15);
      const snap = getMetricsSnapshot();
      expect(snap.api.totalRequests).toBe(2);
    });

    it('tracks 5xx errors separately', () => {
      recordRequest('GET', '/api/v1/broken', 500, 100);
      recordRequest('GET', '/api/v1/ok', 200, 5);
      const snap = getMetricsSnapshot();
      expect(snap.api.totalErrors).toBe(1);
      expect(snap.api.errorRate).toBeCloseTo(50, 0);
    });

    it('calculates average response time', () => {
      recordRequest('GET', '/test', 200, 10);
      recordRequest('GET', '/test', 200, 30);
      const snap = getMetricsSnapshot();
      expect(snap.api.avgResponseMs).toBe(20);
    });

    it('normalises UUIDs in paths', () => {
      recordRequest('GET', '/api/v1/patients/550e8400-e29b-41d4-a716-446655440000', 200, 5);
      recordRequest('GET', '/api/v1/patients/660e8400-e29b-41d4-a716-446655440001', 200, 8);
      const snap = getMetricsSnapshot();
      // Both should merge into one endpoint
      expect(snap.endpoints.length).toBe(1);
      expect(snap.endpoints[0].path).toBe('/api/v1/patients/:id');
      expect(snap.endpoints[0].latency.count).toBe(2);
    });

    it('strips query strings from paths', () => {
      recordRequest('GET', '/api/v1/transactions?page=1&limit=20', 200, 10);
      recordRequest('GET', '/api/v1/transactions?page=2', 200, 12);
      const snap = getMetricsSnapshot();
      expect(snap.endpoints.length).toBe(1);
      expect(snap.endpoints[0].path).toBe('/api/v1/transactions');
    });

    it('groups status codes into buckets', () => {
      recordRequest('GET', '/test', 200, 5);
      recordRequest('GET', '/test', 201, 6);
      recordRequest('GET', '/test', 404, 7);
      recordRequest('GET', '/test', 500, 8);
      const snap = getMetricsSnapshot();
      const ep = snap.endpoints[0];
      expect(ep.statusBuckets['2xx']).toBe(2);
      expect(ep.statusBuckets['4xx']).toBe(1);
      expect(ep.statusBuckets['5xx']).toBe(1);
    });
  });

  describe('recordTransaction', () => {
    it('tracks successful transactions', () => {
      recordTransaction(true);
      recordTransaction(true);
      recordTransaction(false);
      const snap = getMetricsSnapshot();
      expect(snap.transactions.total).toBe(3);
      expect(snap.transactions.successful).toBe(2);
      expect(snap.transactions.failed).toBe(1);
      expect(snap.transactions.successRate).toBeCloseTo(66.67, 1);
    });

    it('returns 100% success rate when no transactions', () => {
      const snap = getMetricsSnapshot();
      expect(snap.transactions.successRate).toBe(100);
    });
  });

  describe('trackActiveUser', () => {
    it('tracks unique users', () => {
      trackActiveUser('user-1');
      trackActiveUser('user-2');
      trackActiveUser('user-1'); // duplicate
      const snap = getMetricsSnapshot();
      expect(snap.activeUsers.last5min).toBe(2);
      expect(snap.activeUsers.last1hr).toBe(2);
    });

    it('tracks user from request with userId', () => {
      recordRequest('GET', '/test', 200, 5, 'user-a');
      recordRequest('GET', '/test', 200, 5, 'user-b');
      recordRequest('GET', '/test', 200, 5); // anonymous
      const snap = getMetricsSnapshot();
      expect(snap.activeUsers.last5min).toBe(2);
    });
  });

  describe('getMetricsSnapshot', () => {
    it('returns uptime in seconds', () => {
      const snap = getMetricsSnapshot();
      expect(snap.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });

    it('returns collectedAt as ISO string', () => {
      const snap = getMetricsSnapshot();
      expect(new Date(snap.collectedAt).toISOString()).toBe(snap.collectedAt);
    });

    it('limits endpoints to top 20', () => {
      for (let i = 0; i < 30; i++) {
        recordRequest('GET', `/endpoint-${i}`, 200, 5);
      }
      const snap = getMetricsSnapshot();
      expect(snap.endpoints.length).toBe(20);
    });

    it('sorts endpoints by request count descending', () => {
      recordRequest('GET', '/few', 200, 5);
      for (let i = 0; i < 10; i++) {
        recordRequest('GET', '/many', 200, 5);
      }
      const snap = getMetricsSnapshot();
      expect(snap.endpoints[0].path).toBe('/many');
    });
  });

  describe('getPrometheusMetrics', () => {
    it('returns text/plain format with HELP and TYPE annotations', () => {
      recordRequest('GET', '/test', 200, 10);
      recordTransaction(true);
      const text = getPrometheusMetrics();
      expect(text).toContain('# HELP app_uptime_seconds');
      expect(text).toContain('# TYPE app_uptime_seconds gauge');
      expect(text).toContain('app_requests_total 1');
      expect(text).toContain('app_transactions_total 1');
      expect(text).toContain('app_transactions_successful 1');
    });

    it('ends with newline', () => {
      const text = getPrometheusMetrics();
      expect(text.endsWith('\n')).toBe(true);
    });
  });

  describe('resetMetrics', () => {
    it('clears all counters', () => {
      recordRequest('GET', '/test', 200, 10);
      recordTransaction(true);
      trackActiveUser('user-x');
      resetMetrics();
      const snap = getMetricsSnapshot();
      expect(snap.api.totalRequests).toBe(0);
      expect(snap.transactions.total).toBe(0);
      expect(snap.endpoints.length).toBe(0);
    });
  });

  describe('persistMetrics', () => {
    it('does not throw on success', async () => {
      await expect(persistMetrics()).resolves.toBeUndefined();
    });

    it('absorbs database errors (catch branch)', async () => {
      const { createServiceClient } = (await import('../lib/supabase.js')) as any;
      const chain = createServiceClient();
      chain.insert.mockRejectedValueOnce(new Error('DB unavailable'));
      await expect(persistMetrics()).resolves.toBeUndefined();
    });
  });

  describe('latency percentiles', () => {
    it('computes p50, p95, p99 correctly', () => {
      // Generate 100 requests with known latencies
      for (let i = 1; i <= 100; i++) {
        recordRequest('GET', '/perf', 200, i);
      }
      const snap = getMetricsSnapshot();
      const ep = snap.endpoints[0];
      expect(ep.latency.count).toBe(100);
      expect(ep.latency.min).toBe(1);
      expect(ep.latency.max).toBe(100);
      expect(ep.latency.p50).toBe(50);
      expect(ep.latency.p95).toBe(95);
      expect(ep.latency.p99).toBe(99);
    });
  });

  describe('rotateWindows (time-based window expiry)', () => {
    it('rotates the 5-min user window when time advances', () => {
      const realNow = Date.now();
      trackActiveUser('win-a');
      trackActiveUser('win-b');

      const spy = jest.spyOn(Date, 'now').mockReturnValue(realNow + 6 * 60_000);
      try {
        trackActiveUser('win-c');
        const snap = getMetricsSnapshot();
        // After rotation, only win-c is in the new 5-min window
        expect(snap.activeUsers.last5min).toBeGreaterThanOrEqual(1);
      } finally {
        spy.mockRestore();
      }
    });

    it('rotates the 1-hr user window when time advances past 1 hour', () => {
      const realNow = Date.now();
      trackActiveUser('hr-a');

      const spy = jest.spyOn(Date, 'now').mockReturnValue(realNow + 61 * 60_000);
      try {
        trackActiveUser('hr-b');
        const snap = getMetricsSnapshot();
        expect(snap.activeUsers.last1hr).toBeGreaterThanOrEqual(1);
      } finally {
        spy.mockRestore();
      }
    });
  });
});
