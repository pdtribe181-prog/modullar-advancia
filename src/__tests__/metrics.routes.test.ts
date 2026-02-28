/**
 * Metrics Routes Tests
 * Covers: GET / (prometheus), GET /json (admin), POST /persist (admin)
 */
import { jest } from '@jest/globals';

const mockGetPrometheusMetrics = jest
  .fn<any>()
  .mockReturnValue('# HELP requests_total Total requests\nrequests_total 42\n');
const mockGetMetricsSnapshot = jest.fn<any>().mockReturnValue({
  requests: 42,
  errors: 3,
  uptime: 12345,
});
const mockPersistMetrics = jest.fn<any>().mockResolvedValue(undefined);

jest.unstable_mockModule('../services/metrics.service.js', () => ({
  getMetricsSnapshot: mockGetMetricsSnapshot,
  getPrometheusMetrics: mockGetPrometheusMetrics,
  persistMetrics: mockPersistMetrics,
}));

// Mock auth middleware to pass through
jest.unstable_mockModule('../middleware/auth.middleware.js', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

const { default: metricsRouter } = await import('../routes/metrics.routes.js');

// We'll test via supertest-like approach with Express
const expressModule = await import('express');
const express = expressModule.default;

let app: any;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/metrics', metricsRouter);
});

beforeEach(() => {
  jest.clearAllMocks();
});

// Import supertest dynamically
const { default: request } = await import('supertest');

describe('Metrics Routes', () => {
  describe('GET /metrics', () => {
    it('returns prometheus text format', async () => {
      const res = await request(app).get('/metrics');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('requests_total');
      expect(mockGetPrometheusMetrics).toHaveBeenCalled();
    });
  });

  describe('GET /metrics/json', () => {
    it('returns JSON metrics snapshot', async () => {
      const res = await request(app).get('/metrics/json');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ requests: 42, errors: 3, uptime: 12345 });
      expect(mockGetMetricsSnapshot).toHaveBeenCalled();
    });
  });

  describe('POST /metrics/persist', () => {
    it('persists metrics and responds', async () => {
      const res = await request(app).post('/metrics/persist');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'persisted' });
      expect(mockPersistMetrics).toHaveBeenCalled();
    });
  });
});
