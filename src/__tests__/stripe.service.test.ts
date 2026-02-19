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
  },
  invoiceItems: {
    create: jest.fn(),
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

// Dynamic import after mocks are set up (required for ESM)
const {
  customersService,
  paymentIntentsService,
  refundsService,
  connectService,
  subscriptionsService,
  productsService,
  invoicesService,
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
});
