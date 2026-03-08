/**
 * Payment Orchestration Service Tests
 * Tests: processPayment, getPaymentState, cancelPayment, getPaymentMetrics,
 * smart routing, retry logic, Zod schema validation
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ── Mocks ──

const mockSetCache = jest.fn<any>();
const mockGetCache = jest.fn<any>();
const mockFrom = jest.fn<any>();
const mockServiceFrom = jest.fn<any>();

jest.unstable_mockModule('../lib/supabase.js', () => ({
  supabase: { from: mockFrom },
  createServiceClient: () => ({ from: mockServiceFrom }),
}));

jest.unstable_mockModule('../lib/redis.js', () => ({
  redisHelpers: {
    setCache: mockSetCache,
    getCache: mockGetCache,
    deleteCache: jest.fn(),
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

const {
  PaymentOrchestrationService,
  PaymentOrchestrationRequest,
  SmartRoutingConfig,
  paymentOrchestrationService,
} = await import('../services/payment-orchestration.service.js');

// ── Helpers ──

function validRequest(overrides: Record<string, any> = {}) {
  return {
    amount: 100,
    currency: 'USD',
    customerId: '550e8400-e29b-41d4-a716-446655440000',
    paymentMethodId: 'pm_abc123',
    ...overrides,
  };
}

function dbChain(data: any = null, error: any = null) {
  return {
    select: jest.fn<any>().mockReturnValue({
      eq: jest.fn<any>().mockReturnValue({
        single: jest.fn<any>().mockResolvedValue({ data, error }),
      }),
    }),
    upsert: jest.fn<any>().mockResolvedValue({ error: null }),
    insert: jest.fn<any>().mockResolvedValue({ error: null }),
  };
}

// ── Tests ──

describe('PaymentOrchestrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock: routing config fetch returns null customer (uses defaults)
    mockFrom.mockReturnValue(dbChain(null));
    mockServiceFrom.mockReturnValue(dbChain(null));
    mockSetCache.mockResolvedValue(undefined);
    mockGetCache.mockResolvedValue(null);
  });

  describe('Zod schemas', () => {
    it('PaymentOrchestrationRequest validates a correct request', () => {
      const result = PaymentOrchestrationRequest.safeParse(validRequest());
      expect(result.success).toBe(true);
    });

    it('PaymentOrchestrationRequest rejects non-positive amount', () => {
      const result = PaymentOrchestrationRequest.safeParse(validRequest({ amount: -10 }));
      expect(result.success).toBe(false);
    });

    it('PaymentOrchestrationRequest rejects invalid currency length', () => {
      const result = PaymentOrchestrationRequest.safeParse(validRequest({ currency: 'DOLLAR' }));
      expect(result.success).toBe(false);
    });

    it('PaymentOrchestrationRequest rejects non-UUID customerId', () => {
      const result = PaymentOrchestrationRequest.safeParse(
        validRequest({ customerId: 'not-a-uuid' })
      );
      expect(result.success).toBe(false);
    });

    it('SmartRoutingConfig validates correct config', () => {
      const result = SmartRoutingConfig.safeParse({
        primaryProvider: 'stripe',
        fallbackProviders: ['square'],
      });
      expect(result.success).toBe(true);
    });

    it('SmartRoutingConfig rejects invalid provider', () => {
      const result = SmartRoutingConfig.safeParse({
        primaryProvider: 'paypal',
        fallbackProviders: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('processPayment', () => {
    it('returns a PaymentResult with expected shape', async () => {
      const result = await paymentOrchestrationService.processPayment(validRequest());

      expect(result).toEqual(
        expect.objectContaining({
          success: expect.any(Boolean),
          provider: expect.any(String),
          attempt: expect.any(Number),
          processingTime: expect.any(Number),
        })
      );
    });

    it('caches payment state in Redis', async () => {
      await paymentOrchestrationService.processPayment(validRequest());

      // initializePaymentState and updatePaymentState both call setCache
      expect(mockSetCache).toHaveBeenCalled();
      const firstCallKey = mockSetCache.mock.calls[0][0] as string;
      expect(firstCallKey).toContain('payment_orchestration:');
    });

    it('stores metrics in database', async () => {
      await paymentOrchestrationService.processPayment(validRequest());

      // recordPaymentMetrics inserts into payment_orchestration_metrics
      expect(mockFrom).toHaveBeenCalledWith('payment_orchestration_metrics');
    });

    it('records state in payment_orchestration_state table', async () => {
      await paymentOrchestrationService.processPayment(validRequest());

      expect(mockFrom).toHaveBeenCalledWith('payment_orchestration_state');
    });

    it('returns failure when request validation fails', async () => {
      const badRequest = { amount: -50, currency: 'X', customerId: 'bad', paymentMethodId: '' };

      const result = await paymentOrchestrationService.processPayment(badRequest as any);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('uses custom retry config when provided', async () => {
      const request = validRequest({
        retryConfig: { maxAttempts: 1, backoffMultiplier: 1, initialDelayMs: 10 },
      });
      const result = await paymentOrchestrationService.processPayment(request);

      expect(result).toEqual(
        expect.objectContaining({
          success: expect.any(Boolean),
          attempt: expect.any(Number),
        })
      );
    });
  });

  describe('getPaymentState', () => {
    it('returns cached state from Redis', async () => {
      const mockState = { id: 'po_123', status: 'completed', attempts: [] };
      mockGetCache.mockResolvedValue(mockState);

      const result = await paymentOrchestrationService.getPaymentState('po_123');

      expect(result).toEqual(mockState);
      expect(mockGetCache).toHaveBeenCalledWith('payment_orchestration:po_123');
    });

    it('falls back to database when Redis misses', async () => {
      mockGetCache.mockResolvedValue(null);
      const dbState = { id: 'po_456', status: 'pending', attempts: [] };
      mockFrom.mockReturnValue(dbChain({ state: dbState }));

      const result = await paymentOrchestrationService.getPaymentState('po_456');

      expect(result).toEqual(dbState);
    });

    it('returns null when not found anywhere', async () => {
      mockGetCache.mockResolvedValue(null);
      mockFrom.mockReturnValue(dbChain(null));

      const result = await paymentOrchestrationService.getPaymentState('po_nonexistent');

      expect(result).toBeNull();
    });

    it('returns null on error', async () => {
      mockGetCache.mockRejectedValue(new Error('Redis down'));

      const result = await paymentOrchestrationService.getPaymentState('po_err');

      expect(result).toBeNull();
    });
  });

  describe('cancelPayment', () => {
    it('cancels a pending payment', async () => {
      const state = {
        id: 'po_cancel',
        status: 'pending',
        attempts: [],
        originalRequest: validRequest(),
      };
      mockGetCache.mockResolvedValue(state);

      const result = await paymentOrchestrationService.cancelPayment('po_cancel');

      expect(result).toBe(true);
      // Should update state to cancelled
      expect(mockSetCache).toHaveBeenCalled();
    });

    it('returns false for already completed payment', async () => {
      mockGetCache.mockResolvedValue({
        id: 'po_done',
        status: 'completed',
        attempts: [],
      });

      const result = await paymentOrchestrationService.cancelPayment('po_done');

      expect(result).toBe(false);
    });

    it('returns false when payment not found', async () => {
      mockGetCache.mockResolvedValue(null);
      mockFrom.mockReturnValue(dbChain(null));

      const result = await paymentOrchestrationService.cancelPayment('po_missing');

      expect(result).toBe(false);
    });

    it('returns false on error', async () => {
      mockGetCache.mockRejectedValue(new Error('fail'));

      const result = await paymentOrchestrationService.cancelPayment('po_err');

      expect(result).toBe(false);
    });
  });

  describe('getPaymentMetrics', () => {
    it('returns metrics from database', async () => {
      const metrics = [{ payment_id: 'po_1', success: true }];
      mockServiceFrom.mockReturnValue({
        select: jest.fn<any>().mockReturnValue({
          eq: jest.fn<any>().mockResolvedValue({ data: metrics, error: null }),
        }),
      });

      const result = await paymentOrchestrationService.getPaymentMetrics('po_1');

      expect(result).toEqual({ paymentId: 'po_1', metrics });
    });

    it('returns empty metrics on database error', async () => {
      mockServiceFrom.mockReturnValue({
        select: jest.fn<any>().mockReturnValue({
          eq: jest.fn<any>().mockResolvedValue({ data: null, error: { message: 'fail' } }),
        }),
      });

      const result = await paymentOrchestrationService.getPaymentMetrics('po_fail');

      expect(result).toEqual({ paymentId: 'po_fail', metrics: [] });
    });

    it('returns empty metrics on exception', async () => {
      mockServiceFrom.mockReturnValue({
        select: jest.fn<any>().mockReturnValue({
          eq: jest.fn<any>().mockRejectedValue(new Error('boom')),
        }),
      });

      const result = await paymentOrchestrationService.getPaymentMetrics('po_boom');

      expect(result).toEqual({ paymentId: 'po_boom', metrics: [] });
    });
  });

  describe('singleton', () => {
    it('exports a PaymentOrchestrationService instance', () => {
      expect(paymentOrchestrationService).toBeInstanceOf(PaymentOrchestrationService);
    });
  });
});
