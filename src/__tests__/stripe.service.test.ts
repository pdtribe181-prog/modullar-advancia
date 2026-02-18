/**
 * Unit tests for Stripe service
 */

import { jest } from '@jest/globals';
import Stripe from 'stripe';

// Mock Stripe before importing the service
jest.mock('stripe', () => {
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
  return jest.fn(() => mockStripe);
});

// Mock environment
jest.mock('../config/env', () => ({
  getEnv: jest.fn(() => ({
    STRIPE_SECRET_KEY: 'sk_test_mock_key',
    NODE_ENV: 'test',
  })),
}));

// Import after mocks are set up
import {
  customersService,
  paymentIntentsService,
  refundsService,
  connectService,
  subscriptionsService,
  productsService,
  invoicesService,
  stripe,
} from '../services/stripe.service';

describe('Stripe Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('customersService', () => {
    describe('create', () => {
      it('should create a customer with required fields', async () => {
        const mockCustomer = { id: 'cus_123', email: 'test@example.com' };
        (stripe.customers.create as jest.Mock).mockResolvedValue(mockCustomer);

        const result = await customersService.create({
          email: 'test@example.com',
          name: 'Test User',
          userId: 'user-123',
        });

        expect(stripe.customers.create).toHaveBeenCalledWith({
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
        (stripe.customers.create as jest.Mock).mockResolvedValue(mockCustomer);

        await customersService.create({
          email: 'test@example.com',
          name: 'Test User',
          userId: 'user-123',
          phone: '+1234567890',
          metadata: { source: 'web' },
        });

        expect(stripe.customers.create).toHaveBeenCalledWith({
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
        (stripe.customers.retrieve as jest.Mock).mockResolvedValue(mockCustomer);

        const result = await customersService.get('cus_123');

        expect(stripe.customers.retrieve).toHaveBeenCalledWith('cus_123');
        expect(result).toEqual(mockCustomer);
      });
    });

    describe('update', () => {
      it('should update customer fields', async () => {
        const mockCustomer = { id: 'cus_123', name: 'Updated Name' };
        (stripe.customers.update as jest.Mock).mockResolvedValue(mockCustomer);

        const result = await customersService.update('cus_123', { name: 'Updated Name' });

        expect(stripe.customers.update).toHaveBeenCalledWith('cus_123', {
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
        (stripe.customers.del as jest.Mock).mockResolvedValue(mockDeleted);

        const result = await customersService.delete('cus_123');

        expect(stripe.customers.del).toHaveBeenCalledWith('cus_123');
        expect(result).toEqual(mockDeleted);
      });
    });

    describe('listPaymentMethods', () => {
      it('should list payment methods for a customer', async () => {
        const mockMethods = { data: [{ id: 'pm_123', type: 'card' }] };
        (stripe.paymentMethods.list as jest.Mock).mockResolvedValue(mockMethods);

        const result = await customersService.listPaymentMethods('cus_123');

        expect(stripe.paymentMethods.list).toHaveBeenCalledWith({
          customer: 'cus_123',
          type: 'card',
        });
        expect(result).toEqual(mockMethods);
      });

      it('should allow specifying payment method type', async () => {
        const mockMethods = { data: [] };
        (stripe.paymentMethods.list as jest.Mock).mockResolvedValue(mockMethods);

        await customersService.listPaymentMethods('cus_123', 'us_bank_account');

        expect(stripe.paymentMethods.list).toHaveBeenCalledWith({
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
        (stripe.paymentIntents.create as jest.Mock).mockResolvedValue(mockIntent);

        const result = await paymentIntentsService.create({
          amount: 1000,
          patientId: 'patient-123',
          providerId: 'provider-456',
        });

        expect(stripe.paymentIntents.create).toHaveBeenCalledWith({
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
        (stripe.paymentIntents.create as jest.Mock).mockResolvedValue(mockIntent);

        await paymentIntentsService.create({
          amount: 2000,
          patientId: 'patient-123',
          providerId: 'provider-456',
          customerId: 'cus_789',
          currency: 'eur',
        });

        expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
          expect.objectContaining({
            customer: 'cus_789',
            currency: 'eur',
          })
        );
      });

      it('should include appointment ID and custom description', async () => {
        const mockIntent = { id: 'pi_123' };
        (stripe.paymentIntents.create as jest.Mock).mockResolvedValue(mockIntent);

        await paymentIntentsService.create({
          amount: 5000,
          patientId: 'patient-123',
          providerId: 'provider-456',
          appointmentId: 'apt-789',
          description: 'Dental checkup',
        });

        expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
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
        (stripe.paymentIntents.retrieve as jest.Mock).mockResolvedValue(mockIntent);

        const result = await paymentIntentsService.get('pi_123');

        expect(stripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_123');
        expect(result).toEqual(mockIntent);
      });
    });

    describe('confirm', () => {
      it('should confirm a payment intent', async () => {
        const mockIntent = { id: 'pi_123', status: 'succeeded' };
        (stripe.paymentIntents.confirm as jest.Mock).mockResolvedValue(mockIntent);

        const result = await paymentIntentsService.confirm('pi_123', 'pm_456');

        expect(stripe.paymentIntents.confirm).toHaveBeenCalledWith('pi_123', {
          payment_method: 'pm_456',
        });
        expect(result).toEqual(mockIntent);
      });
    });

    describe('cancel', () => {
      it('should cancel a payment intent', async () => {
        const mockIntent = { id: 'pi_123', status: 'canceled' };
        (stripe.paymentIntents.cancel as jest.Mock).mockResolvedValue(mockIntent);

        const result = await paymentIntentsService.cancel('pi_123');

        expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith('pi_123');
        expect(result).toEqual(mockIntent);
      });
    });

    describe('capture', () => {
      it('should capture a payment intent', async () => {
        const mockIntent = { id: 'pi_123', status: 'succeeded' };
        (stripe.paymentIntents.capture as jest.Mock).mockResolvedValue(mockIntent);

        const result = await paymentIntentsService.capture('pi_123');

        expect(stripe.paymentIntents.capture).toHaveBeenCalledWith('pi_123', {
          amount_to_capture: undefined,
        });
        expect(result).toEqual(mockIntent);
      });

      it('should capture a specific amount', async () => {
        const mockIntent = { id: 'pi_123' };
        (stripe.paymentIntents.capture as jest.Mock).mockResolvedValue(mockIntent);

        await paymentIntentsService.capture('pi_123', 500);

        expect(stripe.paymentIntents.capture).toHaveBeenCalledWith('pi_123', {
          amount_to_capture: 500,
        });
      });
    });

    describe('listByCustomer', () => {
      it('should list payment intents for a customer', async () => {
        const mockIntents = { data: [{ id: 'pi_123' }] };
        (stripe.paymentIntents.list as jest.Mock).mockResolvedValue(mockIntents);

        const result = await paymentIntentsService.listByCustomer('cus_123');

        expect(stripe.paymentIntents.list).toHaveBeenCalledWith({
          customer: 'cus_123',
          limit: 10,
        });
        expect(result).toEqual(mockIntents);
      });

      it('should allow custom limit', async () => {
        const mockIntents = { data: [] };
        (stripe.paymentIntents.list as jest.Mock).mockResolvedValue(mockIntents);

        await paymentIntentsService.listByCustomer('cus_123', 25);

        expect(stripe.paymentIntents.list).toHaveBeenCalledWith({
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
        (stripe.refunds.create as jest.Mock).mockResolvedValue(mockRefund);

        const result = await refundsService.createFull('pi_123');

        expect(stripe.refunds.create).toHaveBeenCalledWith({
          payment_intent: 'pi_123',
          reason: undefined,
        });
        expect(result).toEqual(mockRefund);
      });

      it('should create a full refund with reason', async () => {
        const mockRefund = { id: 're_123', amount: 1000 };
        (stripe.refunds.create as jest.Mock).mockResolvedValue(mockRefund);

        await refundsService.createFull('pi_123', 'requested_by_customer');

        expect(stripe.refunds.create).toHaveBeenCalledWith({
          payment_intent: 'pi_123',
          reason: 'requested_by_customer',
        });
      });
    });

    describe('createPartial', () => {
      it('should create a partial refund', async () => {
        const mockRefund = { id: 're_123', amount: 500 };
        (stripe.refunds.create as jest.Mock).mockResolvedValue(mockRefund);

        await refundsService.createPartial('pi_123', 500, 'requested_by_customer');

        expect(stripe.refunds.create).toHaveBeenCalledWith({
          payment_intent: 'pi_123',
          amount: 500,
          reason: 'requested_by_customer',
        });
      });
    });

    describe('get', () => {
      it('should retrieve a refund by ID', async () => {
        const mockRefund = { id: 're_123' };
        (stripe.refunds.retrieve as jest.Mock).mockResolvedValue(mockRefund);

        const result = await refundsService.get('re_123');

        expect(stripe.refunds.retrieve).toHaveBeenCalledWith('re_123');
        expect(result).toEqual(mockRefund);
      });
    });

    describe('listByPaymentIntent', () => {
      it('should list refunds for a payment intent', async () => {
        const mockRefunds = { data: [{ id: 're_123' }] };
        (stripe.refunds.list as jest.Mock).mockResolvedValue(mockRefunds);

        const result = await refundsService.listByPaymentIntent('pi_123');

        expect(stripe.refunds.list).toHaveBeenCalledWith({
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
        (stripe.products.create as jest.Mock).mockResolvedValue(mockProduct);

        const result = await productsService.create('Test Product', 'A test product');

        expect(stripe.products.create).toHaveBeenCalledWith({
          name: 'Test Product',
          description: 'A test product',
          metadata: undefined,
        });
        expect(result).toEqual(mockProduct);
      });

      it('should create a product with metadata', async () => {
        const mockProduct = { id: 'prod_123' };
        (stripe.products.create as jest.Mock).mockResolvedValue(mockProduct);

        await productsService.create('Test Product', 'Description', { category: 'dental' });

        expect(stripe.products.create).toHaveBeenCalledWith({
          name: 'Test Product',
          description: 'Description',
          metadata: { category: 'dental' },
        });
      });
    });

    describe('list', () => {
      it('should list active products by default', async () => {
        const mockProducts = { data: [{ id: 'prod_123' }] };
        (stripe.products.list as jest.Mock).mockResolvedValue(mockProducts);

        const result = await productsService.list();

        expect(stripe.products.list).toHaveBeenCalledWith({
          active: true,
        });
        expect(result).toEqual(mockProducts);
      });

      it('should allow listing inactive products', async () => {
        const mockProducts = { data: [] };
        (stripe.products.list as jest.Mock).mockResolvedValue(mockProducts);

        await productsService.list(false);

        expect(stripe.products.list).toHaveBeenCalledWith({
          active: false,
        });
      });
    });

    describe('listPrices', () => {
      it('should list prices for a product', async () => {
        const mockPrices = { data: [{ id: 'price_123' }] };
        (stripe.prices.list as jest.Mock).mockResolvedValue(mockPrices);

        const result = await productsService.listPrices('prod_123');

        expect(stripe.prices.list).toHaveBeenCalledWith({
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
      (stripe.paymentIntents.create as jest.Mock).mockRejectedValue(stripeError);

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
      (stripe.customers.retrieve as jest.Mock).mockRejectedValue(networkError);

      await expect(customersService.get('cus_123')).rejects.toThrow('Network timeout');
    });
  });
});
