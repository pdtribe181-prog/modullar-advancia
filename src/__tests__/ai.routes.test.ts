/**
 * AI Routes Tests
 * Tests for healthcare AI endpoints ported from muchaeljohn739337-art
 */

import { jest, describe, it, expect, beforeAll } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// ── Mocks ──

jest.unstable_mockModule('../middleware/logging.middleware.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  requestId: (_req: Request, _res: Response, next: NextFunction) => next(),
  requestLogger: (_req: Request, _res: Response, next: NextFunction) => next(),
  errorHandler: (err: any, _req: Request, res: Response, _next: NextFunction) => {
    res.status(err.status || 500).json({ error: err.message });
  },
  notFoundHandler: (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  },
}));

jest.unstable_mockModule('../middleware/rateLimit.middleware.js', () => ({
  authLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  apiLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  sensitiveLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

let request: any;
let express: any;

beforeAll(async () => {
  const supertest = await import('supertest');
  request = supertest.default ?? supertest;
  const expressModule = await import('express');
  express = expressModule.default ?? expressModule;
});

function createTestApp() {
  const app = express();
  app.use(express.json());
  return app;
}

describe('AI Routes', () => {
  let app: ReturnType<typeof express>;

  beforeAll(async () => {
    app = createTestApp();
    const { default: aiRoutes } = await import('../routes/ai.routes.js');
    app.use('/ai', aiRoutes);
  });

  // ────────────── GET /ai/services ──────────────

  describe('GET /ai/services', () => {
    it('returns list of AI endpoints', async () => {
      const res = await request(app).get('/ai/services');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.endpoints).toBeInstanceOf(Array);
      expect(res.body.endpoints.length).toBe(5);
      expect(res.body.endpoints[0]).toHaveProperty('path');
      expect(res.body.endpoints[0]).toHaveProperty('description');
    });
  });

  // ────────────── POST /ai/chat ──────────────

  describe('POST /ai/chat', () => {
    it('returns AI response for valid message', async () => {
      const res = await request(app).post('/ai/chat').send({ message: 'How do I make a payment?' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.response).toBeDefined();
      expect(res.body.timestamp).toBeDefined();
    });

    it('returns 400 when message is missing', async () => {
      const res = await request(app).post('/ai/chat').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('accepts optional context parameter', async () => {
      const res = await request(app)
        .post('/ai/chat')
        .send({ message: 'billing question', context: 'insurance' });

      expect(res.status).toBe(200);
      expect(res.body.context).toBe('insurance');
    });
  });

  // ────────────── POST /ai/medical-coding ──────────────

  describe('POST /ai/medical-coding', () => {
    it('returns billing codes for procedure/diagnosis', async () => {
      const res = await request(app)
        .post('/ai/medical-coding')
        .send({ procedure: 'routine checkup', diagnosis: 'annual physical' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.aiResponse).toBeDefined();
      expect(res.body.compliance).toBe('HIPAA compliant processing');
    });

    it('returns 400 when both fields missing', async () => {
      const res = await request(app).post('/ai/medical-coding').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('works with only procedure', async () => {
      const res = await request(app).post('/ai/medical-coding').send({ procedure: 'MRI scan' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ────────────── POST /ai/fraud-detection ──────────────

  describe('POST /ai/fraud-detection', () => {
    it('returns fraud risk assessment', async () => {
      const res = await request(app)
        .post('/ai/fraud-detection')
        .send({
          transaction: {
            id: 'txn-123',
            amount: 150.0,
            currency: 'USD',
            providerCode: 'PRV-001',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.transactionId).toBe('txn-123');
      expect(res.body.aiAnalysis).toBeDefined();
      expect(typeof res.body.riskScore).toBe('number');
    });

    it('returns 400 when transaction missing', async () => {
      const res = await request(app).post('/ai/fraud-detection').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ────────────── POST /ai/patient-support ──────────────

  describe('POST /ai/patient-support', () => {
    it('returns patient support response', async () => {
      const res = await request(app)
        .post('/ai/patient-support')
        .send({ query: 'What are my payment options?' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.aiResponse).toBeDefined();
      expect(res.body.compliance).toBe('HIPAA compliant interaction');
    });

    it('masks patient ID in response', async () => {
      const res = await request(app)
        .post('/ai/patient-support')
        .send({ query: 'Check my balance', patientId: 'PAT-12345' });

      expect(res.status).toBe(200);
      expect(res.body.patientId).toBe('***-**-****');
    });

    it('returns anonymous when no patientId', async () => {
      const res = await request(app)
        .post('/ai/patient-support')
        .send({ query: 'General question' });

      expect(res.status).toBe(200);
      expect(res.body.patientId).toBe('anonymous');
    });

    it('returns 400 when query missing', async () => {
      const res = await request(app).post('/ai/patient-support').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ────────────── POST /ai/compliance-check ──────────────

  describe('POST /ai/compliance-check', () => {
    it('returns compliance assessment', async () => {
      const res = await request(app)
        .post('/ai/compliance-check')
        .send({ process: 'Patient data storage', data: 'PHI' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.complianceAnalysis).toBeDefined();
      expect(typeof res.body.complianceScore).toBe('number');
      expect(res.body.auditor).toBe('AI Compliance Assistant');
    });

    it('returns 400 when fields missing', async () => {
      const res = await request(app).post('/ai/compliance-check').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
