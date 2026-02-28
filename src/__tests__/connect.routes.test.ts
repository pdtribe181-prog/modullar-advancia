/**
 * Connect Routes Tests
 * Tests for Stripe Connect account creation and account-link endpoints
 */

import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// ── Mocks ──

const mockFrom = jest.fn<any>();
const mockCreateExpressAccount = jest.fn<any>();
const mockGetAccount = jest.fn<any>();
const mockCreateAccountLink = jest.fn<any>();
const mockCreateLoginLink = jest.fn<any>();
const mockGetBalance = jest.fn<any>();

jest.unstable_mockModule('../services/stripe.service.js', () => ({
  stripeServices: {
    connect: {
      createExpressAccount: mockCreateExpressAccount,
      getAccount: mockGetAccount,
      createAccountLink: mockCreateAccountLink,
      createLoginLink: mockCreateLoginLink,
      getBalance: mockGetBalance,
    },
  },
  stripe: {
    payouts: { list: jest.fn<any>() },
  },
}));

jest.unstable_mockModule('../lib/supabase.js', () => ({
  supabase: { from: mockFrom },
  createServiceClient: () => ({ from: mockFrom }),
}));

jest.unstable_mockModule('../middleware/logging.middleware.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.unstable_mockModule('../middleware/rateLimit.middleware.js', () => ({
  onboardingLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  sensitiveLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  authLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  apiLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'provider@example.com',
  user_metadata: { full_name: 'Dr. Test' },
};

const mockProfile = {
  id: mockUser.id,
  role: 'provider',
  full_name: 'Dr. Test',
};

