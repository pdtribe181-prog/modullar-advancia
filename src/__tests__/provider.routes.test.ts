/**
 * Provider Routes Tests
 * Tests for GET /provider list endpoint and provider dashboard routes
 */

import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// ── Mocks ──

const mockFrom = jest.fn<any>();

jest.unstable_mockModule('../lib/supabase.js', () => ({
  supabase: { from: mockFrom },
  createServiceClient: () => ({ from: mockFrom }),
}));

jest.unstable_mockModule('../services/stripe.service.js', () => ({
  stripeServices: {
    connect: {
      getBalance: jest.fn<any>(),
    },
    refunds: {
      createFull: jest.fn<any>(),
    },
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

jest.unstable_mockModule('../middleware/cache.middleware.js', () => ({
  cacheResponse: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  invalidateCache: jest.fn<any>(),
  invalidateResource: jest.fn<any>(),
}));

jest.unstable_mockModule('../middleware/rateLimit.middleware.js', () => ({
  authLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  apiLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  sensitiveLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  onboardingLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'admin@example.com',
  user_metadata: { full_name: 'Admin User' },
};

jest.unstable_mockModule('../middleware/auth.middleware.js', () => ({
  authenticate: (req: any, _res: Response, next: NextFunction) => {
    req.user = mockUser;
    next();
  },
  authenticateWithProfile: (req: any, _res: Response, next: NextFunction) => {
    req.user = mockUser;
    req.userProfile = { id: mockUser.id, role: 'admin' };
    next();
  },
  requireRole:
    (..._roles: string[]) =>
    (_req: Request, _res: Response, next: NextFunction) =>
      next(),
  AuthenticatedRequest: {},
}));

// ── Dynamic imports ──

const { default: express } = await import('express');
const { default: request } = await import('supertest');
const { default: providerRouter } = await import('../routes/provider.routes.js');
const { sendErrorResponse } = await import('../utils/errors.js');

// ── Create test app ──

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/provider', providerRouter);
  app.use((err: any, _req: any, res: any, _next: any) => {
    sendErrorResponse(res, err, undefined);
  });
  return app;
}

// ── Tests ──

describe('provider.routes', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ────────────── GET /provider (list) ──────────────

  describe('GET /provider', () => {
    it('returns paginated list of providers', async () => {
      const providers = [
        { id: 'p1', business_name: 'Alpha Clinic', specialty: 'Cardiology', status: 'active' },
        { id: 'p2', business_name: 'Beta Health', specialty: 'Dermatology', status: 'active' },
      ];

      // Mock for caller role lookup
      const roleChain: any = {};
      roleChain.select = jest.fn<any>().mockReturnValue(roleChain);
      roleChain.eq = jest.fn<any>().mockReturnValue(roleChain);
      roleChain.single = jest.fn<any>().mockResolvedValue({ data: { role: 'admin' }, error: null });

      // Mock for provider list query
      const listChain: any = {};
      listChain.select = jest.fn<any>().mockReturnValue(listChain);
      listChain.eq = jest.fn<any>().mockReturnValue(listChain);
      listChain.ilike = jest.fn<any>().mockReturnValue(listChain);
      listChain.or = jest.fn<any>().mockReturnValue(listChain);
      listChain.order = jest.fn<any>().mockReturnValue(listChain);
      listChain.range = jest.fn<any>().mockResolvedValue({
        data: providers,
        error: null,
        count: 2,
      });

      mockFrom
        .mockReturnValueOnce(roleChain) // user_profiles lookup
        .mockReturnValueOnce(listChain); // providers query

      const res = await request(app).get('/provider').set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.providers).toHaveLength(2);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.total).toBe(2);
    });

    it('supports pagination parameters', async () => {
      const roleChain: any = {};
      roleChain.select = jest.fn<any>().mockReturnValue(roleChain);
      roleChain.eq = jest.fn<any>().mockReturnValue(roleChain);
      roleChain.single = jest
        .fn<any>()
        .mockResolvedValue({ data: { role: 'patient' }, error: null });

      const listChain: any = {};
      listChain.select = jest.fn<any>().mockReturnValue(listChain);
      listChain.eq = jest.fn<any>().mockReturnValue(listChain);
      listChain.ilike = jest.fn<any>().mockReturnValue(listChain);
      listChain.or = jest.fn<any>().mockReturnValue(listChain);
      listChain.order = jest.fn<any>().mockReturnValue(listChain);
      listChain.range = jest.fn<any>().mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      });

      mockFrom.mockReturnValueOnce(roleChain).mockReturnValueOnce(listChain);

      const res = await request(app)
        .get('/provider?page=2&limit=5')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.data.pagination.page).toBe(2);
      expect(res.body.data.pagination.limit).toBe(5);
    });

    it('returns 500 on database error', async () => {
      const roleChain: any = {};
      roleChain.select = jest.fn<any>().mockReturnValue(roleChain);
      roleChain.eq = jest.fn<any>().mockReturnValue(roleChain);
      roleChain.single = jest.fn<any>().mockResolvedValue({ data: { role: 'admin' }, error: null });

      const listChain: any = {};
      listChain.select = jest.fn<any>().mockReturnValue(listChain);
      listChain.eq = jest.fn<any>().mockReturnValue(listChain);
      listChain.order = jest.fn<any>().mockReturnValue(listChain);
      listChain.range = jest.fn<any>().mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
        count: null,
      });

      mockFrom.mockReturnValueOnce(roleChain).mockReturnValueOnce(listChain);

      const res = await request(app).get('/provider').set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(500);
    });
  });

  // ────────────── GET /provider/me ──────────────

  describe('GET /provider/me', () => {
    it('returns provider profile', async () => {
      const provider = {
        id: 'prov-1',
        user_id: mockUser.id,
        business_name: 'Test Clinic',
        specialty: 'General',
      };

      const chain: any = {};
      chain.select = jest.fn<any>().mockReturnValue(chain);
      chain.eq = jest.fn<any>().mockReturnValue(chain);
      chain.single = jest.fn<any>().mockResolvedValue({ data: provider, error: null });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get('/provider/me').set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.provider.business_name).toBe('Test Clinic');
    });

    it('returns 404 if no provider profile', async () => {
      const chain: any = {};
      chain.select = jest.fn<any>().mockReturnValue(chain);
      chain.eq = jest.fn<any>().mockReturnValue(chain);
      chain.single = jest.fn<any>().mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get('/provider/me').set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(404);
    });
  });

  // ────────────── GET /provider?specialty=... ──────────────

  describe('GET /provider with filters', () => {
    function makeRoleChain(role = 'patient') {
      const c: any = {};
      c.select = jest.fn<any>().mockReturnValue(c);
      c.eq = jest.fn<any>().mockReturnValue(c);
      c.single = jest.fn<any>().mockResolvedValue({ data: { role }, error: null });
      return c;
    }

    function makeListChain() {
      const c: any = {};
      c.select = jest.fn<any>().mockReturnValue(c);
      c.eq = jest.fn<any>().mockReturnValue(c);
      c.ilike = jest.fn<any>().mockReturnValue(c);
      c.or = jest.fn<any>().mockReturnValue(c);
      c.order = jest.fn<any>().mockReturnValue(c);
      c.range = jest.fn<any>().mockResolvedValue({ data: [], error: null, count: 0 });
      return c;
    }

    it('filters by specialty', async () => {
      const roleChain = makeRoleChain('admin');
      const listChain = makeListChain();
      mockFrom.mockReturnValueOnce(roleChain).mockReturnValueOnce(listChain);

      const res = await request(app)
        .get('/provider?specialty=Cardiology')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(listChain.ilike).toHaveBeenCalledWith('specialty', '%Cardiology%');
    });

    it('filters by search term', async () => {
      const roleChain = makeRoleChain('admin');
      const listChain = makeListChain();
      mockFrom.mockReturnValueOnce(roleChain).mockReturnValueOnce(listChain);

      const res = await request(app)
        .get('/provider?search=Alpha')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(listChain.or).toHaveBeenCalled();
    });
  });

  // ────────────── GET /provider/appointments filters ──────────────

  describe('GET /provider/appointments', () => {
    function providerChain() {
      const c: any = {};
      c.select = jest.fn<any>().mockReturnValue(c);
      c.eq = jest.fn<any>().mockReturnValue(c);
      c.single = jest.fn<any>().mockResolvedValue({ data: { id: 'prov-1' }, error: null });
      return c;
    }

    function aptsChain() {
      const c: any = {};
      c.select = jest.fn<any>().mockReturnValue(c);
      c.eq = jest.fn<any>().mockReturnValue(c);
      c.gte = jest.fn<any>().mockReturnValue(c);
      c.order = jest.fn<any>().mockReturnValue(c);
      c.then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve);
      Object.defineProperty(c, 'then', { value: c.then, enumerable: false, configurable: true });
      return c;
    }

    it('filters appointments by status', async () => {
      const pc = providerChain();
      const ac = aptsChain();
      mockFrom.mockReturnValueOnce(pc).mockReturnValueOnce(ac);

      const res = await request(app)
        .get('/provider/appointments?status=scheduled')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
    });

    it('filters appointments by date', async () => {
      const pc = providerChain();
      const ac = aptsChain();
      mockFrom.mockReturnValueOnce(pc).mockReturnValueOnce(ac);

      const res = await request(app)
        .get('/provider/appointments?date=2026-03-01')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
    });

    it('filters upcoming appointments', async () => {
      const pc = providerChain();
      const ac = aptsChain();
      mockFrom.mockReturnValueOnce(pc).mockReturnValueOnce(ac);

      const res = await request(app)
        .get('/provider/appointments?upcoming=true')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
    });
  });

  // ────────────── Appointment Actions ──────────────

  describe('POST /provider/appointments/:id/confirm', () => {
    it('returns 404 when confirm fails (error or no appointment)', async () => {
      // Provider found, but update returns error
      const provChain: any = {};
      provChain.select = jest.fn<any>().mockReturnValue(provChain);
      provChain.eq = jest.fn<any>().mockReturnValue(provChain);
      provChain.single = jest.fn<any>().mockResolvedValue({ data: { id: 'prov-1' }, error: null });

      const updateChain: any = {};
      updateChain.update = jest.fn<any>().mockReturnValue(updateChain);
      updateChain.eq = jest.fn<any>().mockReturnValue(updateChain);
      updateChain.select = jest.fn<any>().mockReturnValue(updateChain);
      updateChain.single = jest
        .fn<any>()
        .mockResolvedValue({ data: null, error: { message: 'update failed' } });

      mockFrom.mockReturnValueOnce(provChain).mockReturnValueOnce(updateChain);

      const res = await request(app)
        .post('/provider/appointments/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/confirm')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /provider/appointments/:id/complete', () => {
    it('returns 404 when complete fails (error or no appointment)', async () => {
      const provChain: any = {};
      provChain.select = jest.fn<any>().mockReturnValue(provChain);
      provChain.eq = jest.fn<any>().mockReturnValue(provChain);
      provChain.single = jest.fn<any>().mockResolvedValue({ data: { id: 'prov-1' }, error: null });

      const updateChain: any = {};
      updateChain.update = jest.fn<any>().mockReturnValue(updateChain);
      updateChain.eq = jest.fn<any>().mockReturnValue(updateChain);
      updateChain.in = jest.fn<any>().mockReturnValue(updateChain);
      updateChain.select = jest.fn<any>().mockReturnValue(updateChain);
      updateChain.single = jest
        .fn<any>()
        .mockResolvedValue({ data: null, error: { message: 'update failed' } });

      mockFrom.mockReturnValueOnce(provChain).mockReturnValueOnce(updateChain);

      const res = await request(app)
        .post('/provider/appointments/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/complete')
        .set('Authorization', 'Bearer test-token')
        .send({});

      expect(res.status).toBe(404);
    });
  });

  describe('POST /provider/appointments/:id/cancel', () => {
    it('returns 404 when provider not found', async () => {
      const provChain: any = {};
      provChain.select = jest.fn<any>().mockReturnValue(provChain);
      provChain.eq = jest.fn<any>().mockReturnValue(provChain);
      provChain.single = jest.fn<any>().mockResolvedValue({ data: null, error: null });

      mockFrom.mockReturnValueOnce(provChain);

      const res = await request(app)
        .post('/provider/appointments/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/cancel')
        .set('Authorization', 'Bearer test-token')
        .send({ reason: 'schedule conflict' });

      expect(res.status).toBe(404);
    });

    it('returns 404 when appointment not found', async () => {
      const provChain: any = {};
      provChain.select = jest.fn<any>().mockReturnValue(provChain);
      provChain.eq = jest.fn<any>().mockReturnValue(provChain);
      provChain.single = jest.fn<any>().mockResolvedValue({ data: { id: 'prov-1' }, error: null });

      const aptChain: any = {};
      aptChain.select = jest.fn<any>().mockReturnValue(aptChain);
      aptChain.eq = jest.fn<any>().mockReturnValue(aptChain);
      aptChain.single = jest
        .fn<any>()
        .mockResolvedValue({ data: null, error: { message: 'not found' } });

      mockFrom.mockReturnValueOnce(provChain).mockReturnValueOnce(aptChain);

      const res = await request(app)
        .post('/provider/appointments/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/cancel')
        .set('Authorization', 'Bearer test-token')
        .send({ reason: 'schedule conflict' });

      expect(res.status).toBe(404);
    });
  });

  // ────────────── GET /provider/earnings ──────────────

  describe('GET /provider/earnings', () => {
    it('returns 404 when provider not found', async () => {
      const provChain: any = {};
      provChain.select = jest.fn<any>().mockReturnValue(provChain);
      provChain.eq = jest.fn<any>().mockReturnValue(provChain);
      provChain.single = jest.fn<any>().mockResolvedValue({ data: null, error: null });

      mockFrom.mockReturnValueOnce(provChain);

      const res = await request(app)
        .get('/provider/earnings?period=30')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(404);
    });

    it('includes Stripe balance when provider has stripe_account_id', async () => {
      // Provider with stripe_account_id
      const provChain: any = {};
      provChain.select = jest.fn<any>().mockReturnValue(provChain);
      provChain.eq = jest.fn<any>().mockReturnValue(provChain);
      provChain.single = jest.fn<any>().mockResolvedValue({
        data: { id: 'prov-1', stripe_account_id: 'acct_test123' },
        error: null,
      });

      // Appointments chain
      const aptsChain: any = {};
      aptsChain.select = jest.fn<any>().mockReturnValue(aptsChain);
      aptsChain.eq = jest.fn<any>().mockReturnValue(aptsChain);
      aptsChain.gte = jest.fn<any>().mockReturnValue(aptsChain);
      aptsChain.lte = jest.fn<any>().mockResolvedValue({ data: [], error: null });

      // Provider consultation_fee chain
      const feeChain: any = {};
      feeChain.select = jest.fn<any>().mockReturnValue(feeChain);
      feeChain.eq = jest.fn<any>().mockReturnValue(feeChain);
      feeChain.single = jest.fn<any>().mockResolvedValue({
        data: { consultation_fee: 150 },
        error: null,
      });

      mockFrom
        .mockReturnValueOnce(provChain) // providers lookup
        .mockReturnValueOnce(aptsChain) // appointments query
        .mockReturnValueOnce(feeChain); // consultation_fee query

      // Mock Stripe balance
      const { stripeServices } = await import('../services/stripe.service.js');
      (stripeServices.connect.getBalance as any).mockResolvedValueOnce({
        available: [{ amount: 50000, currency: 'usd' }],
        pending: [{ amount: 10000, currency: 'usd' }],
      });

      const res = await request(app)
        .get('/provider/earnings?period=30')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.data.stripeBalance).toBeDefined();
      expect(res.body.data.stripeBalance.available).toBe(500);
      expect(res.body.data.stripeBalance.pending).toBe(100);
      expect(res.body.data.stripeBalance.currency).toBe('usd');
    });
  });

  // ────────────── Appointment enrichment ──────────────

  describe('GET /provider/appointments (enrichment)', () => {
    it('returns appointment unchanged when patient has no user_id', async () => {
      // Provider chain
      const pc: any = {};
      pc.select = jest.fn<any>().mockReturnValue(pc);
      pc.eq = jest.fn<any>().mockReturnValue(pc);
      pc.single = jest.fn<any>().mockResolvedValue({ data: { id: 'prov-1' }, error: null });

      // Appointments chain — return appointment with patient that has NO user_id
      const ac: any = {};
      ac.select = jest.fn<any>().mockReturnValue(ac);
      ac.eq = jest.fn<any>().mockReturnValue(ac);
      ac.gte = jest.fn<any>().mockReturnValue(ac);
      ac.order = jest.fn<any>().mockReturnValue(ac);
      ac.then = (resolve: any) =>
        Promise.resolve({
          data: [
            {
              id: 'apt-1',
              status: 'scheduled',
              patient: { id: 'pat-1', user_id: null },
            },
          ],
          error: null,
        }).then(resolve);
      Object.defineProperty(ac, 'then', { value: ac.then, enumerable: false, configurable: true });

      mockFrom.mockReturnValueOnce(pc).mockReturnValueOnce(ac);

      const res = await request(app)
        .get('/provider/appointments')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.data.appointments).toHaveLength(1);
      // Patient returned as-is, no enrichment with name/email
      expect(res.body.data.appointments[0].patient).toEqual({ id: 'pat-1', user_id: null });
    });
  });
});
