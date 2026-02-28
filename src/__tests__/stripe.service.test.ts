/**
 * Unit tests for Stripe service
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Define mock objects at the top level so tests can reference them directly
const mockStripe = {
  customers: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    del: jest.fn(),
  },
  paymentMethods: {
    list: jest.fn(),
    attach: jest.fn(),
    detach: jest.fn(),
    retrieve: jest.fn(),
  },
  paymentIntents: {
    create: jest.fn(),
    retrieve: jest.fn(),
    confirm: jest.fn(),
    cancel: jest.fn(),
    capture: jest.fn(),
    list: jest.fn(),
  },
  refunds: {
    create: jest.fn(),
    retrieve: jest.fn(),
    list: jest.fn(),
  },
  accounts: {
    create: jest.fn(),
    retrieve: jest.fn(),
    del: jest.fn(),
    createLoginLink: jest.fn(),
  },
  accountLinks: {
    create: jest.fn(),
  },
  balance: {
    retrieve: jest.fn(),
  },
  transfers: {
    create: jest.fn(),
    retrieve: jest.fn(),
    list: jest.fn(),
    createReversal: jest.fn(),
  },
  subscriptions: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
    list: jest.fn(),
  },
  products: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    list: jest.fn(),
  },
  prices: {
    create: jest.fn(),
    retrieve: jest.fn(),
    list: jest.fn(),
  },
  invoices: {
    create: jest.fn(),
    retrieve: jest.fn(),
    list: jest.fn(),
    pay: jest.fn(),
    voidInvoice: jest.fn(),
    finalizeInvoice: jest.fn(),
    sendInvoice: jest.fn(),
  },
  invoiceItems: {
    create: jest.fn(),
  },
  setupIntents: {
    create: jest.fn(),
    retrieve: jest.fn(),
    confirm: jest.fn(),
  },
  checkout: {
    sessions: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
  },
  disputes: {
    retrieve: jest.fn(),
    update: jest.fn(),
    close: jest.fn(),
    list: jest.fn(),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
};

// Use unstable_mockModule for ESM compatibility
jest.unstable_mockModule('stripe', () => ({
  default: jest.fn(() => mockStripe),
  __esModule: true,
}));

jest.unstable_mockModule('../config/env', () => ({
  getEnv: jest.fn(() => ({
    STRIPE_SECRET_KEY: 'sk_test_mock_key',
    NODE_ENV: 'test',
  })),
}));

// Mock circuit breaker as a pass-through so the proxy doesn't interfere with tests
jest.unstable_mockModule('../utils/circuit-breaker', () => {
  const passThrough = {
    execute: (fn: () => any) => fn(),
    getState: () => 'CLOSED',
    getStats: () => ({ service: 'stripe', state: 'CLOSED', failureCount: 0, successCount: 0, lastFailure: null }),
    reset: jest.fn(),
  };
  return {
    stripeBreaker: passThrough,
    resendBreaker: passThrough,
    twilioBreaker: passThrough,
    CircuitBreaker: jest.fn(() => passThrough),
    CircuitBreakerError: class extends Error { constructor(s: string) { super(s); } },
    getAllCircuitBreakerStats: () => [],
  };
});

// Dynamic import after mocks are set up (required for ESM)
const {
  customersService,
  paymentIntentsService,
  refundsService,
  connectService,
  transfersService,
  subscriptionsService,
  productsService,
  invoicesService,
  paymentMethodsService,
  setupIntentsService,
  checkoutService,
  disputesService,
  webhooksService,
  stripe,
} = await import('../services/stripe.service');

describe('Stripe Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('customersService', () => {
    describe('create', () => {
      it('should create a customer with required fields', async () => {
        const mockCustomer = { id: 'cus_123', email: 'test@example.com' };
        (mockStripe.customers.create as jest.Mock<any>).mockResolvedValue(mockCustomer);

        const result = await customersService.create({
          email: 'test@example.com',
          name: 'Test User',
          userId: 'user-123',
        });

        expect(mockStripe.customers.create).toHaveBeenCalledWith({
          email: 'test@example.com',
          name: 'Test User',
          phone: undefined,
          metadata: {
            user_id: 'user-123',
          },
        });
        expect(result).toEqual(mockCustomer);
      });

      it('should include optional phone and metadata', async () => {
        const mockCustomer = { id: 'cus_123' };
        (mockStripe.customers.create as jest.Mock<any>).mockResolvedValue(mockCustomer);

        await customersService.create({
          email: 'test@example.com',
          name: 'Test User',
          userId: 'user-123',
          phone: '+1234567890',
          metadata: { source: 'web' },
        });

        expect(mockStripe.customers.create).toHaveBeenCalledWith({
          email: 'test@example.com',
          name: 'Test User',
          phone: '+1234567890',
          metadata: {
            user_id: 'user-123',
            source: 'web',
          },
        });
      });
    });

    describe('get', () => {
      it('should retrieve a customer by ID', async () => {
        const mockCustomer = { id: 'cus_123', email: 'test@example.com' };
        (mockStripe.customers.retrieve as jest.Mock<any>).mockResolvedValue(mockCustomer);

        const result = await customersService.get('cus_123');

        expect(mockStripe.customers.retrieve).toHaveBeenCalledWith('cus_123');
        expect(result).toEqual(mockCustomer);
      });
    });

    describe('update', () => {
      it('should update customer fields', async () => {
        const mockCustomer = { id: 'cus_123', name: 'Updated Name' };
        (mockStripe.customers.update as jest.Mock<any>).mockResolvedValue(mockCustomer);

        const result = await customersService.update('cus_123', { name: 'Updated Name' });

        expect(mockStripe.customers.update).toHaveBeenCalledWith('cus_123', {
          email: undefined,
          name: 'Updated Name',
          phone: undefined,
          metadata: undefined,
        });
        expect(result).toEqual(mockCustomer);
      });
    });

    describe('delete', () => {
      it('should delete a customer', async () => {
        const mockDeleted = { id: 'cus_123', deleted: true };
        (mockStripe.customers.del as jest.Mock<any>).mockResolvedValue(mockDeleted);

        const result = await customersService.delete('cus_123');

        expect(mockStripe.customers.del).toHaveBeenCalledWith('cus_123');
        expect(result).toEqual(mockDeleted);
      });
    });

    describe('listPaymentMethods', () => {
      it('should list payment methods for a customer', async () => {
        const mockMethods = { data: [{ id: 'pm_123', type: 'card' }] };
        (mockStripe.paymentMethods.list as jest.Mock<any>).mockResolvedValue(mockMethods);

        const result = await customersService.listPaymentMethods('cus_123');

        expect(mockStripe.paymentMethods.list).toHaveBeenCalledWith({
          customer: 'cus_123',
          type: 'card',
        });
        expect(result).toEqual(mockMethods);
      });

      it('should allow specifying payment method type', async () => {
        const mockMethods = { data: [] };
        (mockStripe.paymentMethods.list as jest.Mock<any>).mockResolvedValue(mockMethods);

        await customersService.listPaymentMethods('cus_123', 'us_bank_account');

        expect(mockStripe.paymentMethods.list).toHaveBeenCalledWith({
          customer: 'cus_123',
          type: 'us_bank_account',
        });
      });
    });
  });

  describe('paymentIntentsService', () => {
    describe('create', () => {
      it('should create a payment intent with required params', async () => {
        const mockIntent = { id: 'pi_123', amount: 1000 };
        (mockStripe.paymentIntents.create as jest.Mock<any>).mockResolvedValue(mockIntent);

        const result = await paymentIntentsService.create({
          amount: 1000,
          patientId: 'patient-123',
          providerId: 'provider-456',
        });

        expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
          amount: 1000,
          currency: 'usd',
          automatic_payment_methods: { enabled: true },
          metadata: {
            patient_id: 'patient-123',
            provider_id: 'provider-456',
            appointment_id: '',
          },
          description: 'Healthcare payment',
        });
        expect(result).toEqual(mockIntent);
      });

      it('should include customer ID when provided', async () => {
        const mockIntent = { id: 'pi_123' };
        (mockStripe.paymentIntents.create as jest.Mock<any>).mockResolvedValue(mockIntent);

        await paymentIntentsService.create({
          amount: 2000,
          patientId: 'patient-123',
          providerId: 'provider-456',
          customerId: 'cus_789',
          currency: 'eur',
        });

        expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
          expect.objectContaining({
            customer: 'cus_789',
            currency: 'eur',
          })
        );
      });

      it('should include appointment ID and custom description', async () => {
        const mockIntent = { id: 'pi_123' };
        (mockStripe.paymentIntents.create as jest.Mock<any>).mockResolvedValue(mockIntent);

        await paymentIntentsService.create({
          amount: 5000,
          patientId: 'patient-123',
          providerId: 'provider-456',
          appointmentId: 'apt-789',
          description: 'Dental checkup',
        });

        expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              appointment_id: 'apt-789',
            }),
            description: 'Dental checkup',
          })
        );
      });
    });

    describe('get', () => {
      it('should retrieve a payment intent', async () => {
        const mockIntent = { id: 'pi_123', status: 'succeeded' };
        (mockStripe.paymentIntents.retrieve as jest.Mock<any>).mockResolvedValue(mockIntent);

        const result = await paymentIntentsService.get('pi_123');

        expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_123');
        expect(result).toEqual(mockIntent);
      });
    });

    describe('confirm', () => {
      it('should confirm a payment intent', async () => {
        const mockIntent = { id: 'pi_123', status: 'succeeded' };
        (mockStripe.paymentIntents.confirm as jest.Mock<any>).mockResolvedValue(mockIntent);

        const result = await paymentIntentsService.confirm('pi_123', 'pm_456');

        expect(mockStripe.paymentIntents.confirm).toHaveBeenCalledWith('pi_123', {
          payment_method: 'pm_456',
        });
        expect(result).toEqual(mockIntent);
      });
    });

    describe('cancel', () => {
      it('should cancel a payment intent', async () => {
        const mockIntent = { id: 'pi_123', status: 'canceled' };
        (mockStripe.paymentIntents.cancel as jest.Mock<any>).mockResolvedValue(mockIntent);

        const result = await paymentIntentsService.cancel('pi_123');

        expect(mockStripe.paymentIntents.cancel).toHaveBeenCalledWith('pi_123');
        expect(result).toEqual(mockIntent);
      });
    });

    describe('capture', () => {
      it('should capture a payment intent', async () => {
        const mockIntent = { id: 'pi_123', status: 'succeeded' };
        (mockStripe.paymentIntents.capture as jest.Mock<any>).mockResolvedValue(mockIntent);

        const result = await paymentIntentsService.capture('pi_123');

        expect(mockStripe.paymentIntents.capture).toHaveBeenCalledWith('pi_123', {
          amount_to_capture: undefined,
        });
        expect(result).toEqual(mockIntent);
      });

      it('should capture a specific amount', async () => {
        const mockIntent = { id: 'pi_123' };
        (mockStripe.paymentIntents.capture as jest.Mock<any>).mockResolvedValue(mockIntent);

        await paymentIntentsService.capture('pi_123', 500);

        expect(mockStripe.paymentIntents.capture).toHaveBeenCalledWith('pi_123', {
          amount_to_capture: 500,
        });
      });
    });

    describe('listByCustomer', () => {
      it('should list payment intents for a customer', async () => {
        const mockIntents = { data: [{ id: 'pi_123' }] };
        (mockStripe.paymentIntents.list as jest.Mock<any>).mockResolvedValue(mockIntents);

        const result = await paymentIntentsService.listByCustomer('cus_123');

        expect(mockStripe.paymentIntents.list).toHaveBeenCalledWith({
          customer: 'cus_123',
          limit: 10,
        });
        expect(result).toEqual(mockIntents);
      });

      it('should allow custom limit', async () => {
        const mockIntents = { data: [] };
        (mockStripe.paymentIntents.list as jest.Mock<any>).mockResolvedValue(mockIntents);

        await paymentIntentsService.listByCustomer('cus_123', 25);

        expect(mockStripe.paymentIntents.list).toHaveBeenCalledWith({
          customer: 'cus_123',
          limit: 25,
        });
      });
    });
  });

  describe('refundsService', () => {
    describe('createFull', () => {
      it('should create a full refund', async () => {
        const mockRefund = { id: 're_123', amount: 1000 };
        (mockStripe.refunds.create as jest.Mock<any>).mockResolvedValue(mockRefund);

        const result = await refundsService.createFull('pi_123');

        expect(mockStripe.refunds.create).toHaveBeenCalledWith({
          payment_intent: 'pi_123',
          reason: undefined,
        });
        expect(result).toEqual(mockRefund);
      });

      it('should create a full refund with reason', async () => {
        const mockRefund = { id: 're_123', amount: 1000 };
        (mockStripe.refunds.create as jest.Mock<any>).mockResolvedValue(mockRefund);

        await refundsService.createFull('pi_123', 'requested_by_customer');

        expect(mockStripe.refunds.create).toHaveBeenCalledWith({
          payment_intent: 'pi_123',
          reason: 'requested_by_customer',
        });
      });
    });

    describe('createPartial', () => {
      it('should create a partial refund', async () => {
        const mockRefund = { id: 're_123', amount: 500 };
        (mockStripe.refunds.create as jest.Mock<any>).mockResolvedValue(mockRefund);

        await refundsService.createPartial('pi_123', 500, 'requested_by_customer');

        expect(mockStripe.refunds.create).toHaveBeenCalledWith({
          payment_intent: 'pi_123',
          amount: 500,
          reason: 'requested_by_customer',
        });
      });
    });

    describe('get', () => {
      it('should retrieve a refund by ID', async () => {
        const mockRefund = { id: 're_123' };
        (mockStripe.refunds.retrieve as jest.Mock<any>).mockResolvedValue(mockRefund);

        const result = await refundsService.get('re_123');

        expect(mockStripe.refunds.retrieve).toHaveBeenCalledWith('re_123');
        expect(result).toEqual(mockRefund);
      });
    });

    describe('listByPaymentIntent', () => {
      it('should list refunds for a payment intent', async () => {
        const mockRefunds = { data: [{ id: 're_123' }] };
        (mockStripe.refunds.list as jest.Mock<any>).mockResolvedValue(mockRefunds);

        const result = await refundsService.listByPaymentIntent('pi_123');

        expect(mockStripe.refunds.list).toHaveBeenCalledWith({
          payment_intent: 'pi_123',
        });
        expect(result).toEqual(mockRefunds);
      });
    });
  });

  describe('productsService', () => {
    describe('create', () => {
      it('should create a product', async () => {
        const mockProduct = { id: 'prod_123', name: 'Test Product' };
        (mockStripe.products.create as jest.Mock<any>).mockResolvedValue(mockProduct);

        const result = await productsService.create('Test Product', 'A test product');

        expect(mockStripe.products.create).toHaveBeenCalledWith({
          name: 'Test Product',
          description: 'A test product',
          metadata: undefined,
        });
        expect(result).toEqual(mockProduct);
      });

      it('should create a product with metadata', async () => {
        const mockProduct = { id: 'prod_123' };
        (mockStripe.products.create as jest.Mock<any>).mockResolvedValue(mockProduct);

        await productsService.create('Test Product', 'Description', { category: 'dental' });

        expect(mockStripe.products.create).toHaveBeenCalledWith({
          name: 'Test Product',
          description: 'Description',
          metadata: { category: 'dental' },
        });
      });
    });

    describe('list', () => {
      it('should list active products by default', async () => {
        const mockProducts = { data: [{ id: 'prod_123' }] };
        (mockStripe.products.list as jest.Mock<any>).mockResolvedValue(mockProducts);

        const result = await productsService.list();

        expect(mockStripe.products.list).toHaveBeenCalledWith({
          active: true,
        });
        expect(result).toEqual(mockProducts);
      });

      it('should allow listing inactive products', async () => {
        const mockProducts = { data: [] };
        (mockStripe.products.list as jest.Mock<any>).mockResolvedValue(mockProducts);

        await productsService.list(false);

        expect(mockStripe.products.list).toHaveBeenCalledWith({
          active: false,
        });
      });
    });

    describe('listPrices', () => {
      it('should list prices for a product', async () => {
        const mockPrices = { data: [{ id: 'price_123' }] };
        (mockStripe.prices.list as jest.Mock<any>).mockResolvedValue(mockPrices);

        const result = await productsService.listPrices('prod_123');

        expect(mockStripe.prices.list).toHaveBeenCalledWith({
          product: 'prod_123',
        });
        expect(result).toEqual(mockPrices);
      });
    });
  });

  describe('error handling', () => {
    it('should propagate Stripe errors', async () => {
      const stripeError = new Error('Card declined');
      (stripeError as any).type = 'StripeCardError';
      (mockStripe.paymentIntents.create as jest.Mock<any>).mockRejectedValue(stripeError);

      await expect(
        paymentIntentsService.create({
          amount: 1000,
          patientId: 'patient-123',
          providerId: 'provider-456',
        })
      ).rejects.toThrow('Card declined');
    });

    it('should propagate network errors', async () => {
      const networkError = new Error('Network timeout');
      (mockStripe.customers.retrieve as jest.Mock<any>).mockRejectedValue(networkError);

      await expect(customersService.get('cus_123')).rejects.toThrow('Network timeout');
    });
  });

  // ============================================================
  // connectService
  // ============================================================
  describe('connectService', () => {
    describe('createExpressAccount', () => {
      it('should create an Express account with defaults', async () => {
        const mockAccount = { id: 'acct_123', type: 'express' };
        (mockStripe.accounts.create as jest.Mock<any>).mockResolvedValue(mockAccount);

        const result = await connectService.createExpressAccount({
          email: 'provider@example.com',
          businessName: 'Dr. Smith Clinic',
          providerId: 'prov-1',
        });

        expect(mockStripe.accounts.create).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'express',
            country: 'US',
            email: 'provider@example.com',
            business_type: 'individual',
            capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
            metadata: { provider_id: 'prov-1' },
          })
        );
        expect(result).toEqual(mockAccount);
      });

      it('should accept a custom country', async () => {
        const mockAccount = { id: 'acct_124' };
        (mockStripe.accounts.create as jest.Mock<any>).mockResolvedValue(mockAccount);

        await connectService.createExpressAccount({
          email: 'prov@example.com',
          businessName: 'London Clinic',
          providerId: 'prov-2',
          country: 'GB',
        });

        expect(mockStripe.accounts.create).toHaveBeenCalledWith(
          expect.objectContaining({ country: 'GB' })
        );
      });
    });

    describe('createAccountLink', () => {
      it('should create an onboarding account link', async () => {
        const mockLink = { url: 'https://connect.stripe.com/onboarding', object: 'account_link' };
        (mockStripe.accountLinks.create as jest.Mock<any>).mockResolvedValue(mockLink);

        const result = await connectService.createAccountLink(
          'acct_123',
          'https://app.com/refresh',
          'https://app.com/return'
        );

        expect(mockStripe.accountLinks.create).toHaveBeenCalledWith({
          account: 'acct_123',
          refresh_url: 'https://app.com/refresh',
          return_url: 'https://app.com/return',
          type: 'account_onboarding',
        });
        expect(result).toEqual(mockLink);
      });
    });

    describe('createLoginLink', () => {
      it('should create a login link', async () => {
        const mockLink = { url: 'https://connect.stripe.com/login' };
        (mockStripe.accounts.createLoginLink as jest.Mock<any>).mockResolvedValue(mockLink);

        const result = await connectService.createLoginLink('acct_123');

        expect(mockStripe.accounts.createLoginLink).toHaveBeenCalledWith('acct_123');
        expect(result).toEqual(mockLink);
      });
    });

    describe('getAccount', () => {
      it('should retrieve account details', async () => {
        const mockAccount = { id: 'acct_123', details_submitted: true };
        (mockStripe.accounts.retrieve as jest.Mock<any>).mockResolvedValue(mockAccount);

        const result = await connectService.getAccount('acct_123');

        expect(mockStripe.accounts.retrieve).toHaveBeenCalledWith('acct_123');
        expect(result).toEqual(mockAccount);
      });
    });

    describe('isOnboarded', () => {
      it('should return true when fully onboarded', async () => {
        (mockStripe.accounts.retrieve as jest.Mock<any>).mockResolvedValue({
          details_submitted: true,
          charges_enabled: true,
          payouts_enabled: true,
        });

        const result = await connectService.isOnboarded('acct_123');
        expect(result).toBe(true);
      });

      it('should return false when not fully onboarded', async () => {
        (mockStripe.accounts.retrieve as jest.Mock<any>).mockResolvedValue({
          details_submitted: true,
          charges_enabled: false,
          payouts_enabled: true,
        });

        const result = await connectService.isOnboarded('acct_123');
        expect(result).toBeFalsy();
      });
    });

    describe('deleteAccount', () => {
      it('should delete a connected account', async () => {
        const mockDeleted = { id: 'acct_123', deleted: true };
        (mockStripe.accounts.del as jest.Mock<any>).mockResolvedValue(mockDeleted);

        const result = await connectService.deleteAccount('acct_123');

        expect(mockStripe.accounts.del).toHaveBeenCalledWith('acct_123');
        expect(result).toEqual(mockDeleted);
      });
    });

    describe('getBalance', () => {
      it('should retrieve the account balance', async () => {
        const mockBalance = { available: [{ amount: 5000, currency: 'usd' }] };
        (mockStripe.balance.retrieve as jest.Mock<any>).mockResolvedValue(mockBalance);

        const result = await connectService.getBalance('acct_123');

        expect(mockStripe.balance.retrieve).toHaveBeenCalledWith({ stripeAccount: 'acct_123' });
        expect(result).toEqual(mockBalance);
      });
    });
  });

  // ============================================================
  // transfersService
  // ============================================================
  describe('transfersService', () => {
    describe('createTransfer', () => {
      it('should create a transfer with defaults', async () => {
        const mockTransfer = { id: 'tr_123', amount: 1000 };
        (mockStripe.transfers.create as jest.Mock<any>).mockResolvedValue(mockTransfer);

        const result = await transfersService.createTransfer({
          amount: 1000,
          destinationAccountId: 'acct_456',
          transactionId: 'txn-789',
        });

        expect(mockStripe.transfers.create).toHaveBeenCalledWith({
          amount: 1000,
          currency: 'usd',
          destination: 'acct_456',
          description: 'Provider payout',
          metadata: { transaction_id: 'txn-789' },
        });
        expect(result).toEqual(mockTransfer);
      });

      it('should accept a custom description', async () => {
        (mockStripe.transfers.create as jest.Mock<any>).mockResolvedValue({ id: 'tr_124' });

        await transfersService.createTransfer({
          amount: 500,
          destinationAccountId: 'acct_456',
          transactionId: 'txn-100',
          description: 'Bonus payout',
        });

        expect(mockStripe.transfers.create).toHaveBeenCalledWith(
          expect.objectContaining({ description: 'Bonus payout' })
        );
      });
    });

    describe('createFromCharge', () => {
      it('should create a transfer from a charge', async () => {
        const mockTransfer = { id: 'tr_125' };
        (mockStripe.transfers.create as jest.Mock<any>).mockResolvedValue(mockTransfer);

        const result = await transfersService.createFromCharge('ch_100', 'acct_456', 2000);

        expect(mockStripe.transfers.create).toHaveBeenCalledWith({
          amount: 2000,
          currency: 'usd',
          destination: 'acct_456',
          source_transaction: 'ch_100',
        });
        expect(result).toEqual(mockTransfer);
      });
    });

    describe('get', () => {
      it('should retrieve a transfer', async () => {
        const mockTransfer = { id: 'tr_123' };
        (mockStripe.transfers.retrieve as jest.Mock<any>).mockResolvedValue(mockTransfer);

        const result = await transfersService.get('tr_123');

        expect(mockStripe.transfers.retrieve).toHaveBeenCalledWith('tr_123');
        expect(result).toEqual(mockTransfer);
      });
    });

    describe('listByDestination', () => {
      it('should list transfers with default limit', async () => {
        const mockList = { data: [{ id: 'tr_123' }] };
        (mockStripe.transfers.list as jest.Mock<any>).mockResolvedValue(mockList);

        const result = await transfersService.listByDestination('acct_456');

        expect(mockStripe.transfers.list).toHaveBeenCalledWith({
          destination: 'acct_456',
          limit: 10,
        });
        expect(result).toEqual(mockList);
      });

      it('should accept a custom limit', async () => {
        (mockStripe.transfers.list as jest.Mock<any>).mockResolvedValue({ data: [] });

        await transfersService.listByDestination('acct_456', 50);

        expect(mockStripe.transfers.list).toHaveBeenCalledWith({
          destination: 'acct_456',
          limit: 50,
        });
      });
    });

    describe('reverse', () => {
      it('should reverse a full transfer', async () => {
        const mockReversal = { id: 'trr_123' };
        (mockStripe.transfers.createReversal as jest.Mock<any>).mockResolvedValue(mockReversal);

        const result = await transfersService.reverse('tr_123');

        expect(mockStripe.transfers.createReversal).toHaveBeenCalledWith('tr_123', {
          amount: undefined,
        });
        expect(result).toEqual(mockReversal);
      });

      it('should reverse a partial amount', async () => {
        (mockStripe.transfers.createReversal as jest.Mock<any>).mockResolvedValue({ id: 'trr_124' });

        await transfersService.reverse('tr_123', 300);

        expect(mockStripe.transfers.createReversal).toHaveBeenCalledWith('tr_123', {
          amount: 300,
        });
      });
    });
  });

  // ============================================================
  // subscriptionsService
  // ============================================================
  describe('subscriptionsService', () => {
    describe('create', () => {
      it('should create a subscription', async () => {
        const mockSub = { id: 'sub_123', status: 'incomplete' };
        (mockStripe.subscriptions.create as jest.Mock<any>).mockResolvedValue(mockSub);

        const result = await subscriptionsService.create({
          customerId: 'cus_123',
          priceId: 'price_abc',
          patientId: 'pat-1',
          providerId: 'prov-1',
        });

        expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            customer: 'cus_123',
            items: [{ price: 'price_abc' }],
            payment_behavior: 'default_incomplete',
            metadata: expect.objectContaining({
              patient_id: 'pat-1',
              provider_id: 'prov-1',
            }),
          })
        );
        expect(result).toEqual(mockSub);
      });
    });

    describe('get', () => {
      it('should retrieve a subscription', async () => {
        const mockSub = { id: 'sub_123' };
        (mockStripe.subscriptions.retrieve as jest.Mock<any>).mockResolvedValue(mockSub);

        const result = await subscriptionsService.get('sub_123');

        expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_123');
        expect(result).toEqual(mockSub);
      });
    });

    describe('cancel', () => {
      it('should cancel immediately', async () => {
        const mockSub = { id: 'sub_123', status: 'canceled' };
        (mockStripe.subscriptions.cancel as jest.Mock<any>).mockResolvedValue(mockSub);

        const result = await subscriptionsService.cancel('sub_123', true);

        expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith('sub_123');
        expect(result).toEqual(mockSub);
      });

      it('should cancel at period end by default', async () => {
        const mockSub = { id: 'sub_123', cancel_at_period_end: true };
        (mockStripe.subscriptions.update as jest.Mock<any>).mockResolvedValue(mockSub);

        const result = await subscriptionsService.cancel('sub_123');

        expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_123', {
          cancel_at_period_end: true,
        });
        expect(result).toEqual(mockSub);
      });
    });

    describe('pause', () => {
      it('should pause a subscription', async () => {
        const mockSub = { id: 'sub_123' };
        (mockStripe.subscriptions.update as jest.Mock<any>).mockResolvedValue(mockSub);

        const result = await subscriptionsService.pause('sub_123');

        expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_123', {
          pause_collection: { behavior: 'void' },
        });
        expect(result).toEqual(mockSub);
      });
    });

    describe('resume', () => {
      it('should resume a paused subscription', async () => {
        const mockSub = { id: 'sub_123' };
        (mockStripe.subscriptions.update as jest.Mock<any>).mockResolvedValue(mockSub);

        const result = await subscriptionsService.resume('sub_123');

        expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_123', {
          pause_collection: '',
        });
        expect(result).toEqual(mockSub);
      });
    });

    describe('listByCustomer', () => {
      it('should list subscriptions for a customer', async () => {
        const mockList = { data: [{ id: 'sub_123' }] };
        (mockStripe.subscriptions.list as jest.Mock<any>).mockResolvedValue(mockList);

        const result = await subscriptionsService.listByCustomer('cus_123');

        expect(mockStripe.subscriptions.list).toHaveBeenCalledWith({ customer: 'cus_123' });
        expect(result).toEqual(mockList);
      });
    });
  });

  // ============================================================
  // productsService.createPrice
  // ============================================================
  describe('productsService - createPrice', () => {
    it('should create a one-time price', async () => {
      const mockPrice = { id: 'price_123', unit_amount: 5000 };
      (mockStripe.prices.create as jest.Mock<any>).mockResolvedValue(mockPrice);

      const result = await productsService.createPrice('prod_123', 5000);

      expect(mockStripe.prices.create).toHaveBeenCalledWith({
        product: 'prod_123',
        unit_amount: 5000,
        currency: 'usd',
      });
      expect(result).toEqual(mockPrice);
    });

    it('should create a recurring price', async () => {
      const mockPrice = { id: 'price_124', recurring: { interval: 'month' } };
      (mockStripe.prices.create as jest.Mock<any>).mockResolvedValue(mockPrice);

      const result = await productsService.createPrice('prod_123', 2000, 'usd', {
        interval: 'month',
      });

      expect(mockStripe.prices.create).toHaveBeenCalledWith({
        product: 'prod_123',
        unit_amount: 2000,
        currency: 'usd',
        recurring: { interval: 'month' },
      });
      expect(result).toEqual(mockPrice);
    });

    it('should accept a custom currency', async () => {
      (mockStripe.prices.create as jest.Mock<any>).mockResolvedValue({ id: 'price_125' });

      await productsService.createPrice('prod_123', 3000, 'eur');

      expect(mockStripe.prices.create).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'eur' })
      );
    });
  });

  // ============================================================
  // invoicesService
  // ============================================================
  describe('invoicesService', () => {
    describe('create', () => {
      it('should create an invoice', async () => {
        const mockInvoice = { id: 'in_123' };
        (mockStripe.invoices.create as jest.Mock<any>).mockResolvedValue(mockInvoice);

        const result = await invoicesService.create('cus_123');

        expect(mockStripe.invoices.create).toHaveBeenCalledWith({
          customer: 'cus_123',
          auto_advance: false,
          metadata: undefined,
        });
        expect(result).toEqual(mockInvoice);
      });

      it('should create an invoice with metadata', async () => {
        (mockStripe.invoices.create as jest.Mock<any>).mockResolvedValue({ id: 'in_124' });

        await invoicesService.create('cus_123', { type: 'dental' });

        expect(mockStripe.invoices.create).toHaveBeenCalledWith({
          customer: 'cus_123',
          auto_advance: false,
          metadata: { type: 'dental' },
        });
      });
    });

    describe('addLineItem', () => {
      it('should add a line item to an invoice', async () => {
        (mockStripe.invoices.retrieve as jest.Mock<any>).mockResolvedValue({
          id: 'in_123',
          customer: 'cus_456',
        });
        const mockItem = { id: 'ii_123' };
        (mockStripe.invoiceItems.create as jest.Mock<any>).mockResolvedValue(mockItem);

        const result = await invoicesService.addLineItem('in_123', 2000, 'Consultation');

        expect(mockStripe.invoices.retrieve).toHaveBeenCalledWith('in_123');
        expect(mockStripe.invoiceItems.create).toHaveBeenCalledWith({
          customer: 'cus_456',
          invoice: 'in_123',
          amount: 2000,
          currency: 'usd',
          description: 'Consultation',
        });
        expect(result).toEqual(mockItem);
      });

      it('should accept a custom currency', async () => {
        (mockStripe.invoices.retrieve as jest.Mock<any>).mockResolvedValue({
          id: 'in_123',
          customer: 'cus_456',
        });
        (mockStripe.invoiceItems.create as jest.Mock<any>).mockResolvedValue({ id: 'ii_124' });

        await invoicesService.addLineItem('in_123', 1000, 'Lab work', 'eur');

        expect(mockStripe.invoiceItems.create).toHaveBeenCalledWith(
          expect.objectContaining({ currency: 'eur' })
        );
      });
    });

    describe('finalizeAndSend', () => {
      it('should finalize and send an invoice', async () => {
        const mockInvoice = { id: 'in_123', status: 'open' };
        (mockStripe.invoices.finalizeInvoice as jest.Mock<any>).mockResolvedValue(mockInvoice);
        (mockStripe.invoices.sendInvoice as jest.Mock<any>).mockResolvedValue({
          ...mockInvoice,
          status: 'sent',
        });

        const result = await invoicesService.finalizeAndSend('in_123');

        expect(mockStripe.invoices.finalizeInvoice).toHaveBeenCalledWith('in_123');
        expect(mockStripe.invoices.sendInvoice).toHaveBeenCalledWith('in_123');
        expect(result.status).toBe('sent');
      });
    });

    describe('markPaid', () => {
      it('should mark an invoice as paid out of band', async () => {
        const mockInvoice = { id: 'in_123', status: 'paid' };
        (mockStripe.invoices.pay as jest.Mock<any>).mockResolvedValue(mockInvoice);

        const result = await invoicesService.markPaid('in_123');

        expect(mockStripe.invoices.pay).toHaveBeenCalledWith('in_123', {
          paid_out_of_band: true,
        });
        expect(result).toEqual(mockInvoice);
      });
    });

    describe('void', () => {
      it('should void an invoice', async () => {
        const mockInvoice = { id: 'in_123', status: 'void' };
        (mockStripe.invoices.voidInvoice as jest.Mock<any>).mockResolvedValue(mockInvoice);

        const result = await invoicesService.void('in_123');

        expect(mockStripe.invoices.voidInvoice).toHaveBeenCalledWith('in_123');
        expect(result).toEqual(mockInvoice);
      });
    });

    describe('getPdfUrl', () => {
      it('should return the PDF URL when available', async () => {
        (mockStripe.invoices.retrieve as jest.Mock<any>).mockResolvedValue({
          id: 'in_123',
          invoice_pdf: 'https://stripe.com/invoice.pdf',
        });

        const result = await invoicesService.getPdfUrl('in_123');

        expect(result).toBe('https://stripe.com/invoice.pdf');
      });

      it('should return null when no PDF URL', async () => {
        (mockStripe.invoices.retrieve as jest.Mock<any>).mockResolvedValue({
          id: 'in_123',
          invoice_pdf: null,
        });

        const result = await invoicesService.getPdfUrl('in_123');

        expect(result).toBeNull();
      });
    });
  });

  // ============================================================
  // paymentMethodsService
  // ============================================================
  describe('paymentMethodsService', () => {
    describe('attach', () => {
      it('should attach a payment method to a customer', async () => {
        const mockPm = { id: 'pm_123', customer: 'cus_456' };
        (mockStripe.paymentMethods.attach as jest.Mock<any>).mockResolvedValue(mockPm);

        const result = await paymentMethodsService.attach('pm_123', 'cus_456');

        expect(mockStripe.paymentMethods.attach).toHaveBeenCalledWith('pm_123', {
          customer: 'cus_456',
        });
        expect(result).toEqual(mockPm);
      });
    });

    describe('detach', () => {
      it('should detach a payment method', async () => {
        const mockPm = { id: 'pm_123', customer: null };
        (mockStripe.paymentMethods.detach as jest.Mock<any>).mockResolvedValue(mockPm);

        const result = await paymentMethodsService.detach('pm_123');

        expect(mockStripe.paymentMethods.detach).toHaveBeenCalledWith('pm_123');
        expect(result).toEqual(mockPm);
      });
    });

    describe('setDefault', () => {
      it('should set a default payment method', async () => {
        const mockCustomer = { id: 'cus_456' };
        (mockStripe.customers.update as jest.Mock<any>).mockResolvedValue(mockCustomer);

        const result = await paymentMethodsService.setDefault('cus_456', 'pm_123');

        expect(mockStripe.customers.update).toHaveBeenCalledWith('cus_456', {
          invoice_settings: { default_payment_method: 'pm_123' },
        });
        expect(result).toEqual(mockCustomer);
      });
    });

    describe('get', () => {
      it('should retrieve a payment method', async () => {
        const mockPm = { id: 'pm_123', type: 'card' };
        (mockStripe.paymentMethods.retrieve as jest.Mock<any>).mockResolvedValue(mockPm);

        const result = await paymentMethodsService.get('pm_123');

        expect(mockStripe.paymentMethods.retrieve).toHaveBeenCalledWith('pm_123');
        expect(result).toEqual(mockPm);
      });
    });
  });

  // ============================================================
  // setupIntentsService
  // ============================================================
  describe('setupIntentsService', () => {
    describe('create', () => {
      it('should create a setup intent', async () => {
        const mockSetupIntent = { id: 'seti_123', client_secret: 'seti_secret' };
        (mockStripe.setupIntents.create as jest.Mock<any>).mockResolvedValue(mockSetupIntent);

        const result = await setupIntentsService.create('cus_123');

        expect(mockStripe.setupIntents.create).toHaveBeenCalledWith({
          customer: 'cus_123',
          automatic_payment_methods: { enabled: true },
        });
        expect(result).toEqual(mockSetupIntent);
      });
    });

    describe('get', () => {
      it('should retrieve a setup intent', async () => {
        const mockSetupIntent = { id: 'seti_123' };
        (mockStripe.setupIntents.retrieve as jest.Mock<any>).mockResolvedValue(mockSetupIntent);

        const result = await setupIntentsService.get('seti_123');

        expect(mockStripe.setupIntents.retrieve).toHaveBeenCalledWith('seti_123');
        expect(result).toEqual(mockSetupIntent);
      });
    });

    describe('confirm', () => {
      it('should confirm a setup intent with a payment method', async () => {
        const mockSetupIntent = { id: 'seti_123', status: 'succeeded' };
        (mockStripe.setupIntents.confirm as jest.Mock<any>).mockResolvedValue(mockSetupIntent);

        const result = await setupIntentsService.confirm('seti_123', 'pm_456');

        expect(mockStripe.setupIntents.confirm).toHaveBeenCalledWith('seti_123', {
          payment_method: 'pm_456',
        });
        expect(result).toEqual(mockSetupIntent);
      });
    });
  });

  // ============================================================
  // checkoutService
  // ============================================================
  describe('checkoutService', () => {
    describe('createPaymentSession', () => {
      it('should create a payment checkout session', async () => {
        const mockSession = { id: 'cs_123', url: 'https://checkout.stripe.com/session' };
        (mockStripe.checkout.sessions.create as jest.Mock<any>).mockResolvedValue(mockSession);

        const result = await checkoutService.createPaymentSession({
          amount: 5000,
          productName: 'Dental cleaning',
          successUrl: 'https://app.com/success',
          cancelUrl: 'https://app.com/cancel',
        });

        expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: 'payment',
            line_items: [
              {
                price_data: {
                  currency: 'usd',
                  product_data: { name: 'Dental cleaning' },
                  unit_amount: 5000,
                },
                quantity: 1,
              },
            ],
            success_url: 'https://app.com/success',
            cancel_url: 'https://app.com/cancel',
          })
        );
        expect(result).toEqual(mockSession);
      });

      it('should include customer ID when provided', async () => {
        (mockStripe.checkout.sessions.create as jest.Mock<any>).mockResolvedValue({ id: 'cs_124' });

        await checkoutService.createPaymentSession({
          customerId: 'cus_789',
          amount: 3000,
          productName: 'Checkup',
          successUrl: 'https://app.com/success',
          cancelUrl: 'https://app.com/cancel',
        });

        expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
          expect.objectContaining({ customer: 'cus_789' })
        );
      });
    });

    describe('createSubscriptionSession', () => {
      it('should create a subscription checkout session', async () => {
        const mockSession = { id: 'cs_125' };
        (mockStripe.checkout.sessions.create as jest.Mock<any>).mockResolvedValue(mockSession);

        const result = await checkoutService.createSubscriptionSession({
          priceId: 'price_abc',
          successUrl: 'https://app.com/success',
          cancelUrl: 'https://app.com/cancel',
        });

        expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: 'subscription',
            line_items: [{ price: 'price_abc', quantity: 1 }],
          })
        );
        expect(result).toEqual(mockSession);
      });

      it('should include trial days when specified', async () => {
        (mockStripe.checkout.sessions.create as jest.Mock<any>).mockResolvedValue({ id: 'cs_126' });

        await checkoutService.createSubscriptionSession({
          priceId: 'price_abc',
          successUrl: 'https://app.com/success',
          cancelUrl: 'https://app.com/cancel',
          trialDays: 14,
        });

        expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            subscription_data: { trial_period_days: 14 },
          })
        );
      });

      it('should include customer ID when provided', async () => {
        (mockStripe.checkout.sessions.create as jest.Mock<any>).mockResolvedValue({ id: 'cs_127' });

        await checkoutService.createSubscriptionSession({
          customerId: 'cus_100',
          priceId: 'price_abc',
          successUrl: 'https://app.com/success',
          cancelUrl: 'https://app.com/cancel',
        });

        expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
          expect.objectContaining({ customer: 'cus_100' })
        );
      });
    });

    describe('get', () => {
      it('should retrieve a checkout session with expansions', async () => {
        const mockSession = { id: 'cs_123', payment_intent: { id: 'pi_123' } };
        (mockStripe.checkout.sessions.retrieve as jest.Mock<any>).mockResolvedValue(mockSession);

        const result = await checkoutService.get('cs_123');

        expect(mockStripe.checkout.sessions.retrieve).toHaveBeenCalledWith('cs_123', {
          expand: ['line_items', 'payment_intent'],
        });
        expect(result).toEqual(mockSession);
      });
    });
  });

  // ============================================================
  // disputesService
  // ============================================================
  describe('disputesService', () => {
    describe('get', () => {
      it('should retrieve a dispute', async () => {
        const mockDispute = { id: 'dp_123', reason: 'fraudulent' };
        (mockStripe.disputes.retrieve as jest.Mock<any>).mockResolvedValue(mockDispute);

        const result = await disputesService.get('dp_123');

        expect(mockStripe.disputes.retrieve).toHaveBeenCalledWith('dp_123');
        expect(result).toEqual(mockDispute);
      });
    });

    describe('submitEvidence', () => {
      it('should submit dispute evidence', async () => {
        const mockDispute = { id: 'dp_123', status: 'under_review' };
        (mockStripe.disputes.update as jest.Mock<any>).mockResolvedValue(mockDispute);

        const evidence = {
          customer_name: 'John Doe',
          product_description: 'Healthcare consultation',
        };
        const result = await disputesService.submitEvidence('dp_123', evidence as any);

        expect(mockStripe.disputes.update).toHaveBeenCalledWith('dp_123', {
          evidence,
          submit: true,
        });
        expect(result).toEqual(mockDispute);
      });
    });

    describe('close', () => {
      it('should close a dispute (accept loss)', async () => {
        const mockDispute = { id: 'dp_123', status: 'lost' };
        (mockStripe.disputes.close as jest.Mock<any>).mockResolvedValue(mockDispute);

        const result = await disputesService.close('dp_123');

        expect(mockStripe.disputes.close).toHaveBeenCalledWith('dp_123');
        expect(result).toEqual(mockDispute);
      });
    });

    describe('list', () => {
      it('should list disputes with default limit', async () => {
        const mockList = { data: [{ id: 'dp_123' }] };
        (mockStripe.disputes.list as jest.Mock<any>).mockResolvedValue(mockList);

        const result = await disputesService.list();

        expect(mockStripe.disputes.list).toHaveBeenCalledWith({ limit: 10 });
        expect(result).toEqual(mockList);
      });

      it('should accept a custom limit', async () => {
        (mockStripe.disputes.list as jest.Mock<any>).mockResolvedValue({ data: [] });

        await disputesService.list(25);

        expect(mockStripe.disputes.list).toHaveBeenCalledWith({ limit: 25 });
      });
    });
  });

  // ============================================================
  // webhooksService
  // ============================================================
  describe('webhooksService', () => {
    it('should construct and verify a webhook event', () => {
      const mockEvent = { id: 'evt_123', type: 'payment_intent.succeeded' };
      (mockStripe.webhooks.constructEvent as jest.Mock<any>).mockReturnValue(mockEvent);

      const result = webhooksService.constructEvent(
        'raw_body',
        'sig_header',
        'whsec_test'
      );

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        'raw_body',
        'sig_header',
        'whsec_test'
      );
      expect(result).toEqual(mockEvent);
    });
  });
});