jest.unstable_mockModule('../middleware/auth.middleware.js', () => ({
  authenticate: (req: any, _res: Response, next: NextFunction) => {
    req.user = mockUser;
    next();
  },
  authenticateWithProfile: (req: any, _res: Response, next: NextFunction) => {
    req.user = mockUser;
    req.userProfile = mockProfile;
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
const { default: connectRouter } = await import('../routes/connect.routes.js');
const { sendErrorResponse } = await import('../utils/errors.js');

// ── Create test app ──

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/connect', connectRouter);
  app.use((err: any, _req: any, res: any, _next: any) => {
    sendErrorResponse(res, err, undefined);
  });
  return app;
}

// ── Helpers ──

function mockSupabaseChain(result: { data: any; error: any }) {
  const chain: any = {};
  chain.select = jest.fn<any>().mockReturnValue(chain);
  chain.insert = jest.fn<any>().mockReturnValue(chain);
  chain.update = jest.fn<any>().mockReturnValue(chain);
  chain.eq = jest.fn<any>().mockReturnValue(chain);
  chain.single = jest.fn<any>().mockResolvedValue(result);
  mockFrom.mockReturnValue(chain);
  return chain;
}

// ── Tests ──

describe('connect.routes', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ────────────── POST /connect/account ──────────────

  describe('POST /connect/account', () => {
    it('creates a new Stripe Connect account', async () => {
      // Provider exists without Stripe account
      mockSupabaseChain({
        data: { id: 'prov-1', stripe_account_id: null, business_name: 'Test Clinic' },
        error: null,
      });

      mockCreateExpressAccount.mockResolvedValue({
        id: 'acct_new123',
        details_submitted: false,
        charges_enabled: false,
        payouts_enabled: false,
      });

      const res = await request(app)
        .post('/connect/account')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accountId).toBe('acct_new123');
      expect(res.body.data.alreadyExists).toBe(false);
    });

    it('returns existing account if already created', async () => {
      mockSupabaseChain({
        data: { id: 'prov-1', stripe_account_id: 'acct_existing', business_name: 'Test Clinic' },
        error: null,
      });

      mockGetAccount.mockResolvedValue({
        id: 'acct_existing',
        details_submitted: true,
        charges_enabled: true,
        payouts_enabled: true,
      });

      const res = await request(app)
        .post('/connect/account')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accountId).toBe('acct_existing');
      expect(res.body.data.alreadyExists).toBe(true);
    });

    it('returns 404 if provider profile not found', async () => {
      mockSupabaseChain({ data: null, error: null });

      const res = await request(app)
        .post('/connect/account')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(404);
    });
  });

  // ────────────── POST /connect/account-link ──────────────

  describe('POST /connect/account-link', () => {
    it('generates an onboarding link', async () => {
      mockSupabaseChain({
        data: { stripe_account_id: 'acct_123' },
        error: null,
      });

      const futureTs = Math.floor(Date.now() / 1000) + 3600;
      mockCreateAccountLink.mockResolvedValue({
        url: 'https://connect.stripe.com/onboarding/acct_123',
        expires_at: futureTs,
      });

      const res = await request(app)
        .post('/connect/account-link')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.url).toContain('stripe.com');
      expect(res.body.data.accountId).toBe('acct_123');
    });

    it('returns 400 if no Stripe account exists', async () => {
      mockSupabaseChain({
        data: { stripe_account_id: null },
        error: null,
      });

      const res = await request(app)
        .post('/connect/account-link')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(400);
    });
  });

  // ────────────── POST /connect/onboard ──────────────

  describe('POST /connect/onboard', () => {
    it('creates account and returns onboarding link', async () => {
      // First call: provider select (no stripe account), second: update
      const selectChain = mockSupabaseChain({
        data: { id: 'prov-1', stripe_account_id: null, stripe_onboarding_complete: false, business_name: 'Clinic' },
        error: null,
      });

      mockCreateExpressAccount.mockResolvedValue({ id: 'acct_onboard' });
      mockCreateAccountLink.mockResolvedValue({
        url: 'https://connect.stripe.com/onboard',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      });

      const res = await request(app)
        .post('/connect/onboard')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.data.accountId).toBe('acct_onboard');
      expect(res.body.data.onboardingUrl).toContain('stripe.com');
    });

    it('uses existing account if present', async () => {
      mockSupabaseChain({
        data: { id: 'prov-1', stripe_account_id: 'acct_existing', stripe_onboarding_complete: false, business_name: 'Clinic' },
        error: null,
      });

      mockCreateAccountLink.mockResolvedValue({
        url: 'https://connect.stripe.com/onboard',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      });

      const res = await request(app)
        .post('/connect/onboard')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.data.accountId).toBe('acct_existing');
      expect(mockCreateExpressAccount).not.toHaveBeenCalled();
    });

    it('returns 404 if provider not found', async () => {
      mockSupabaseChain({ data: null, error: null });

      const res = await request(app)
        .post('/connect/onboard')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(404);
    });
  });

  // ────────────── GET /connect/status ──────────────

  describe('GET /connect/status', () => {
    it('returns not_started when no stripe account', async () => {
      mockSupabaseChain({
        data: { id: 'prov-1', stripe_account_id: null },
        error: null,
      });

      const res = await request(app)
        .get('/connect/status')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('not_started');
    });

    it('returns complete status from Stripe and updates local', async () => {
      // Provider with outdated local status
      const providerData = {
        id: 'prov-1',
        stripe_account_id: 'acct_1',
        stripe_onboarding_complete: false,
        stripe_charges_enabled: false,
        stripe_payouts_enabled: false,
      };
      mockSupabaseChain({ data: providerData, error: null });

      mockGetAccount.mockResolvedValue({
        details_submitted: true,
        charges_enabled: true,
        payouts_enabled: true,
        requirements: null,
      });

      const res = await request(app)
        .get('/connect/status')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('complete');
      expect(res.body.data.chargesEnabled).toBe(true);
    });

    it('returns 404 if provider not found', async () => {
      mockSupabaseChain({ data: null, error: null });

      const res = await request(app)
        .get('/connect/status')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(404);
    });
  });

  // ────────────── POST /connect/refresh ──────────────

  describe('POST /connect/refresh', () => {
    it('returns new onboarding link', async () => {
      mockSupabaseChain({ data: { stripe_account_id: 'acct_1' }, error: null });

      mockCreateAccountLink.mockResolvedValue({
        url: 'https://connect.stripe.com/refresh',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      });

      const res = await request(app)
        .post('/connect/refresh')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.data.onboardingUrl).toContain('stripe.com');
    });

    it('returns 400 when no stripe account', async () => {
      mockSupabaseChain({ data: { stripe_account_id: null }, error: null });

      const res = await request(app)
        .post('/connect/refresh')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(400);
    });
  });

  // ────────────── GET /connect/dashboard ──────────────

  describe('GET /connect/dashboard', () => {
    it('returns dashboard link for completed onboarding', async () => {
      mockSupabaseChain({
        data: { stripe_account_id: 'acct_1', stripe_onboarding_complete: true },
        error: null,
      });

      mockCreateLoginLink.mockResolvedValue({ url: 'https://dashboard.stripe.com/xxx' });

      const res = await request(app)
        .get('/connect/dashboard')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.data.dashboardUrl).toContain('stripe.com');
    });

    it('returns 400 if onboarding not complete', async () => {
      mockSupabaseChain({
        data: { stripe_account_id: 'acct_1', stripe_onboarding_complete: false },
        error: null,
      });

      const res = await request(app)
        .get('/connect/dashboard')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(400);
    });

    it('returns 400 if no stripe account', async () => {
      mockSupabaseChain({
        data: { stripe_account_id: null },
        error: null,
      });

      const res = await request(app)
        .get('/connect/dashboard')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(400);
    });
  });

  // ────────────── GET /connect/balance ──────────────

  describe('GET /connect/balance', () => {
    it('returns formatted balance', async () => {
      mockSupabaseChain({ data: { stripe_account_id: 'acct_1' }, error: null });

      mockGetBalance.mockResolvedValue({
        available: [{ amount: 10000, currency: 'usd' }],
        pending: [{ amount: 5000, currency: 'usd' }],
      });

      const res = await request(app)
        .get('/connect/balance')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.data.available[0].amount).toBe(100);
      expect(res.body.data.pending[0].amount).toBe(50);
    });

    it('returns 400 if no stripe account', async () => {
      mockSupabaseChain({ data: { stripe_account_id: null }, error: null });

      const res = await request(app)
        .get('/connect/balance')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(400);
    });
  });

  // ────────────── GET /connect/payouts ──────────────

  describe('GET /connect/payouts', () => {
    it('returns formatted payouts', async () => {
      mockSupabaseChain({ data: { stripe_account_id: 'acct_1' }, error: null });

      const { stripe } = await import('../services/stripe.service.js');
      (stripe.payouts.list as jest.Mock<any>).mockResolvedValue({
        data: [{
          id: 'po_1',
          amount: 25000,
          currency: 'usd',
          status: 'paid',
          arrival_date: Math.floor(Date.now() / 1000),
          created: Math.floor(Date.now() / 1000),
        }],
      });

      const res = await request(app)
        .get('/connect/payouts')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.data[0].id).toBe('po_1');
      expect(res.body.data[0].amount).toBe(250);
    });

    it('returns 400 if no stripe account', async () => {
      mockSupabaseChain({ data: { stripe_account_id: null }, error: null });

      const res = await request(app)
        .get('/connect/payouts')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(400);
    });
  });

  // ────────────── handleConnectWebhook ──────────────

  describe('handleConnectWebhook', () => {
    it('updates provider on account.updated event', async () => {
      // select: find provider by stripe_account_id, then update
      const selectChain = mockSupabaseChain({ data: { id: 'prov-1' }, error: null });

      const { handleConnectWebhook } = await import('../routes/connect.routes.js');

      await handleConnectWebhook({
        type: 'account.updated',
        data: {
          object: {
            id: 'acct_1',
            details_submitted: true,
            charges_enabled: true,
            payouts_enabled: true,
          },
        },
      } as any);

      expect(mockFrom).toHaveBeenCalledWith('providers');
    });

    it('does nothing if provider not found for account', async () => {
      mockSupabaseChain({ data: null, error: null });

      const { handleConnectWebhook } = await import('../routes/connect.routes.js');

      await handleConnectWebhook({
        type: 'account.updated',
        data: { object: { id: 'acct_unknown' } },
      } as any);

      // Only select call, no update
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });
  });
});
