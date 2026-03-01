/**
 * Stripe Routes Tests
 * Tests for payment, customer, refund, and subscription endpoints
 */

import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// ── Mocks ──

const mockCustomersCreate = jest.fn<any>();
const mockCustomersGet = jest.fn<any>();
const mockCustomersUpdate = jest.fn<any>();
const mockPaymentIntentsCreate = jest.fn<any>();
const mockPaymentIntentsGet = jest.fn<any>();
const mockPaymentIntentsConfirm = jest.fn<any>();
const mockPaymentIntentsCancel = jest.fn<any>();
const mockRefundsCreateFull = jest.fn<any>();
const mockRefundsCreatePartial = jest.fn<any>();
const mockRefundsGet = jest.fn<any>();
const mockProductsList = jest.fn<any>();
const mockConstructEvent = jest.fn<any>();
const mockPaymentIntentsList = jest.fn<any>();
const mockPaymentIntentsRetrieve = jest.fn<any>();

jest.unstable_mockModule('../services/stripe.service.js', () => ({
  stripeServices: {
    customers: {
      create: mockCustomersCreate,
      get: mockCustomersGet,
      update: mockCustomersUpdate,
    },
    paymentIntents: {
      create: mockPaymentIntentsCreate,
      get: mockPaymentIntentsGet,
      confirm: mockPaymentIntentsConfirm,
      cancel: mockPaymentIntentsCancel,
    },
    refunds: {
      createFull: mockRefundsCreateFull,
      createPartial: mockRefundsCreatePartial,
      get: mockRefundsGet,
    },
    products: {
      list: mockProductsList,
      create: jest.fn<any>(),
      createPrice: jest.fn<any>(),
    },
    connect: {
      createExpressAccount: jest.fn<any>(),
      getAccount: jest.fn<any>(),
      createAccountLink: jest.fn<any>(),
      createLoginLink: jest.fn<any>(),
      getBalance: jest.fn<any>(),
    },
    transfers: { createTransfer: jest.fn<any>() },
    subscriptions: {
      create: jest.fn<any>(),
      get: jest.fn<any>(),
      cancel: jest.fn<any>(),
      pause: jest.fn<any>(),
      resume: jest.fn<any>(),
    },
    paymentMethods: {
      list: jest.fn<any>(),
      attach: jest.fn<any>(),
      detach: jest.fn<any>(),
    },
    setupIntents: { create: jest.fn<any>() },
    checkout: { createSession: jest.fn<any>(), getSession: jest.fn<any>() },
    invoices: {
      create: jest.fn<any>(),
      finalize: jest.fn<any>(),
      pay: jest.fn<any>(),
      void: jest.fn<any>(),
    },
    disputes: {
      list: jest.fn<any>(),
      get: jest.fn<any>(),
      submitEvidence: jest.fn<any>(),
      close: jest.fn<any>(),
    },
    paymentHistory: { list: jest.fn<any>(), get: jest.fn<any>() },
  },
  stripe: {
    webhooks: { constructEvent: mockConstructEvent },
    paymentIntents: { list: mockPaymentIntentsList, retrieve: mockPaymentIntentsRetrieve },
  },
}));

