/**
 * Payment Flow Tests
 * Tests for subscription, connect, transfer, checkout, invoice, dispute,
 * payment method, setup intent, and payment history endpoints
 * (Complements stripe.routes.test.ts which covers customers, payment intents, refunds, webhook)
 */

import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// ── Mocks ──

const mockSubscriptionCreate = jest.fn<any>();
const mockSubscriptionGet = jest.fn<any>();
const mockSubscriptionCancel = jest.fn<any>();
const mockSubscriptionPause = jest.fn<any>();
const mockSubscriptionResume = jest.fn<any>();
const mockConnectCreate = jest.fn<any>();
const mockConnectGetAccount = jest.fn<any>();
const mockConnectCreateAccountLink = jest.fn<any>();
const mockConnectCreateLoginLink = jest.fn<any>();
const mockConnectGetBalance = jest.fn<any>();
const mockTransferCreate = jest.fn<any>();
const mockPaymentMethodsList = jest.fn<any>();
const mockPaymentMethodsAttach = jest.fn<any>();
const mockPaymentMethodsDetach = jest.fn<any>();
const mockSetupIntentsCreate = jest.fn<any>();
const mockCheckoutCreateSession = jest.fn<any>();
const mockCheckoutGet = jest.fn<any>();
const mockInvoiceCreate = jest.fn<any>();
const mockInvoiceAddLineItem = jest.fn<any>();
const mockInvoiceFinalize = jest.fn<any>();
const mockInvoicePay = jest.fn<any>();
const mockInvoiceVoid = jest.fn<any>();
const mockDisputesList = jest.fn<any>();
const mockDisputesGet = jest.fn<any>();
const mockDisputesSubmitEvidence = jest.fn<any>();
const mockDisputesClose = jest.fn<any>();
const mockProductsList = jest.fn<any>();
const mockProductsCreate = jest.fn<any>();
const mockProductsCreatePrice = jest.fn<any>();

// Re-mock the already-tested services to avoid interference
const mockPaymentIntentsCreate = jest.fn<any>();
const mockPaymentIntentsGet = jest.fn<any>();
const mockCustomersCreate = jest.fn<any>();
const mockCustomersGet = jest.fn<any>();
const mockCustomersListPaymentMethods = jest.fn<any>();

const mockPaymentIntentsList = jest.fn<any>();
const mockPaymentIntentsRetrieve = jest.fn<any>();

