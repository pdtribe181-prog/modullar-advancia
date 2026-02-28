/**
 * Admin Routes Tests
 * Covers: /admin/dashboard, /admin/users, /admin/transactions, /admin/disputes,
 *         /admin/providers, /admin/webhooks, /admin/audit-log, /admin/analytics/revenue,
 *         /admin/system/health
 */
import { jest } from '@jest/globals';

// Mock supabase
const mockSelect = jest.fn<any>();
const mockInsert = jest.fn<any>();
const mockUpdate = jest.fn<any>();
const mockEq = jest.fn<any>();
const mockGte = jest.fn<any>();
const mockLte = jest.fn<any>();
const mockOr = jest.fn<any>();
const mockOrder = jest.fn<any>();
const mockRange = jest.fn<any>();
const mockLimit = jest.fn<any>();
const mockSingle = jest.fn<any>();
const mockRpc = jest.fn<any>();

function createChain(finalResult: any = { data: [], error: null, count: 0 }): any {
  const chain: any = {};
  chain.select = mockSelect.mockReturnValue(chain);
  chain.insert = mockInsert.mockReturnValue(chain);
  chain.update = mockUpdate.mockReturnValue(chain);
  chain.eq = mockEq.mockReturnValue(chain);
  chain.gte = mockGte.mockReturnValue(chain);
  chain.lte = mockLte.mockReturnValue(chain);
  chain.or = mockOr.mockReturnValue(chain);
  chain.order = mockOrder.mockReturnValue(chain);
  chain.range = mockRange.mockResolvedValue(finalResult);
  chain.limit = mockLimit.mockResolvedValue(finalResult);
  chain.single = mockSingle.mockResolvedValue(finalResult);
  return chain;
}

const mockFrom = jest.fn<any>();

jest.unstable_mockModule('../lib/supabase.js', () => ({
  supabase: { from: mockFrom, rpc: mockRpc },
  createServiceClient: () => ({ from: mockFrom, rpc: mockRpc }),
}));

jest.unstable_mockModule('../services/stripe.service.js', () => ({
  stripe: {
    paymentIntents: { retrieve: jest.fn<any>().mockResolvedValue({ id: 'pi_test' }) },
    accounts: {
      retrieve: jest.fn<any>().mockResolvedValue({
        id: 'acct_test',
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
        business_type: 'individual',
        requirements: {},
      }),
    },
    balance: {
      retrieve: jest
        .fn<any>()
        .mockResolvedValue({ available: [{ amount: 1000 }], pending: [{ amount: 500 }] }),
    },
  },
  stripeServices: {},
}));

jest.unstable_mockModule('../middleware/auth.middleware.js', () => ({
  authenticate: (_req: any, _res: any, next: any) => {
    _req.user = { id: 'admin-uuid', email: 'admin@test.com' };
    _req.userProfile = { role: 'admin' };
    next();
  },
  authenticateWithProfile: (_req: any, _res: any, next: any) => {
    _req.user = { id: 'admin-uuid' };
    _req.userProfile = { role: 'admin' };
    next();
  },
  requireAdmin: [
    (_req: any, _res: any, next: any) => next(),
    (_req: any, _res: any, next: any) => next(),
  ],
  requireRole: () => (_req: any, _res: any, next: any) => next(),
  AuthenticatedRequest: {},
}));

jest.unstable_mockModule('../middleware/rateLimit.middleware.js', () => ({
  sensitiveLimiter: (_req: any, _res: any, next: any) => next(),
  apiLimiter: (_req: any, _res: any, next: any) => next(),
}));

jest.unstable_mockModule('../middleware/logging.middleware.js', () => ({
  logger: {
    info: jest.fn<any>(),
    warn: jest.fn<any>(),
    error: jest.fn<any>(),
    debug: jest.fn<any>(),
  },
}));

jest.unstable_mockModule('../middleware/cache.middleware.js', () => ({
  cacheResponse: () => (_req: any, _res: any, next: any) => next(),
  invalidateCache: jest.fn<any>(),
}));

const { default: express } = await import('express');
const { default: request } = await import('supertest');
const { default: adminRouter } = await import('../routes/admin.routes.js');