jest.unstable_mockModule('../services/stripe-webhooks.service.js', () => ({
  default: jest.fn<any>().mockResolvedValue(undefined),
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
  paymentLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  sensitiveLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  webhookLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  apiLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

jest.unstable_mockModule('../middleware/auth.middleware.js', () => ({
  authenticate: (req: any, _res: Response, next: NextFunction) => {
    req.user = { id: 'user-123', email: 'test@example.com' };
    next();
  },
  authenticateWithProfile: (req: any, _res: Response, next: NextFunction) => {
    req.user = { id: 'user-123', email: 'test@example.com' };
    req.profile = { id: 'user-123', role: 'patient', stripe_customer_id: 'cus_test' };
    if (mockHasStripeCustomer) {
      req.userProfile = { id: 'user-123', role: 'patient', stripe_customer_id: 'cus_test' };
    }
    next();
  },
  requireRole:
    (..._roles: string[]) =>
    (_req: Request, _res: Response, next: NextFunction) =>
      next(),
  AuthenticatedRequest: {},
}));

jest.unstable_mockModule('../lib/supabase.js', () => ({
  supabase: { from: jest.fn<any>() },
}));

const mockIsWebhookProcessed = jest.fn<any>();
const mockMarkWebhookProcessed = jest.fn<any>();

jest.unstable_mockModule('../utils/webhook-idempotency.js', () => ({
  isWebhookProcessed: mockIsWebhookProcessed,
  markWebhookProcessed: mockMarkWebhookProcessed,
}));

// Mutable flag to conditionally set req.userProfile for payment-history tests
let mockHasStripeCustomer = false;

// ── Dynamic imports ──

const { default: express } = await import('express');
const { default: request } = await import('supertest');
const { default: stripeRouter } = await import('../routes/stripe.routes.js');
const { sendErrorResponse } = await import('../utils/errors.js');

// ── App factory ──

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/stripe', stripeRouter);
  app.use((err: any, req: any, res: any, _next: any) => {
    sendErrorResponse(res, err, req.requestId);
  });
  return app;
}

// ── Tests ──

describe('stripe.routes', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockHasStripeCustomer = false;
  });

  // ────────────── Customer routes ──────────────

  describe('POST /stripe/customers', () => {
    it('creates a Stripe customer', async () => {
      mockCustomersCreate.mockResolvedValue({ id: 'cus_new', email: 'alice@test.com' });

      const res = await request(app)
        .post('/stripe/customers')
        .set('Authorization', 'Bearer token')
        .send({ email: 'alice@test.com', name: 'Alice' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('cus_new');
    });

    it('returns 400 for missing email', async () => {
      const res = await request(app)
        .post('/stripe/customers')
        .set('Authorization', 'Bearer token')
        .send({ name: 'Alice' });

      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid email', async () => {
      const res = await request(app)
        .post('/stripe/customers')
        .set('Authorization', 'Bearer token')
        .send({ email: 'not-email' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /stripe/customers/:customerId', () => {
    it('retrieves a customer', async () => {
      mockCustomersGet.mockResolvedValue({ id: 'cus_123', email: 'test@test.com' });

      const res = await request(app)
        .get('/stripe/customers/cus_123')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('cus_123');
    });

    it('returns error when customer not found', async () => {
      mockCustomersGet.mockRejectedValue(new Error('No such customer'));

      const res = await request(app)
        .get('/stripe/customers/cus_nonexistent')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /stripe/customers/:customerId', () => {
    it('updates a customer', async () => {
      mockCustomersUpdate.mockResolvedValue({ id: 'cus_123', name: 'Updated' });

      const res = await request(app)
        .put('/stripe/customers/cus_123')
        .set('Authorization', 'Bearer token')
        .send({ name: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated');
    });
  });

  // ────────────── Payment Intent routes ──────────────

  describe('POST /stripe/payment-intents', () => {
    it('creates a payment intent', async () => {
      mockPaymentIntentsCreate.mockResolvedValue({
        id: 'pi_123',
        client_secret: 'pi_123_secret',
        amount: 5000,
        currency: 'usd',
        status: 'requires_payment_method',
      });

      const res = await request(app)
        .post('/stripe/payment-intents')
        .set('Authorization', 'Bearer token')
        .send({ amount: 50, currency: 'usd', customerId: 'cus_123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('pi_123');
      expect(res.body.data.amount).toBe(50); // Converted back from cents
      expect(res.body.data.clientSecret).toBe('pi_123_secret');
    });

    it('accepts amount in cents (no conversion needed)', async () => {
      mockPaymentIntentsCreate.mockResolvedValue({
        id: 'pi_x',
        client_secret: 'secret',
        amount: 5000,
        currency: 'usd',
        status: 'created',
      });

      await request(app)
        .post('/stripe/payment-intents')
        .set('Authorization', 'Bearer token')
        .send({ amount: 5000, currency: 'usd', customerId: 'cus_1' });

      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 5000 })
      );
    });

    it('returns 400 for missing amount', async () => {
      const res = await request(app)
        .post('/stripe/payment-intents')
        .set('Authorization', 'Bearer token')
        .send({ currency: 'usd' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /stripe/payment-intents/:id', () => {
    it('retrieves a payment intent', async () => {
      mockPaymentIntentsGet.mockResolvedValue({ id: 'pi_123', amount: 5000 });

      const res = await request(app)
        .get('/stripe/payment-intents/pi_123')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('pi_123');
    });
  });

  describe('POST /stripe/payment-intents/:id/confirm', () => {
    it('confirms a payment intent', async () => {
      mockPaymentIntentsConfirm.mockResolvedValue({ id: 'pi_123', status: 'succeeded' });

      const res = await request(app)
        .post('/stripe/payment-intents/pi_123/confirm')
        .set('Authorization', 'Bearer token')
        .send({ paymentMethodId: 'pm_test' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('succeeded');
    });
  });

  describe('POST /stripe/payment-intents/:id/cancel', () => {
    it('cancels a payment intent', async () => {
      mockPaymentIntentsCancel.mockResolvedValue({ id: 'pi_123', status: 'canceled' });

      const res = await request(app)
        .post('/stripe/payment-intents/pi_123/cancel')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('canceled');
    });
  });

  // ────────────── Refund routes ──────────────

  describe('POST /stripe/refunds', () => {
    it('creates a full refund', async () => {
      mockRefundsCreateFull.mockResolvedValue({
        id: 're_123',
        amount: 5000,
        currency: 'usd',
        status: 'succeeded',
      });

      const res = await request(app)
        .post('/stripe/refunds')
        .set('Authorization', 'Bearer token')
        .send({ paymentIntentId: 'pi_123' });

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('re_123');
      expect(res.body.data.amount).toBe(50); // Converted from cents
    });

    it('creates a partial refund when amount provided', async () => {
      mockRefundsCreatePartial.mockResolvedValue({
        id: 're_partial',
        amount: 2500,
        currency: 'usd',
        status: 'succeeded',
      });

      const res = await request(app)
        .post('/stripe/refunds')
        .set('Authorization', 'Bearer token')
        .send({ paymentIntentId: 'pi_123', amount: 2500 });

      expect(res.status).toBe(200);
      expect(res.body.data.amount).toBe(25); // 2500 cents → $25
      expect(mockRefundsCreatePartial).toHaveBeenCalledWith('pi_123', 2500, undefined);
    });

    it('returns 400 for missing paymentIntentId', async () => {
      const res = await request(app)
        .post('/stripe/refunds')
        .set('Authorization', 'Bearer token')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /stripe/refunds/:id', () => {
    it('retrieves a refund', async () => {
      mockRefundsGet.mockResolvedValue({ id: 're_123', status: 'succeeded' });

      const res = await request(app)
        .get('/stripe/refunds/re_123')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('re_123');
    });
  });

  // ────────────── Product routes ──────────────

  describe('GET /stripe/products', () => {
    it('lists products (public endpoint - DEPRECATED)', async () => {
      const res = await request(app).get('/stripe/products');

      expect(res.status).toBe(410);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('deprecated');
    });
  });

  // ────────────── Webhook ──────────────

  describe('POST /stripe/webhook', () => {
    it('returns 500 when webhook secret not configured', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;

      const res = await request(app)
        .post('/stripe/webhook')
        .set('stripe-signature', 'sig_test')
        .send(Buffer.from('{}'));

      expect(res.status).toBe(500);
    });

    it('processes webhook event successfully when secret is configured', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

      const fakeEvent = { id: 'evt_123', type: 'payment_intent.succeeded', data: {} };
      mockConstructEvent.mockReturnValue(fakeEvent);

      const res = await request(app)
        .post('/stripe/webhook')
        .set('stripe-signature', 'sig_test')
        .send(Buffer.from('{}'));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.received).toBe(true);

      delete process.env.STRIPE_WEBHOOK_SECRET;
    });

    it('skips duplicate webhook events', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

      const fakeEvent = { id: 'evt_dup', type: 'payment_intent.succeeded', data: {} };
      mockConstructEvent.mockReturnValue(fakeEvent);
      mockIsWebhookProcessed.mockResolvedValue(true);

      const res = await request(app)
        .post('/stripe/webhook')
        .set('stripe-signature', 'sig_test')
        .send(Buffer.from('{}'));

      expect(res.status).toBe(200);
      expect(res.body.duplicate).toBe(true);
      expect(mockMarkWebhookProcessed).not.toHaveBeenCalled();

      delete process.env.STRIPE_WEBHOOK_SECRET;
    });
  });

  // ────────────── Payment History ──────────────

  describe('GET /stripe/payment-history', () => {
    it('returns empty payments when no customer ID', async () => {
      const res = await request(app)
        .get('/stripe/payment-history')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data.payments).toEqual([]);
      expect(res.body.data.has_more).toBe(false);
    });

    it('returns payments filtered by status', async () => {
      mockHasStripeCustomer = true;
      mockPaymentIntentsList.mockResolvedValue({
        data: [
          {
            id: 'pi_1',
            amount: 5000,
            currency: 'usd',
            status: 'succeeded',
            description: 'Consultation',
            created: 1700000000,
            latest_charge: null,
            metadata: {},
          },
          {
            id: 'pi_2',
            amount: 3000,
            currency: 'usd',
            status: 'requires_payment_method',
            description: 'Pending',
            created: 1700000100,
            latest_charge: null,
            metadata: {},
          },
        ],
        has_more: false,
      });

      const res = await request(app)
        .get('/stripe/payment-history?status=succeeded')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data.payments).toHaveLength(1);
      expect(res.body.data.payments[0].id).toBe('pi_1');
      expect(res.body.data.payments[0].status).toBe('succeeded');
      expect(res.body.data.payments[0].amount).toBe(50); // 5000/100
    });
  });
});
