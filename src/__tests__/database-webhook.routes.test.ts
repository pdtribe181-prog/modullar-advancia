/**
 * Database Webhook Routes Tests
 * Covers: POST / (generic), POST /transactions, POST /disputes,
 *   POST /appointments, POST /wallet-transactions, GET /health,
 *   verifyWebhook middleware, HMAC signature verification
 */
import { jest } from '@jest/globals';
import crypto from 'crypto';

// Mock databaseWebhookService
const mockHandleTransaction = jest.fn<any>().mockResolvedValue(undefined);
const mockHandleDispute = jest.fn<any>().mockResolvedValue(undefined);
const mockHandleAppointment = jest.fn<any>().mockResolvedValue(undefined);
const mockHandleWalletTransaction = jest.fn<any>().mockResolvedValue(undefined);

jest.unstable_mockModule('../services/database-webhook.service.js', () => ({
  databaseWebhookService: {
    handleTransaction: mockHandleTransaction,
    handleDispute: mockHandleDispute,
    handleAppointment: mockHandleAppointment,
    handleWalletTransaction: mockHandleWalletTransaction,
  },
  WebhookPayload: {},
  TransactionRecord: {},
  DisputeRecord: {},
  AppointmentRecord: {},
  WalletTransactionRecord: {},
}));

// Mock rate limiter
jest.unstable_mockModule('../middleware/rateLimit.middleware.js', () => ({
  webhookLimiter: (_req: any, _res: any, next: any) => next(),
}));

// Mock logger
jest.unstable_mockModule('../middleware/logging.middleware.js', () => ({
  logger: {
    info: jest.fn<any>(),
    warn: jest.fn<any>(),
    error: jest.fn<any>(),
    debug: jest.fn<any>(),
  },
}));

// Mock env — provide a webhook secret for signature tests
const WEBHOOK_SECRET = 'test-webhook-secret-123';
jest.unstable_mockModule('../config/env.js', () => ({
  getEnv: () => ({ SUPABASE_WEBHOOK_SECRET: WEBHOOK_SECRET }),
}));

// Mock errors
jest.unstable_mockModule('../utils/errors.js', () => {
  class AppError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
    static badRequest(msg: string) { return new AppError(msg, 400); }
    static unauthorized(msg: string) { return new AppError(msg, 401); }
    static notFound(msg: string) { return new AppError(msg, 404); }
    static internal(msg: string) { return new AppError(msg, 500); }
  }
  return {
    AppError,
    asyncHandler: (fn: any) => async (req: any, res: any, next: any) => {
      try { await fn(req, res, next); } catch (e) { next(e); }
    },
  };
});

const { default: webhookRouter } = await import('../routes/database-webhook.routes.js');

const expressModule = await import('express');
const express = expressModule.default;
const { default: request } = await import('supertest');

let app: any;