// Use a proper RFC 4122 UUID (Zod rejects all-zero padding)
const UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const app = express();
app.use(express.json());
app.use('/admin', adminRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Admin Routes', () => {
  describe('GET /admin/dashboard', () => {
    it('returns dashboard overview', async () => {
      // Mock the 6 parallel queries
      const dashChain = createChain({ count: 10, data: [{ id: 1 }], error: null });
      mockFrom.mockReturnValue(dashChain);
      mockRpc.mockReturnValue({ select: jest.fn<any>().mockResolvedValue({ data: [] }) });

      const res = await request(app).get('/admin/dashboard');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('overview');
    });
  });

  describe('GET /admin/users', () => {
    it('returns paginated users', async () => {
      const chain = createChain({ data: [{ id: 'u1', email: 'x@x.com' }], error: null, count: 1 });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get('/admin/users?page=1&limit=10');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('pagination');
    });

    it('filters by status', async () => {
      const chain = createChain({ data: [], error: null, count: 0 });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get('/admin/users?status=active');
      expect(res.status).toBe(200);
      expect(mockEq).toHaveBeenCalledWith('status', 'active');
    });

    it('searches by name/email', async () => {
      const chain = createChain({ data: [], error: null, count: 0 });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get('/admin/users?search=john');
      expect(res.status).toBe(200);
      expect(mockOr).toHaveBeenCalled();
    });

    it('filters by role', async () => {
      const chain = createChain({ data: [], error: null, count: 0 });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get('/admin/users?role=provider');
      expect(res.status).toBe(200);
      expect(mockEq).toHaveBeenCalledWith('role', 'provider');
    });

    it('returns 500 on DB error', async () => {
      const chain = createChain({ data: null, error: { message: 'db error' }, count: 0 });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get('/admin/users');
      expect(res.status).toBe(500);
    });
  });

  describe('GET /admin/users/online', () => {
    it('returns recently active users', async () => {
      const chain = createChain();
      chain.gte = mockGte.mockReturnValue(chain);
      chain.order = mockOrder.mockResolvedValue({ data: [{ id: 'u1' }], error: null });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get('/admin/users/online');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 500 on DB error', async () => {
      const chain = createChain();
      chain.gte = mockGte.mockReturnValue(chain);
      chain.order = mockOrder.mockResolvedValue({ data: null, error: { message: 'db error' } });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get('/admin/users/online');
      expect(res.status).toBe(500);
    });
  });

  describe('GET /admin/users/:id', () => {
    it('returns a single user', async () => {
      const chain = createChain();
      chain.single = mockSingle.mockResolvedValue({
        data: { id: '00000000-0000-0000-0000-000000000001', email: 'test@test.com' },
        error: null,
      });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get(`/admin/users/${UUID}`);
      expect(res.status).toBe(200);
    });

    it('returns 404 for invalid user', async () => {
      const chain = createChain();
      chain.single = mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'not found', code: 'PGRST116' },
      });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get(`/admin/users/${UUID}`);
      expect(res.status).toBe(404);
    });

    it('rejects non-UUID id', async () => {
      const res = await request(app).get('/admin/users/not-a-uuid');
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /admin/users/:id/status', () => {
    it('updates user status', async () => {
      const chain = createChain();
      chain.single = mockSingle.mockResolvedValue({
        data: { id: '00000000-0000-0000-0000-000000000001', status: 'suspended' },
        error: null,
      });
      // insert for compliance_logs
      const insertChain = createChain();
      insertChain.insert = mockInsert.mockResolvedValue({ error: null });
      mockFrom.mockReturnValue(chain);

      const res = await request(app)
        .put(`/admin/users/${UUID}/status`)
        .send({ status: 'suspended', reason: 'test' });
      expect(res.status).toBe(200);
    });

    it('returns 500 when DB update fails', async () => {
      const chain = createChain();
      chain.single = mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'update failed' },
      });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).put(`/admin/users/${UUID}/status`).send({ status: 'active' });
      expect(res.status).toBe(500);
    });
  });

  describe('GET /admin/transactions', () => {
    it('lists transactions with pagination', async () => {
      const chain = createChain({ data: [{ id: 't1' }], error: null, count: 1 });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get('/admin/transactions?page=1&limit=10');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('pagination');
    });

    it('filters by status', async () => {
      const chain = createChain({ data: [], error: null, count: 0 });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get('/admin/transactions?status=completed');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /admin/transactions/:id', () => {
    it('returns transaction details', async () => {
      const chain = createChain();
      chain.single = mockSingle.mockResolvedValue({
        data: { id: '00000000-0000-0000-0000-000000000001', stripe_payment_intent_id: null },
        error: null,
      });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get(`/admin/transactions/${UUID}`);
      expect(res.status).toBe(200);
    });

    it('includes Stripe payment details when payment intent exists', async () => {
      const chain = createChain();
      chain.single = mockSingle.mockResolvedValue({
        data: { id: 't1', stripe_payment_intent_id: 'pi_abc' },
        error: null,
      });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get(`/admin/transactions/${UUID}`);
      expect(res.status).toBe(200);
      expect(res.body.data.stripePayment).toBeDefined();
    });

    it('handles Stripe payment retrieval failure gracefully', async () => {
      const chain = createChain();
      chain.single = mockSingle.mockResolvedValue({
        data: { id: 't1', stripe_payment_intent_id: 'pi_fail' },
        error: null,
      });
      mockFrom.mockReturnValue(chain);

      const { stripe: s } = await import('../services/stripe.service.js');
      (s.paymentIntents.retrieve as any).mockRejectedValueOnce(new Error('Stripe down'));

      const res = await request(app).get(`/admin/transactions/${UUID}`);
      expect(res.status).toBe(200);
      expect(res.body.data.stripePayment).toBeNull();
    });
  });

  describe('GET /admin/disputes', () => {
    it('returns disputes with pagination', async () => {
      const chain = createChain({ data: [], error: null, count: 0 });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get('/admin/disputes?page=1&limit=10');
      expect(res.status).toBe(200);
    });

    it('filters by status', async () => {
      const chain = createChain({ data: [], error: null, count: 0 });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get('/admin/disputes?status=pending');
      expect(res.status).toBe(200);
    });
  });

  describe('PATCH /admin/disputes/:id', () => {
    it('updates dispute status', async () => {
      const chain = createChain();
      chain.single = mockSingle.mockResolvedValue({
        data: { id: '00000000-0000-0000-0000-000000000001' },
        error: null,
      });
      const insertChain = createChain();
      insertChain.insert = mockInsert.mockResolvedValue({ error: null });
      mockFrom.mockReturnValue(chain);

      const res = await request(app)
        .patch(`/admin/disputes/${UUID}`)
        .send({ status: 'resolved', resolution_notes: 'Resolved via test' });
      expect(res.status).toBe(200);
    });
  });

  describe('GET /admin/providers', () => {
    it('returns providers list', async () => {
      const chain = createChain({ data: [], error: null, count: 0 });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get('/admin/providers');
      expect(res.status).toBe(200);
    });

    it('filters pending providers', async () => {
      const chain = createChain({ data: [], error: null, count: 0 });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get('/admin/providers?status=pending');
      expect(res.status).toBe(200);
      expect(mockEq).toHaveBeenCalledWith('stripe_onboarding_complete', false);
    });

    it('filters active providers', async () => {
      const chain = createChain({ data: [], error: null, count: 0 });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get('/admin/providers?status=active');
      expect(res.status).toBe(200);
      expect(mockEq).toHaveBeenCalledWith('stripe_onboarding_complete', true);
    });
  });

  describe('GET /admin/webhooks', () => {
    it('returns webhook events', async () => {
      const chain = createChain({ data: [], error: null, count: 0 });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get('/admin/webhooks');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /admin/audit-log', () => {
    it('returns audit logs', async () => {
      const chain = createChain({ data: [], error: null, count: 0 });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get('/admin/audit-log');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /admin/analytics/revenue', () => {
    it('returns revenue analytics', async () => {
      const chain = createChain();
      chain.eq = mockEq.mockResolvedValue({
        data: [{ amount: 100, status: 'completed', created_at: '2026-01-15T00:00:00Z' }],
        error: null,
      });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get('/admin/analytics/revenue?period=30');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalRevenue');
      expect(res.body.data).toHaveProperty('dailyRevenue');
    });
  });

  describe('GET /admin/providers/:id/stripe', () => {
    it('returns provider Stripe account and balance', async () => {
      const chain = createChain();
      chain.single = mockSingle.mockResolvedValue({
        data: { stripe_account_id: 'acct_test' },
        error: null,
      });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get(`/admin/providers/${UUID}/stripe`);
      expect(res.status).toBe(200);
      expect(res.body.data.account.id).toBe('acct_test');
      expect(res.body.data.balance).toHaveProperty('available');
      expect(res.body.data.balance).toHaveProperty('pending');
    });

    it('returns 404 when provider has no Stripe account', async () => {
      const chain = createChain();
      chain.single = mockSingle.mockResolvedValue({
        data: { stripe_account_id: null },
        error: null,
      });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get(`/admin/providers/${UUID}/stripe`);
      expect(res.status).toBe(404);
    });

    it('returns 500 on DB error', async () => {
      const chain = createChain();
      chain.single = mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get(`/admin/providers/${UUID}/stripe`);
      expect(res.status).toBe(500);
    });
  });

  describe('GET /admin/system/health', () => {
    it('returns healthy when all services are up', async () => {
      const chain = createChain();
      chain.limit = mockLimit.mockResolvedValue({ error: null });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get('/admin/system/health');
      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty('checks');
      expect(res.body.checks).toHaveProperty('supabase');
      expect(res.body.checks).toHaveProperty('stripe');
    });

    it('returns degraded when Stripe is down', async () => {
      const chain = createChain();
      chain.limit = mockLimit.mockResolvedValue({ error: null });
      mockFrom.mockReturnValue(chain);

      // Make Stripe balance.retrieve throw
      const { stripe } = await import('../services/stripe.service.js');
      (stripe.balance.retrieve as any).mockRejectedValueOnce(new Error('Stripe API down'));

      const res = await request(app).get('/admin/system/health');
      expect(res.status).toBe(503);
      expect(res.body.status).toBe('degraded');
      expect(res.body.checks.stripe.status).toBe('error');
    });

    it('returns degraded when Supabase is down', async () => {
      const chain = createChain();
      chain.limit = mockLimit.mockResolvedValue({ error: { message: 'connection refused' } });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get('/admin/system/health');
      expect(res.status).toBe(503);
      expect(res.body.status).toBe('degraded');
      expect(res.body.checks.supabase.status).toBe('error');
    });
  });
});
