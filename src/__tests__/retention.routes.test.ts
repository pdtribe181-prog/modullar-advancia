/**
 * Retention Routes Tests
 * Covers: GET /retention/policies, POST /retention/enforce, GET /retention/history
 */
import { jest } from '@jest/globals';

jest.unstable_mockModule('../lib/supabase.js', () => ({
  supabase: { from: jest.fn<any>() },
  createServiceClient: () => ({
    from: jest.fn<any>().mockReturnValue({
      select: jest.fn<any>().mockReturnValue({
        eq: jest.fn<any>().mockReturnValue({
          order: jest.fn<any>().mockReturnValue({
            limit: jest.fn<any>().mockResolvedValue({
              data: [
                {
                  id: 'log-1',
                  action: 'data_retention_enforcement',
                  created_at: '2026-01-01T00:00:00Z',
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
    }),
  }),
}));

let mockRole = 'admin';
jest.unstable_mockModule('../middleware/auth.middleware.js', () => ({
  authenticate: (_req: any, _res: any, next: any) => {
    _req.user = { id: 'admin-uuid' };
    _req.userProfile = { role: mockRole };
    next();
  },
  AuthenticatedRequest: {},
}));

jest.unstable_mockModule('../middleware/rateLimit.middleware.js', () => ({
  sensitiveLimiter: (_req: any, _res: any, next: any) => next(),
}));

jest.unstable_mockModule('../middleware/audit.middleware.js', () => ({
  auditAdmin: () => (_req: any, _res: any, next: any) => next(),
}));

jest.unstable_mockModule('../services/data-retention.service.js', () => ({
  getRetentionPolicySummary: jest.fn<any>().mockReturnValue([
    { table: 'sessions', retentionPeriod: '30 days', action: 'delete', rowsAffected: 0 },
    { table: 'audit_logs', retentionPeriod: '7 years', action: 'archive', rowsAffected: 0 },
  ]),
  enforceRetentionPolicies: jest.fn<any>().mockResolvedValue([
    { table: 'sessions', rowsAffected: 5, error: null },
    { table: 'temp_data', rowsAffected: 3, error: null },
  ]),
}));

jest.unstable_mockModule('../middleware/logging.middleware.js', () => ({
  logger: {
    info: jest.fn<any>(),
    warn: jest.fn<any>(),
    error: jest.fn<any>(),
    debug: jest.fn<any>(),
  },
}));

const { default: express } = await import('express');
const { default: request } = await import('supertest');
const { default: retentionRouter } = await import('../routes/retention.routes.js');

const app = express();
app.use(express.json());
app.use('/retention', retentionRouter);
app.use((err: any, _req: any, res: any, _next: any) => {
  const status = err.statusCode || err.status || 500;
  res.status(status).json({ error: err.message });
});

describe('Retention Routes', () => {
  describe('GET /retention/policies', () => {
    it('returns policy summary', async () => {
      const res = await request(app).get('/retention/policies');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.total).toBeGreaterThan(0);
    });
  });

  describe('POST /retention/enforce', () => {
    it('enforces retention policies for admin', async () => {
      const res = await request(app).post('/retention/enforce');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalRowsAffected).toBe(8);
    });
  });

  describe('GET /retention/history', () => {
    it('returns enforcement history for admin', async () => {
      const res = await request(app).get('/retention/history');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Non-admin access', () => {
    afterEach(() => {
      mockRole = 'admin';
    });

    it('POST /enforce rejects non-admin with 403', async () => {
      mockRole = 'patient';
      const res = await request(app).post('/retention/enforce');
      expect(res.status).toBe(403);
    });

    it('GET /history rejects non-admin with 403', async () => {
      mockRole = 'patient';
      const res = await request(app).get('/retention/history');
      expect(res.status).toBe(403);
    });
  });
});
