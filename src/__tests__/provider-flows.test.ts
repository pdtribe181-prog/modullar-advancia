/**
 * Provider Flow Tests
 * Tests for appointment management, earnings, schedule, and profile update flows
 * (Complements provider.routes.test.ts which covers GET /provider list and GET /me)
 */

import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// ── Mocks ──

const mockFrom = jest.fn<any>();
const mockGetBalance = jest.fn<any>();
const mockRefundCreateFull = jest.fn<any>();

jest.unstable_mockModule('../lib/supabase.js', () => ({
  supabase: { from: mockFrom },
  createServiceClient: () => ({ from: mockFrom }),
}));

jest.unstable_mockModule('../services/stripe.service.js', () => ({
  stripeServices: {
    connect: { getBalance: mockGetBalance },
    refunds: { createFull: mockRefundCreateFull },
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

jest.unstable_mockModule('../middleware/rateLimit.middleware.js', () => ({
  authLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  apiLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  sensitiveLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  onboardingLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

const PROVIDER_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const PROVIDER_ID = 'prov-0001';
const APT_ID = 'a1111111-1111-4111-a111-111111111111'; // valid UUIDv4
const PATIENT_USER_ID = 'b2222222-2222-4222-a222-222222222222';

jest.unstable_mockModule('../middleware/auth.middleware.js', () => ({
  authenticate: (req: any, _res: Response, next: NextFunction) => {
    req.user = { id: PROVIDER_USER_ID, email: 'dr@example.com' };
    next();
  },
  authenticateWithProfile: (req: any, _res: Response, next: NextFunction) => {
    req.user = { id: PROVIDER_USER_ID, email: 'dr@example.com' };
    req.userProfile = { id: PROVIDER_USER_ID, role: 'provider' };
    next();
  },
  requireRole:
    (..._roles: string[]) =>
    (_req: Request, _res: Response, next: NextFunction) =>
      next(),
  AuthenticatedRequest: {},
}));

jest.unstable_mockModule('../middleware/validation.middleware.js', () => ({
  validateBody: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  validateParams: () => (req: Request, res: Response, next: NextFunction) => {
    (res.locals as any).validatedParams = req.params;
    next();
  },
  validateQuery: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}));

const mockEnv = { FRONTEND_URL: 'http://localhost:5173' } as any;
jest.unstable_mockModule('../config/env.js', () => ({
  getEnv: () => mockEnv,
  validateEnv: () => mockEnv,
}));

// ── Dynamic imports ──

const { default: express } = await import('express');
const { default: request } = await import('supertest');
const { default: providerRouter } = await import('../routes/provider.routes.js');
const { sendErrorResponse } = await import('../utils/errors.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/provider', providerRouter);
  app.use((err: any, _req: any, res: any, _next: any) => {
    sendErrorResponse(res, err, undefined);
  });
  return app;
}

// ── Helpers ──

/** Build a Supabase chain mock that resolves to a single value */
function singleChain(data: any, error: any = null) {
  const result = { data, error };
  const chain: any = {};
  chain.select = jest.fn<any>().mockReturnValue(chain);
  chain.eq = jest.fn<any>().mockReturnValue(chain);
  chain.in = jest.fn<any>().mockReturnValue(chain);
  chain.gte = jest.fn<any>().mockReturnValue(chain);
  chain.lte = jest.fn<any>().mockReturnValue(chain);
  chain.ilike = jest.fn<any>().mockReturnValue(chain);
  chain.or = jest.fn<any>().mockReturnValue(chain);
  chain.order = jest.fn<any>().mockReturnValue(chain);
  chain.range = jest.fn<any>().mockReturnValue(chain);
  chain.update = jest.fn<any>().mockReturnValue(chain);
  chain.single = jest.fn<any>().mockResolvedValue(result);
  return chain;
}

function listChain(data: any[], error: any = null) {
  const result = { data, error, count: data.length };
  const chain: any = {};
  chain.select = jest.fn<any>().mockReturnValue(chain);
  chain.eq = jest.fn<any>().mockReturnValue(chain);
  chain.in = jest.fn<any>().mockReturnValue(chain);
  chain.gte = jest.fn<any>().mockReturnValue(chain);
  chain.lte = jest.fn<any>().mockReturnValue(chain);
  chain.ilike = jest.fn<any>().mockReturnValue(chain);
  chain.or = jest.fn<any>().mockReturnValue(chain);
  chain.order = jest.fn<any>().mockReturnValue(chain);
  chain.range = jest.fn<any>().mockReturnValue(chain);
  // Make thenable so `await query` works
  chain.then = (resolve: any) => resolve(result);
  return chain;
}

// ── Tests ──

describe('Provider Flows', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  // ────────────── PUT /provider/me ──────────────

  describe('PUT /provider/me (update profile)', () => {
    it('updates provider profile', async () => {
      const updated = {
        id: PROVIDER_ID,
        user_id: PROVIDER_USER_ID,
        business_name: 'New Clinic Name',
        specialty: 'Cardiology',
        consultation_fee: 150,
      };

      const chain = singleChain(updated);
      mockFrom.mockReturnValue(chain);

      const res = await request(app)
        .put('/provider/me')
        .set('Authorization', 'Bearer token')
        .send({ businessName: 'New Clinic Name', specialty: 'Cardiology', consultationFee: 150 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.provider.business_name).toBe('New Clinic Name');
    });
  });

  // ────────────── GET /provider/appointments ──────────────

  describe('GET /provider/appointments', () => {
    it('lists appointments with patient enrichment', async () => {
      const providerRow = { id: PROVIDER_ID };
      const appointments = [
        {
          id: APT_ID,
          appointment_date: '2025-01-15',
          appointment_time: '09:00',
          duration_minutes: 30,
          reason: 'Checkup',
          status: 'scheduled',
          payment_status: 'pending',
          patient: { id: 'pat-1', user_id: PATIENT_USER_ID },
        },
      ];
      const patientProfile = { full_name: 'Jane Doe', email: 'jane@example.com' };

      // 1st from() → providers lookup (single)
      mockFrom.mockReturnValueOnce(singleChain(providerRow));
      // 2nd from() → appointments list (thenable chain)
      mockFrom.mockReturnValueOnce(listChain(appointments));
      // 3rd from() → user_profiles for patient enrichment
      mockFrom.mockReturnValueOnce(singleChain(patientProfile));

      const res = await request(app)
        .get('/provider/appointments')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data.appointments).toHaveLength(1);
      expect(res.body.data.appointments[0].patient.name).toBe('Jane Doe');
    });

    it('returns 404 if provider not found', async () => {
      mockFrom.mockReturnValueOnce(singleChain(null, { code: 'PGRST116' }));

      const res = await request(app)
        .get('/provider/appointments')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
    });
  });

  // ────────────── GET /provider/appointments/:id ──────────────

  describe('GET /provider/appointments/:id', () => {
    it('returns single appointment with patient details', async () => {
      const providerRow = { id: PROVIDER_ID };
      const apt = {
        id: APT_ID,
        appointment_date: '2025-01-15',
        appointment_time: '09:00',
        status: 'scheduled',
        patient: { id: 'pat-1', user_id: PATIENT_USER_ID },
      };
      const patientProfile = { full_name: 'Jane Doe', email: 'jane@example.com', phone: '+1234' };

      mockFrom
        .mockReturnValueOnce(singleChain(providerRow))
        .mockReturnValueOnce(singleChain(apt))
        .mockReturnValueOnce(singleChain(patientProfile));

      const res = await request(app)
        .get(`/provider/appointments/${APT_ID}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data.appointment.id).toBe(APT_ID);
    });

    it('returns 404 for unknown appointment', async () => {
      mockFrom
        .mockReturnValueOnce(singleChain({ id: PROVIDER_ID }))
        .mockReturnValueOnce(singleChain(null, { code: 'PGRST116' }));

      const res = await request(app)
        .get(`/provider/appointments/${APT_ID}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
    });

    it('returns 404 when provider is missing (even with valid id)', async () => {
      mockFrom.mockReturnValueOnce(singleChain(null, { code: 'PGRST116' }));

      const res = await request(app)
        .get(`/provider/appointments/${APT_ID}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
    });
  });

  // ────────────── POST /provider/appointments/:id/confirm ──────────────

  describe('POST /provider/appointments/:id/confirm', () => {
    it('confirms a scheduled appointment', async () => {
      const confirmed = { id: APT_ID, status: 'confirmed' };

      mockFrom
        .mockReturnValueOnce(singleChain({ id: PROVIDER_ID }))
        .mockReturnValueOnce(singleChain(confirmed));

      const res = await request(app)
        .post(`/provider/appointments/${APT_ID}/confirm`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('confirmed');
    });

    it('returns 404 when appointment not found or wrong status', async () => {
      mockFrom
        .mockReturnValueOnce(singleChain({ id: PROVIDER_ID }))
        .mockReturnValueOnce(singleChain(null, { code: 'PGRST116' }));

      const res = await request(app)
        .post(`/provider/appointments/${APT_ID}/confirm`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
    });
  });

  // ────────────── POST /provider/appointments/:id/complete ──────────────

  describe('POST /provider/appointments/:id/complete', () => {
    it('completes an appointment with notes', async () => {
      const completed = {
        id: APT_ID,
        status: 'completed',
        notes: 'Patient stable',
        completed_at: '2025-01-15T10:00:00Z',
      };

      mockFrom
        .mockReturnValueOnce(singleChain({ id: PROVIDER_ID }))
        .mockReturnValueOnce(singleChain(completed));

      const res = await request(app)
        .post(`/provider/appointments/${APT_ID}/complete`)
        .set('Authorization', 'Bearer token')
        .send({ notes: 'Patient stable' });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('completed');
      expect(res.body.data.appointment.notes).toBe('Patient stable');
    });

    it('returns 404 if provider profile missing', async () => {
      mockFrom.mockReturnValueOnce(singleChain(null, { code: 'PGRST116' }));

      const res = await request(app)
        .post(`/provider/appointments/${APT_ID}/complete`)
        .set('Authorization', 'Bearer token')
        .send({});

      expect(res.status).toBe(404);
    });
  });

  // ────────────── POST /provider/appointments/:id/cancel ──────────────

  describe('POST /provider/appointments/:id/cancel', () => {
    it('cancels appointment and issues refund', async () => {
      const fetchedApt = {
        id: APT_ID,
        status: 'scheduled',
        payment_status: 'paid',
        stripe_payment_intent_id: 'pi_refundme',
      };
      const cancelledApt = {
        id: APT_ID,
        status: 'cancelled',
        cancellation_reason: 'Provider unavailable',
        cancelled_by: 'provider',
      };

      mockRefundCreateFull.mockResolvedValue({ id: 're_123' });

      mockFrom
        .mockReturnValueOnce(singleChain({ id: PROVIDER_ID })) // providers lookup
        .mockReturnValueOnce(singleChain(fetchedApt)) // fetch appointment
        .mockReturnValueOnce(singleChain(cancelledApt)); // update appointment

      const res = await request(app)
        .post(`/provider/appointments/${APT_ID}/cancel`)
        .set('Authorization', 'Bearer token')
        .send({ reason: 'Provider unavailable' });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('cancelled');
      expect(mockRefundCreateFull).toHaveBeenCalledWith('pi_refundme', 'requested_by_customer');
    });

    it('cancels appointment without refund when unpaid', async () => {
      const fetchedApt = {
        id: APT_ID,
        status: 'confirmed',
        payment_status: 'pending',
        stripe_payment_intent_id: null,
      };
      const cancelledApt = { id: APT_ID, status: 'cancelled' };

      mockFrom
        .mockReturnValueOnce(singleChain({ id: PROVIDER_ID }))
        .mockReturnValueOnce(singleChain(fetchedApt))
        .mockReturnValueOnce(singleChain(cancelledApt));

      const res = await request(app)
        .post(`/provider/appointments/${APT_ID}/cancel`)
        .set('Authorization', 'Bearer token')
        .send({});

      expect(res.status).toBe(200);
      expect(mockRefundCreateFull).not.toHaveBeenCalled();
    });

    it('still cancels even when refund fails', async () => {
      const fetchedApt = {
        id: APT_ID,
        status: 'scheduled',
        payment_status: 'paid',
        stripe_payment_intent_id: 'pi_failrefund',
      };
      const cancelledApt = { id: APT_ID, status: 'cancelled' };

      mockRefundCreateFull.mockRejectedValue(new Error('Stripe error'));

      mockFrom
        .mockReturnValueOnce(singleChain({ id: PROVIDER_ID }))
        .mockReturnValueOnce(singleChain(fetchedApt))
        .mockReturnValueOnce(singleChain(cancelledApt));

      const res = await request(app)
        .post(`/provider/appointments/${APT_ID}/cancel`)
        .set('Authorization', 'Bearer token')
        .send({});

      expect(res.status).toBe(200); // still succeeds
    });

    it('rejects cancellation for completed appointment', async () => {
      const fetchedApt = {
        id: APT_ID,
        status: 'completed',
        payment_status: 'paid',
        stripe_payment_intent_id: 'pi_x',
      };

      mockFrom
        .mockReturnValueOnce(singleChain({ id: PROVIDER_ID }))
        .mockReturnValueOnce(singleChain(fetchedApt));

      const res = await request(app)
        .post(`/provider/appointments/${APT_ID}/cancel`)
        .set('Authorization', 'Bearer token')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ────────────── GET /provider/earnings ──────────────

  describe('GET /provider/earnings', () => {
    it('returns earnings summary with Stripe balance', async () => {
      const provider = { id: PROVIDER_ID, stripe_account_id: 'acct_prov1' };
      const appointments = [
        { id: 'a1', appointment_date: '2025-01-10', payment_status: 'paid' },
        { id: 'a2', appointment_date: '2025-01-14', payment_status: 'paid' },
      ];

      mockGetBalance.mockResolvedValue({
        available: [{ amount: 20000, currency: 'usd' }],
        pending: [{ amount: 5000, currency: 'usd' }],
      });

      // 1st call → provider lookup
      mockFrom.mockReturnValueOnce(singleChain(provider));
      // 2nd call → appointments (list) — chain ends at .lte()
      mockFrom.mockReturnValueOnce(listChain(appointments));
      // 3rd call → provider consultation_fee
      mockFrom.mockReturnValueOnce(singleChain({ consultation_fee: 100 }));

      const res = await request(app)
        .get('/provider/earnings?period=30')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data.completedAppointments).toBe(2);
      expect(res.body.data.totalEarnings).toBe(200);
      expect(res.body.data.stripeBalance).toBeDefined();
      expect(res.body.data.stripeBalance.available).toBe(200); // 20000 / 100
    });

    it('returns earnings without Stripe balance when not connected', async () => {
      const provider = { id: PROVIDER_ID, stripe_account_id: null };

      mockFrom.mockReturnValueOnce(singleChain(provider));
      mockFrom.mockReturnValueOnce(listChain([]));
      mockFrom.mockReturnValueOnce(singleChain({ consultation_fee: 100 }));

      const res = await request(app)
        .get('/provider/earnings?period=30')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data.stripeBalance).toBeNull();
      expect(res.body.data.completedAppointments).toBe(0);
    });
  });

  // ────────────── GET /provider/schedule ──────────────

  describe('GET /provider/schedule', () => {
    it('returns schedule grouped by date', async () => {
      const appointments = [
        {
          id: 'a1',
          appointment_date: '2025-02-01',
          appointment_time: '09:00',
          duration_minutes: 30,
          status: 'scheduled',
          reason: 'Checkup',
          patient: { id: 'pat-1' },
        },
        {
          id: 'a2',
          appointment_date: '2025-02-01',
          appointment_time: '10:00',
          duration_minutes: 60,
          status: 'confirmed',
          reason: 'Follow-up',
          patient: { id: 'pat-2' },
        },
        {
          id: 'a3',
          appointment_date: '2025-02-02',
          appointment_time: '14:00',
          duration_minutes: 30,
          status: 'scheduled',
          reason: null,
          patient: { id: 'pat-3' },
        },
      ];

      // providers lookup
      mockFrom.mockReturnValueOnce(singleChain({ id: PROVIDER_ID }));
      // appointments query — use listChain that resolves via .then()
      mockFrom.mockReturnValueOnce(listChain(appointments));

      const res = await request(app)
        .get('/provider/schedule?startDate=2025-02-01&endDate=2025-02-28')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      const schedule = res.body.data.schedule;
      expect(Object.keys(schedule)).toHaveLength(2); // 2 dates
      expect(schedule['2025-02-01']).toHaveLength(2);
      expect(schedule['2025-02-02']).toHaveLength(1);
    });

    it('returns 404 if provider not found', async () => {
      mockFrom.mockReturnValueOnce(singleChain(null, { code: 'PGRST116' }));

      const res = await request(app)
        .get('/provider/schedule?startDate=2025-02-01&endDate=2025-02-28')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
    });
  });
});