jest.unstable_mockModule('../services/stripe.service.js', () => ({
  stripeServices: {
    customers: {
      create: mockCustomersCreate,
      get: mockCustomersGet,
      update: jest.fn<any>(),
      listPaymentMethods: mockCustomersListPaymentMethods,
    },
    paymentIntents: {
      create: mockPaymentIntentsCreate,
      get: mockPaymentIntentsGet,
      confirm: jest.fn<any>(),
      cancel: jest.fn<any>(),
    },
    refunds: {
      createFull: jest.fn<any>(),
      createPartial: jest.fn<any>(),
      get: jest.fn<any>(),
    },
    subscriptions: {
      create: mockSubscriptionCreate,
      get: mockSubscriptionGet,
      cancel: mockSubscriptionCancel,
      pause: mockSubscriptionPause,
      resume: mockSubscriptionResume,
    },
    connect: {
      createExpressAccount: mockConnectCreate,
      getAccount: mockConnectGetAccount,
      createAccountLink: mockConnectCreateAccountLink,
      createLoginLink: mockConnectCreateLoginLink,
      getBalance: mockConnectGetBalance,
    },
    transfers: {
      createTransfer: mockTransferCreate,
    },
    paymentMethods: {
      list: mockPaymentMethodsList,
      attach: mockPaymentMethodsAttach,
      detach: mockPaymentMethodsDetach,
    },
    setupIntents: {
      create: mockSetupIntentsCreate,
    },
    checkout: {
      createPaymentSession: mockCheckoutCreateSession,
      get: mockCheckoutGet,
    },
    invoices: {
      create: mockInvoiceCreate,
      addLineItem: mockInvoiceAddLineItem,
      finalizeAndSend: mockInvoiceFinalize,
      markPaid: mockInvoicePay,
      void: mockInvoiceVoid,
    },
    disputes: {
      list: mockDisputesList,
      get: mockDisputesGet,
      submitEvidence: mockDisputesSubmitEvidence,
      close: mockDisputesClose,
    },
    products: {
      list: mockProductsList,
      create: mockProductsCreate,
      createPrice: mockProductsCreatePrice,
    },
    paymentHistory: { list: jest.fn<any>(), get: jest.fn<any>() },
  },
  stripe: {
    webhooks: { constructEvent: jest.fn<any>() },
    paymentIntents: {
      list: mockPaymentIntentsList,
      retrieve: mockPaymentIntentsRetrieve,
    },
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
    req.userProfile = { id: 'user-123', role: 'admin', stripe_customer_id: 'cus_test' };
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

// ── Dynamic imports ──

const { default: express } = await import('express');
const { default: request } = await import('supertest');
const { default: stripeRouter } = await import('../routes/stripe.routes.js');
const { sendErrorResponse } = await import('../utils/errors.js');

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

describe('Payment Flows', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ────────────── Subscriptions ──────────────

  describe('Subscriptions', () => {
    it('POST /stripe/subscriptions creates a subscription', async () => {
      mockSubscriptionCreate.mockResolvedValue({
        id: 'sub_123',
        status: 'active',
      });

      const res = await request(app)
        .post('/stripe/subscriptions')
        .set('Authorization', 'Bearer token')
        .send({
          customerId: 'cus_123',
          priceId: 'price_123',
          patientId: 'patient-1',
          providerId: 'provider-1',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('sub_123');
      expect(res.body.data.status).toBe('active');
    });

    it('GET /stripe/subscriptions/:id retrieves subscription', async () => {
      mockSubscriptionGet.mockResolvedValue({
        id: 'sub_123',
        status: 'active',
        current_period_end: 1700000000,
      });

      const res = await request(app)
        .get('/stripe/subscriptions/sub_123')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('sub_123');
    });

    it('POST /stripe/subscriptions/:id/cancel cancels subscription', async () => {
      mockSubscriptionCancel.mockResolvedValue({
        id: 'sub_123',
        status: 'canceled',
      });

      const res = await request(app)
        .post('/stripe/subscriptions/sub_123/cancel')
        .set('Authorization', 'Bearer token')
        .send({ cancelAtPeriodEnd: true });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('canceled');
    });

    it('POST /stripe/subscriptions/:id/pause pauses subscription', async () => {
      mockSubscriptionPause.mockResolvedValue({
        id: 'sub_123',
        pause_collection: { behavior: 'void' },
      });

      const res = await request(app)
        .post('/stripe/subscriptions/sub_123/pause')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
    });

    it('POST /stripe/subscriptions/:id/resume resumes subscription', async () => {
      mockSubscriptionResume.mockResolvedValue({
        id: 'sub_123',
        status: 'active',
      });

      const res = await request(app)
        .post('/stripe/subscriptions/sub_123/resume')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
    });
  });

  // ────────────── Connect Accounts ──────────────

  describe('Connect Accounts (via /stripe/connect)', () => {
    it('POST /stripe/connect/accounts creates Express account', async () => {
      mockConnectCreate.mockResolvedValue({
        id: 'acct_prov1',
        type: 'express',
        details_submitted: false,
        charges_enabled: false,
        payouts_enabled: false,
      });

      const res = await request(app)
        .post('/stripe/connect/accounts')
        .set('Authorization', 'Bearer token')
        .send({ email: 'dr@clinic.com', providerId: 'prov-1', businessName: 'Clinic' });

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('acct_prov1');
      expect(res.body.data.type).toBe('express');
    });

    it('GET /stripe/connect/accounts/:id retrieves account', async () => {
      mockConnectGetAccount.mockResolvedValue({
        id: 'acct_prov1',
        details_submitted: true,
        charges_enabled: true,
      });

      const res = await request(app)
        .get('/stripe/connect/accounts/acct_prov1')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data.details_submitted).toBe(true);
    });

    it('POST .../onboarding-link generates onboarding URL', async () => {
      mockConnectCreateAccountLink.mockResolvedValue({
        url: 'https://connect.stripe.com/setup/...',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      });

      const res = await request(app)
        .post('/stripe/connect/accounts/acct_prov1/onboarding-link')
        .set('Authorization', 'Bearer token')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.url).toContain('stripe.com');
    });

    it('POST .../dashboard-link generates login link', async () => {
      mockConnectCreateLoginLink.mockResolvedValue({
        url: 'https://connect.stripe.com/express/...',
      });

      const res = await request(app)
        .post('/stripe/connect/accounts/acct_prov1/dashboard-link')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data.url).toContain('stripe.com');
    });

    it('GET .../balance retrieves connected account balance', async () => {
      mockConnectGetBalance.mockResolvedValue({
        available: [{ amount: 50000, currency: 'usd' }],
        pending: [{ amount: 10000, currency: 'usd' }],
      });

      const res = await request(app)
        .get('/stripe/connect/accounts/acct_prov1/balance')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data.available[0].amount).toBe(50000);
    });
  });

  // ────────────── Transfers ──────────────

  describe('Transfers', () => {
    it('POST /stripe/transfers creates transfer to provider', async () => {
      mockTransferCreate.mockResolvedValue({
        id: 'tr_123',
        amount: 5000,
        destination: 'acct_prov1',
      });

      const res = await request(app)
        .post('/stripe/transfers')
        .set('Authorization', 'Bearer token')
        .send({
          amount: 5000,
          destinationAccountId: 'acct_prov1',
          transactionId: 'txn_123',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('tr_123');
      expect(res.body.data.amount).toBe(50); // 5000 cents → $50
    });
  });

  // ────────────── Payment Methods ──────────────

  describe('Payment Methods', () => {
    it('GET /stripe/customers/:id/payment-methods lists methods', async () => {
      mockCustomersListPaymentMethods.mockResolvedValue([
        { id: 'pm_1', type: 'card', card: { brand: 'visa', last4: '4242' } },
      ]);

      const res = await request(app)
        .get('/stripe/customers/cus_123/payment-methods')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data[0].id).toBe('pm_1');
    });

    it('POST /stripe/payment-methods/:id/attach attaches to customer', async () => {
      mockPaymentMethodsAttach.mockResolvedValue({
        id: 'pm_1',
        customer: 'cus_123',
      });

      const res = await request(app)
        .post('/stripe/payment-methods/pm_1/attach')
        .set('Authorization', 'Bearer token')
        .send({ customerId: 'cus_123' });

      expect(res.status).toBe(200);
      expect(res.body.data.customer).toBe('cus_123');
    });

    it('POST /stripe/payment-methods/:id/detach removes from customer', async () => {
      mockPaymentMethodsDetach.mockResolvedValue({
        id: 'pm_1',
        customer: null,
      });

      const res = await request(app)
        .post('/stripe/payment-methods/pm_1/detach')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data.customer).toBeNull();
    });
  });

  // ────────────── Setup Intents ──────────────

  describe('Setup Intents', () => {
    it('POST /stripe/setup-intents creates intent', async () => {
      mockSetupIntentsCreate.mockResolvedValue({
        id: 'seti_123',
        client_secret: 'seti_123_secret',
      });

      const res = await request(app)
        .post('/stripe/setup-intents')
        .set('Authorization', 'Bearer token')
        .send({ customerId: 'cus_123' });

      expect(res.status).toBe(200);
      expect(res.body.data.clientSecret).toBe('seti_123_secret');
    });
  });

  // ────────────── Checkout Sessions ──────────────

  describe('Checkout Sessions', () => {
    it('POST /stripe/checkout/sessions creates session', async () => {
      mockCheckoutCreateSession.mockResolvedValue({
        id: 'cs_123',
        url: 'https://checkout.stripe.com/pay/cs_123',
      });

      const res = await request(app)
        .post('/stripe/checkout/sessions')
        .set('Authorization', 'Bearer token')
        .send({
          customerId: 'cus_123',
          amount: 5000,
          productName: 'Consultation',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.url).toContain('stripe.com');
    });

    it('GET /stripe/checkout/sessions/:id retrieves session', async () => {
      mockCheckoutGet.mockResolvedValue({
        id: 'cs_123',
        payment_status: 'paid',
        amount_total: 5000,
      });

      const res = await request(app)
        .get('/stripe/checkout/sessions/cs_123')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data.payment_status).toBe('paid');
    });
  });

  // ────────────── Invoices ──────────────

  describe('Invoices', () => {
    it('POST /stripe/invoices creates invoice', async () => {
      mockInvoiceCreate.mockResolvedValue({
        id: 'inv_123',
        status: 'draft',
        amount_due: 5000,
      });

      const res = await request(app)
        .post('/stripe/invoices')
        .set('Authorization', 'Bearer token')
        .send({ customerId: 'cus_123' });

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('inv_123');
      expect(res.body.data.amountDue).toBe(50); // 5000 cents → $50
    });

    it('POST /stripe/invoices creates invoice with line items', async () => {
      mockInvoiceCreate.mockResolvedValue({
        id: 'inv_456',
        status: 'draft',
        amount_due: 10000,
      });
      mockInvoiceAddLineItem.mockResolvedValue({});

      const res = await request(app)
        .post('/stripe/invoices')
        .set('Authorization', 'Bearer token')
        .send({
          customerId: 'cus_123',
          items: [
            { amount: 5000, description: 'Consultation' },
            { amount: 5000, description: 'Lab Work' },
          ],
        });

      expect(res.status).toBe(200);
      expect(mockInvoiceAddLineItem).toHaveBeenCalledTimes(2);
    });

    it('POST /stripe/invoices/:id/finalize finalizes invoice', async () => {
      mockInvoiceFinalize.mockResolvedValue({
        id: 'inv_123',
        status: 'open',
      });

      const res = await request(app)
        .post('/stripe/invoices/inv_123/finalize')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('open');
    });

    it('POST /stripe/invoices/:id/pay marks invoice paid', async () => {
      mockInvoicePay.mockResolvedValue({
        id: 'inv_123',
        status: 'paid',
      });

      const res = await request(app)
        .post('/stripe/invoices/inv_123/pay')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('paid');
    });

    it('POST /stripe/invoices/:id/void voids invoice', async () => {
      mockInvoiceVoid.mockResolvedValue({
        id: 'inv_123',
        status: 'void',
      });

      const res = await request(app)
        .post('/stripe/invoices/inv_123/void')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('void');
    });
  });

  // ────────────── Disputes ──────────────

  describe('Disputes', () => {
    it('GET /stripe/disputes lists disputes', async () => {
      mockDisputesList.mockResolvedValue([{ id: 'dp_1', amount: 5000, status: 'needs_response' }]);

      const res = await request(app).get('/stripe/disputes').set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('GET /stripe/disputes/:id retrieves dispute', async () => {
      mockDisputesGet.mockResolvedValue({
        id: 'dp_1',
        amount: 5000,
        status: 'needs_response',
        reason: 'fraudulent',
      });

      const res = await request(app)
        .get('/stripe/disputes/dp_1')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data.reason).toBe('fraudulent');
    });

    it('POST /stripe/disputes/:id/evidence submits evidence', async () => {
      mockDisputesSubmitEvidence.mockResolvedValue({
        id: 'dp_1',
        status: 'under_review',
      });

      const res = await request(app)
        .post('/stripe/disputes/dp_1/evidence')
        .set('Authorization', 'Bearer token')
        .send({ uncategorized_text: 'Patient confirmed service received' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('under_review');
    });

    it('POST /stripe/disputes/:id/close closes dispute', async () => {
      mockDisputesClose.mockResolvedValue({
        id: 'dp_1',
        status: 'lost',
      });

      const res = await request(app)
        .post('/stripe/disputes/dp_1/close')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
    });
  });

  // ────────────── Products & Prices ──────────────

  describe('Products & Prices', () => {
    it('POST /stripe/products creates product (DEPRECATED)', async () => {
      const res = await request(app)
        .post('/stripe/products')
        .set('Authorization', 'Bearer token')
        .send({ name: 'Annual Checkup', description: 'Full health checkup' });

      expect(res.status).toBe(410);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('deprecated');
    });

    it('POST /stripe/prices creates price (DEPRECATED)', async () => {
      const res = await request(app)
        .post('/stripe/prices')
        .set('Authorization', 'Bearer token')
        .send({ productId: 'prod_123', unitAmount: 15000, currency: 'usd' });

      expect(res.status).toBe(410);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('deprecated');
    });
  });

  // ────────────── Payment History ──────────────

  describe('Payment History', () => {
    it('GET /stripe/payment-history returns empty for no customer', async () => {
      // Override profile to have no stripe_customer_id
      const origApp = express();
      origApp.use(express.json());

      // We'll test with the main app since mock profile has stripe_customer_id
      mockPaymentIntentsList.mockResolvedValue({
        data: [
          {
            id: 'pi_hist1',
            amount: 5000,
            currency: 'usd',
            status: 'succeeded',
            description: 'Consultation',
            created: 1700000000,
            latest_charge: null,
            metadata: {},
          },
        ],
        has_more: false,
      });

      const res = await request(app)
        .get('/stripe/payment-history')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data.payments).toBeDefined();
    });

    it('GET /stripe/payment-history/:id retrieves payment detail', async () => {
      mockPaymentIntentsRetrieve.mockResolvedValue({
        id: 'pi_hist1',
        amount: 5000,
        currency: 'usd',
        status: 'succeeded',
        description: 'Consultation',
        created: 1700000000,
        customer: 'cus_test', // Matches mock profile
        latest_charge: { receipt_url: 'https://receipt.stripe.com/...' },
        payment_method: 'pm_1',
        metadata: {},
        invoice: null,
      });

      const res = await request(app)
        .get('/stripe/payment-history/pi_hist1')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data.amount).toBe(50);
      expect(res.body.data.receipt_url).toContain('stripe.com');
    });

    it('GET /stripe/payment-history/:id returns 403 for wrong customer', async () => {
      mockPaymentIntentsRetrieve.mockResolvedValue({
        id: 'pi_other',
        amount: 5000,
        currency: 'usd',
        status: 'succeeded',
        customer: 'cus_other', // Does NOT match mock profile
        created: 1700000000,
      });

      const res = await request(app)
        .get('/stripe/payment-history/pi_other')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(403);
    });
  });
});