/** Compute valid HMAC signature for a payload */
function sign(body: object): string {
  return crypto.createHmac('sha256', WEBHOOK_SECRET).update(JSON.stringify(body)).digest('hex');
}

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/webhooks', webhookRouter);
  // Error handler
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.statusCode || 500).json({ error: err.message });
  });
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Database Webhook Routes', () => {
  // ---- Health ----
  describe('GET /webhooks/health', () => {
    it('returns health status', async () => {
      const res = await request(app).get('/webhooks/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('database-webhooks');
    });
  });

  // ---- Generic POST / ----
  describe('POST /webhooks (generic)', () => {
    it('routes transaction payload to handleTransaction', async () => {
      const body = { table: 'transactions', type: 'INSERT', schema: 'public', record: { id: 'tx-1' }, old_record: null };
      const res = await request(app)
        .post('/webhooks')
        .set('x-supabase-signature', sign(body))
        .send(body);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, received: true });
      expect(mockHandleTransaction).toHaveBeenCalled();
    });

    it('routes dispute payload to handleDispute', async () => {
      const body = { table: 'disputes', type: 'INSERT', schema: 'public', record: { id: 'd-1' }, old_record: null };
      const res = await request(app)
        .post('/webhooks')
        .set('x-supabase-signature', sign(body))
        .send(body);
      expect(res.status).toBe(200);
      expect(mockHandleDispute).toHaveBeenCalled();
    });

    it('routes appointment payload to handleAppointment', async () => {
      const body = { table: 'appointments', type: 'INSERT', schema: 'public', record: { id: 'a-1' }, old_record: null };
      const res = await request(app)
        .post('/webhooks')
        .set('x-supabase-signature', sign(body))
        .send(body);
      expect(res.status).toBe(200);
      expect(mockHandleAppointment).toHaveBeenCalled();
    });

    it('routes wallet_transactions to handleWalletTransaction', async () => {
      const body = { table: 'wallet_transactions', type: 'UPDATE', schema: 'public', record: { id: 'wt-1' }, old_record: null };
      const res = await request(app)
        .post('/webhooks')
        .set('x-supabase-signature', sign(body))
        .send(body);
      expect(res.status).toBe(200);
      expect(mockHandleWalletTransaction).toHaveBeenCalled();
    });

    it('handles unknown table gracefully', async () => {
      const body = { table: 'unknown_table', type: 'INSERT', schema: 'public', record: { id: 'x' }, old_record: null };
      const res = await request(app)
        .post('/webhooks')
        .set('x-supabase-signature', sign(body))
        .send(body);
      expect(res.status).toBe(200);
    });

    it('rejects payload with missing table/type', async () => {
      const body = { schema: 'public' };
      const res = await request(app)
        .post('/webhooks')
        .set('x-supabase-signature', sign(body))
        .send(body);
      expect(res.status).toBe(400);
    });
  });

  // ---- Specific routes ----
  describe('POST /webhooks/transactions', () => {
    it('processes transaction webhook', async () => {
      const body = { type: 'INSERT', table: 'transactions', schema: 'public', record: { id: 'tx-1' }, old_record: null };
      const res = await request(app)
        .post('/webhooks/transactions')
        .set('x-supabase-signature', sign(body))
        .send(body);
      expect(res.status).toBe(200);
      expect(mockHandleTransaction).toHaveBeenCalled();
    });
  });

  describe('POST /webhooks/disputes', () => {
    it('processes dispute webhook', async () => {
      const body = { type: 'INSERT', table: 'disputes', schema: 'public', record: { id: 'd-1' }, old_record: null };
      const res = await request(app)
        .post('/webhooks/disputes')
        .set('x-supabase-signature', sign(body))
        .send(body);
      expect(res.status).toBe(200);
      expect(mockHandleDispute).toHaveBeenCalled();
    });
  });

  describe('POST /webhooks/appointments', () => {
    it('processes appointment webhook', async () => {
      const body = { type: 'INSERT', table: 'appointments', schema: 'public', record: { id: 'a-1' }, old_record: null };
      const res = await request(app)
        .post('/webhooks/appointments')
        .set('x-supabase-signature', sign(body))
        .send(body);
      expect(res.status).toBe(200);
      expect(mockHandleAppointment).toHaveBeenCalled();
    });
  });

  describe('POST /webhooks/wallet-transactions', () => {
    it('processes wallet transaction webhook', async () => {
      const body = { type: 'UPDATE', table: 'wallet_transactions', schema: 'public', record: { id: 'wt-1' }, old_record: null };
      const res = await request(app)
        .post('/webhooks/wallet-transactions')
        .set('x-supabase-signature', sign(body))
        .send(body);
      expect(res.status).toBe(200);
      expect(mockHandleWalletTransaction).toHaveBeenCalled();
    });
  });

  // ---- Signature verification ----
  describe('Webhook signature verification', () => {
    it('rejects request with invalid signature', async () => {
      const body = { table: 'transactions', type: 'INSERT', schema: 'public', record: { id: 'tx-1' }, old_record: null };
      // Compute a valid-length but wrong signature (same length as real HMAC hex)
      const wrongSig = 'a'.repeat(64); // SHA-256 hex is 64 chars
      const res = await request(app)
        .post('/webhooks')
        .set('x-supabase-signature', wrongSig)
        .send(body);
      expect(res.status).toBe(401);
    });

    it('rejects request with missing signature', async () => {
      const body = { table: 'transactions', type: 'INSERT', schema: 'public', record: { id: 'tx-1' }, old_record: null };
      const res = await request(app)
        .post('/webhooks')
        .send(body);
      expect(res.status).toBe(401);
    });
  });
});
