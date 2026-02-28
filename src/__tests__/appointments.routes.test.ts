/**
 * Appointments Routes Tests
 * Covers: provider availability, list providers, book appointment,
 *         my-appointments, get single, cancel, reschedule
 */
import { jest } from '@jest/globals';

// Each chain returns its own isolated mock functions so sequential from() calls
// don't stomp on each other's resolved values.
function createChain(finalResult: any = { data: [], error: null }): any {
  const c: any = {};
  c.select = jest.fn<any>().mockReturnValue(c);
  c.insert = jest.fn<any>().mockReturnValue(c);
  c.update = jest.fn<any>().mockReturnValue(c);
  c.eq = jest.fn<any>().mockReturnValue(c);
  c.in = jest.fn<any>().mockReturnValue(c);
  c.neq = jest.fn<any>().mockReturnValue(c);
  c.gte = jest.fn<any>().mockReturnValue(c);
  c.ilike = jest.fn<any>().mockReturnValue(c);
  c.order = jest.fn<any>().mockReturnValue(c);
  c.range = jest.fn<any>().mockReturnValue(c);
  c.limit = jest.fn<any>().mockReturnValue(c);
  c.single = jest.fn<any>().mockResolvedValue(finalResult);
  // Thenable: resolves when awaited (e.g. `await query`)
  c.then = (resolve: any, reject: any) => Promise.resolve(finalResult).then(resolve, reject);
  return c;
}

const mockFrom = jest.fn<any>();

jest.unstable_mockModule('../lib/supabase.js', () => ({
  supabase: { from: mockFrom },
  createServiceClient: () => ({ from: mockFrom }),
}));

jest.unstable_mockModule('../services/stripe.service.js', () => ({
  stripeServices: {
    paymentIntents: {
      create: jest.fn<any>().mockResolvedValue({ id: 'pi_test', client_secret: 'cs_test' }),
    },
    refunds: {
      createFull: jest.fn<any>().mockResolvedValue({ id: 're_test' }),
    },
  },
  stripe: {},
}));

jest.unstable_mockModule('../middleware/auth.middleware.js', () => ({
  authenticate: (_req: any, _res: any, next: any) => {
    _req.user = { id: 'user-uuid' };
    _req.userProfile = { role: 'patient' };
    next();
  },
  authenticateWithProfile: (_req: any, _res: any, next: any) => {
    _req.user = { id: 'user-uuid' };
    _req.userProfile = { role: 'patient' };
    next();
  },
  AuthenticatedRequest: {},
}));

jest.unstable_mockModule('../middleware/rateLimit.middleware.js', () => ({
  apiLimiter: (_req: any, _res: any, next: any) => next(),
  sensitiveLimiter: (_req: any, _res: any, next: any) => next(),
}));

jest.unstable_mockModule('../services/email.service.js', () => ({
  sendAppointmentConfirmedEmail: jest.fn<any>().mockResolvedValue(undefined),
  sendAppointmentCancelledEmail: jest.fn<any>().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../middleware/logging.middleware.js', () => ({
  logger: {
    info: jest.fn<any>(),
    warn: jest.fn<any>(),
    error: jest.fn<any>(),
    debug: jest.fn<any>(),
  },
}));

jest.unstable_mockModule('../middleware/cache.middleware.js', () => ({
  cacheResponse: () => (_req: any, _res: any, next: any) => next(),
  invalidateCache: jest.fn<any>(),
}));

const { default: express } = await import('express');
const { default: request } = await import('supertest');
const { default: appointmentsRouter } = await import('../routes/appointments.routes.js');

const app = express();
app.use(express.json());
app.use('/appointments', appointmentsRouter);

beforeEach(() => jest.clearAllMocks());

const UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('Appointments Routes', () => {
  describe('GET /appointments/providers/:providerId/availability', () => {
    it('returns time slots', async () => {
      const providerChain = createChain({
        data: {
          id: UUID,
          business_name: 'Test Clinic',
          specialty: 'GP',
          consultation_fee: 100,
          availability_settings: {},
        },
        error: null,
      });
      const apptChain = createChain({ data: [], error: null });
      mockFrom.mockReturnValueOnce(providerChain).mockReturnValueOnce(apptChain);

      const res = await request(app).get(
        `/appointments/providers/${UUID}/availability?date=2026-03-15`
      );
      expect(res.status).toBe(200);
      expect(res.body.data.slots.length).toBeGreaterThan(0);
    });

    it('returns 404 for non-existent provider', async () => {
      mockFrom.mockReturnValue(createChain({ data: null, error: { message: 'not found' } }));

      const res = await request(app).get(
        `/appointments/providers/${UUID}/availability?date=2026-03-15`
      );
      expect(res.status).toBe(404);
    });
  });

  describe('GET /appointments/providers', () => {
    it('lists active providers', async () => {
      mockFrom.mockReturnValue(
        createChain({
          data: [
            {
              id: UUID,
              business_name: 'Test',
              specialty: 'GP',
              consultation_fee: 100,
              stripe_account_id: 'acct_x',
              stripe_onboarding_complete: true,
            },
          ],
          error: null,
        })
      );

      const res = await request(app).get('/appointments/providers?limit=10&offset=0');
      expect(res.status).toBe(200);
      expect(res.body.data.providers).toBeDefined();
    });

    it('filters by specialty', async () => {
      mockFrom.mockReturnValue(createChain({ data: [], error: null }));

      const res = await request(app).get('/appointments/providers?specialty=Cardiology');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /appointments/book', () => {
    it('books an appointment', async () => {
      mockFrom
        .mockReturnValueOnce(createChain({ data: { id: 'pat-1' }, error: null })) // patient lookup
        .mockReturnValueOnce(
          createChain({
            data: {
              id: UUID,
              business_name: 'Test',
              specialty: 'GP',
              consultation_fee: 100,
              stripe_account_id: 'acct_x',
            },
            error: null,
          })
        ) // provider
        .mockReturnValueOnce(createChain({ data: null, error: { code: 'PGRST116' } })) // existing check
        .mockReturnValueOnce(
          createChain({
            data: {
              id: 'appt-1',
              appointment_date: '2026-03-15',
              appointment_time: '09:00',
              duration_minutes: 30,
              status: 'scheduled',
            },
            error: null,
          })
        ) // insert
        .mockReturnValueOnce(createChain({ data: null, error: null })) // update with payment
        .mockReturnValueOnce(
          createChain({ data: { email: 'test@test.com', full_name: 'Test User' }, error: null })
        ); // profile

      const res = await request(app)
        .post('/appointments/book')
        .send({ providerId: UUID, date: '2026-03-15', time: '09:00', reason: 'Checkup' });
      expect(res.status).toBe(201);
      expect(res.body.data.appointment).toBeDefined();
      expect(res.body.data.payment.clientSecret).toBe('cs_test');
    });
  });

  describe('GET /appointments/my-appointments', () => {
    it('returns user appointments', async () => {
      const patientChain = createChain({ data: { id: 'pat-1' }, error: null });
      const apptChain = createChain();
      apptChain.order = jest.fn<any>().mockResolvedValue({
        data: [
          {
            id: 'a1',
            appointment_date: '2026-03-15',
            appointment_time: '09:00',
            duration_minutes: 30,
            reason: 'test',
            status: 'scheduled',
            payment_status: 'pending',
            provider: {},
          },
        ],
        error: null,
      });
      mockFrom.mockReturnValueOnce(patientChain).mockReturnValueOnce(apptChain);

      const res = await request(app).get('/appointments/my-appointments');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.appointments)).toBe(true);
    });

    it('returns empty when no patient record', async () => {
      mockFrom.mockReturnValue(createChain({ data: null, error: null }));

      const res = await request(app).get('/appointments/my-appointments');
      expect(res.status).toBe(200);
      expect(res.body.data.appointments).toEqual([]);
    });
  });

  describe('GET /appointments/:id', () => {
    it('returns appointment details', async () => {
      mockFrom
        .mockReturnValueOnce(createChain({ data: { id: 'pat-1' }, error: null }))
        .mockReturnValueOnce(
          createChain({
            data: { id: UUID, patient_id: 'pat-1', provider: {}, patient: {} },
            error: null,
          })
        );

      const res = await request(app).get(`/appointments/${UUID}`);
      expect(res.status).toBe(200);
    });

    it('returns 403 if not owner', async () => {
      mockFrom
        .mockReturnValueOnce(createChain({ data: { id: 'pat-other' }, error: null }))
        .mockReturnValueOnce(
          createChain({
            data: { id: UUID, patient_id: 'pat-1', provider: {}, patient: {} },
            error: null,
          })
        );

      const res = await request(app).get(`/appointments/${UUID}`);
      expect(res.status).toBe(403);
    });
  });

  describe('POST /appointments/:id/cancel', () => {
    it('cancels an appointment', async () => {
      mockFrom
        .mockReturnValueOnce(createChain({ data: { id: 'pat-1' }, error: null })) // patient
        .mockReturnValueOnce(
          createChain({
            data: {
              id: UUID,
              patient_id: 'pat-1',
              status: 'scheduled',
              payment_status: 'pending',
              stripe_payment_intent_id: null,
              provider: { business_name: 'Test' },
              appointment_date: '2026-03-15',
              appointment_time: '09:00',
            },
            error: null,
          })
        ) // appointment
        .mockReturnValueOnce(createChain({ data: { id: UUID, status: 'cancelled' }, error: null })) // update
        .mockReturnValueOnce(
          createChain({ data: { email: 'test@test.com', full_name: 'Test' }, error: null })
        ); // profile

      const res = await request(app)
        .post(`/appointments/${UUID}/cancel`)
        .send({ reason: 'Changed mind' });
      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('cancelled');
    });
  });

  describe('POST /appointments/:id/reschedule', () => {
    it('reschedules an appointment', async () => {
      mockFrom
        .mockReturnValueOnce(createChain({ data: { id: 'pat-1' }, error: null })) // patient
        .mockReturnValueOnce(
          createChain({
            data: { id: UUID, patient_id: 'pat-1', provider_id: 'prov-1', status: 'scheduled' },
            error: null,
          })
        ) // appointment
        .mockReturnValueOnce(createChain({ data: null, error: { code: 'PGRST116' } })) // slot check
        .mockReturnValueOnce(
          createChain({
            data: {
              id: UUID,
              appointment_date: '2026-03-20',
              appointment_time: '10:00',
              status: 'scheduled',
            },
            error: null,
          })
        ); // update

      const res = await request(app)
        .post(`/appointments/${UUID}/reschedule`)
        .send({ date: '2026-03-20', time: '10:00' });
      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('rescheduled');
    });

    it('returns 404 when appointment not found for reschedule', async () => {
      mockFrom
        .mockReturnValueOnce(createChain({ data: { id: 'pat-1' }, error: null }))
        .mockReturnValueOnce(createChain({ data: null, error: { message: 'not found' } }));

      const res = await request(app)
        .post(`/appointments/${UUID}/reschedule`)
        .send({ date: '2026-03-20', time: '10:00' });
      expect(res.status).toBe(404);
    });

    it('returns 403 when patient does not own appointment for reschedule', async () => {
      mockFrom
        .mockReturnValueOnce(createChain({ data: { id: 'pat-other' }, error: null }))
        .mockReturnValueOnce(
          createChain({
            data: { id: UUID, patient_id: 'pat-1', provider_id: 'prov-1', status: 'scheduled' },
            error: null,
          })
        );

      const res = await request(app)
        .post(`/appointments/${UUID}/reschedule`)
        .send({ date: '2026-03-20', time: '10:00' });
      expect(res.status).toBe(403);
    });

    it('returns 409 when new slot is already taken for reschedule', async () => {
      mockFrom
        .mockReturnValueOnce(createChain({ data: { id: 'pat-1' }, error: null }))
        .mockReturnValueOnce(
          createChain({
            data: { id: UUID, patient_id: 'pat-1', provider_id: 'prov-1', status: 'scheduled' },
            error: null,
          })
        )
        .mockReturnValueOnce(createChain({ data: { id: 'existing-appt' }, error: null })); // slot occupied

      const res = await request(app)
        .post(`/appointments/${UUID}/reschedule`)
        .send({ date: '2026-03-20', time: '10:00' });
      expect(res.status).toBe(409);
    });
  });

  // ── Additional edge-case tests ──────────────────────────────────────

  describe('POST /appointments/book – edge cases', () => {
    it('returns 404 when provider not found', async () => {
      mockFrom
        .mockReturnValueOnce(createChain({ data: { id: 'pat-1' }, error: null })) // patient
        .mockReturnValueOnce(createChain({ data: null, error: { message: 'not found' } })); // provider

      const res = await request(app)
        .post('/appointments/book')
        .send({ providerId: UUID, date: '2026-03-15', time: '09:00', reason: 'Checkup' });
      expect(res.status).toBe(404);
    });

    it('returns 409 when time slot already booked', async () => {
      mockFrom
        .mockReturnValueOnce(createChain({ data: { id: 'pat-1' }, error: null })) // patient
        .mockReturnValueOnce(
          createChain({
            data: {
              id: UUID,
              business_name: 'Test',
              specialty: 'GP',
              consultation_fee: 100,
              stripe_account_id: 'acct_x',
            },
            error: null,
          })
        ) // provider
        .mockReturnValueOnce(createChain({ data: { id: 'existing-appt' }, error: null })); // existing appointment found

      const res = await request(app)
        .post('/appointments/book')
        .send({ providerId: UUID, date: '2026-03-15', time: '09:00', reason: 'Checkup' });
      expect(res.status).toBe(409);
    });

    it('creates patient record when none exists, then books', async () => {
      mockFrom
        .mockReturnValueOnce(createChain({ data: null, error: { code: 'PGRST116' } })) // patient lookup fails
        .mockReturnValueOnce(
          createChain({ data: { id: 'new-pat', user_id: 'user-uuid' }, error: null })
        ) // patient creation
        .mockReturnValueOnce(
          createChain({
            data: {
              id: UUID,
              business_name: 'Test',
              specialty: 'GP',
              consultation_fee: 100,
              stripe_account_id: 'acct_x',
            },
            error: null,
          })
        ) // provider
        .mockReturnValueOnce(createChain({ data: null, error: { code: 'PGRST116' } })) // no existing apt
        .mockReturnValueOnce(
          createChain({
            data: {
              id: 'appt-1',
              appointment_date: '2026-03-15',
              appointment_time: '09:00',
              duration_minutes: 30,
              status: 'scheduled',
            },
            error: null,
          })
        ) // insert appointment
        .mockReturnValueOnce(createChain({ data: null, error: null })) // update with payment
        .mockReturnValueOnce(
          createChain({ data: { email: 'test@test.com', full_name: 'Test User' }, error: null })
        ); // profile

      const res = await request(app)
        .post('/appointments/book')
        .send({ providerId: UUID, date: '2026-03-15', time: '09:00', reason: 'Checkup' });
      expect(res.status).toBe(201);
    });
  });

  describe('GET /appointments/my-appointments – filters', () => {
    it('applies status filter', async () => {
      const patientChain = createChain({ data: { id: 'pat-1' }, error: null });
      const terminalResult = {
        data: [
          {
            id: 'a1',
            appointment_date: '2026-03-15',
            appointment_time: '09:00',
            duration_minutes: 30,
            reason: 'test',
            status: 'scheduled',
            payment_status: 'pending',
            provider: {},
          },
        ],
        error: null,
      };
      const apptChain = createChain();
      // .order() returns a sub-chain with .eq() and .gte() that is thenable
      const orderResult: any = {
        eq: jest.fn<any>().mockReturnValue({
          then: (resolve: any) => Promise.resolve(terminalResult).then(resolve),
        }),
        gte: jest.fn<any>().mockReturnValue({
          then: (resolve: any) => Promise.resolve(terminalResult).then(resolve),
        }),
        then: (resolve: any) => Promise.resolve(terminalResult).then(resolve),
      };
      apptChain.order = jest.fn<any>().mockReturnValue(orderResult);
      mockFrom.mockReturnValueOnce(patientChain).mockReturnValueOnce(apptChain);

      const res = await request(app).get('/appointments/my-appointments?status=scheduled');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.appointments)).toBe(true);
    });

    it('applies upcoming filter', async () => {
      const patientChain = createChain({ data: { id: 'pat-1' }, error: null });
      const terminalResult = {
        data: [
          {
            id: 'a2',
            appointment_date: '2026-06-01',
            appointment_time: '14:00',
            duration_minutes: 30,
            reason: 'follow-up',
            status: 'scheduled',
            payment_status: 'pending',
            provider: {},
          },
        ],
        error: null,
      };
      const apptChain = createChain();
      const orderResult: any = {
        eq: jest.fn<any>().mockReturnValue({
          then: (resolve: any) => Promise.resolve(terminalResult).then(resolve),
        }),
        gte: jest.fn<any>().mockReturnValue({
          then: (resolve: any) => Promise.resolve(terminalResult).then(resolve),
        }),
        then: (resolve: any) => Promise.resolve(terminalResult).then(resolve),
      };
      apptChain.order = jest.fn<any>().mockReturnValue(orderResult);
      mockFrom.mockReturnValueOnce(patientChain).mockReturnValueOnce(apptChain);

      const res = await request(app).get('/appointments/my-appointments?upcoming=true');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.appointments)).toBe(true);
    });
  });

  describe('GET /appointments/:id – not found', () => {
    it('returns 404 when appointment fetch fails', async () => {
      mockFrom
        .mockReturnValueOnce(createChain({ data: { id: 'pat-1' }, error: null }))
        .mockReturnValueOnce(createChain({ data: null, error: { message: 'not found' } }));

      const res = await request(app).get(`/appointments/${UUID}`);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /appointments/:id/cancel – edge cases', () => {
    it('returns 403 when patient does not own appointment', async () => {
      mockFrom
        .mockReturnValueOnce(createChain({ data: { id: 'pat-other' }, error: null }))
        .mockReturnValueOnce(
          createChain({
            data: {
              id: UUID,
              patient_id: 'pat-1',
              status: 'scheduled',
              payment_status: 'pending',
              stripe_payment_intent_id: null,
              provider: { business_name: 'Test' },
              appointment_date: '2026-03-15',
              appointment_time: '09:00',
            },
            error: null,
          })
        );

      const res = await request(app).post(`/appointments/${UUID}/cancel`).send({ reason: 'test' });
      expect(res.status).toBe(403);
    });

    it('returns 400 when appointment status is not cancellable', async () => {
      mockFrom
        .mockReturnValueOnce(createChain({ data: { id: 'pat-1' }, error: null }))
        .mockReturnValueOnce(
          createChain({
            data: {
              id: UUID,
              patient_id: 'pat-1',
              status: 'completed',
              payment_status: 'paid',
              stripe_payment_intent_id: null,
              provider: { business_name: 'Test' },
              appointment_date: '2026-03-15',
              appointment_time: '09:00',
            },
            error: null,
          })
        );

      const res = await request(app).post(`/appointments/${UUID}/cancel`).send({ reason: 'test' });
      expect(res.status).toBe(400);
    });

    it('processes refund when payment was made', async () => {
      const { stripeServices } = await import('../services/stripe.service.js');

      mockFrom
        .mockReturnValueOnce(createChain({ data: { id: 'pat-1' }, error: null })) // patient
        .mockReturnValueOnce(
          createChain({
            data: {
              id: UUID,
              patient_id: 'pat-1',
              status: 'scheduled',
              payment_status: 'paid',
              stripe_payment_intent_id: 'pi_existing',
              provider: { business_name: 'Test' },
              appointment_date: '2026-03-15',
              appointment_time: '09:00',
            },
            error: null,
          })
        ) // appointment with payment
        .mockReturnValueOnce(createChain({ data: { id: UUID, status: 'cancelled' }, error: null })) // update
        .mockReturnValueOnce(
          createChain({ data: { email: 'test@test.com', full_name: 'Test' }, error: null })
        ); // profile

      const res = await request(app)
        .post(`/appointments/${UUID}/cancel`)
        .send({ reason: 'Changed mind' });
      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('cancelled');
      expect(stripeServices.refunds.createFull).toHaveBeenCalledWith(
        'pi_existing',
        'requested_by_customer'
      );
    });

    it('still cancels when refund fails', async () => {
      const { stripeServices } = await import('../services/stripe.service.js');
      (stripeServices.refunds.createFull as any).mockRejectedValueOnce(
        new Error('Stripe refund error')
      );

      mockFrom
        .mockReturnValueOnce(createChain({ data: { id: 'pat-1' }, error: null }))
        .mockReturnValueOnce(
          createChain({
            data: {
              id: UUID,
              patient_id: 'pat-1',
              status: 'confirmed',
              payment_status: 'paid',
              stripe_payment_intent_id: 'pi_existing',
              provider: { business_name: 'Test' },
              appointment_date: '2026-03-15',
              appointment_time: '09:00',
            },
            error: null,
          })
        )
        .mockReturnValueOnce(createChain({ data: { id: UUID, status: 'cancelled' }, error: null }))
        .mockReturnValueOnce(
          createChain({ data: { email: 'test@test.com', full_name: 'Test' }, error: null })
        );

      const res = await request(app)
        .post(`/appointments/${UUID}/cancel`)
        .send({ reason: 'Changed mind' });
      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('cancelled');
    });

    it('returns 404 when appointment not found in cancel', async () => {
      mockFrom
        .mockReturnValueOnce(createChain({ data: { id: 'pat-1' }, error: null }))
        .mockReturnValueOnce(createChain({ data: null, error: { code: 'PGRST116' } }));

      const res = await request(app).post(`/appointments/${UUID}/cancel`).send({ reason: 'test' });
      expect(res.status).toBe(404);
    });
  });

  describe('POST /appointments/book – patient creation failure', () => {
    it('returns 500 when patient profile creation fails', async () => {
      mockFrom
        .mockReturnValueOnce(createChain({ data: null, error: { message: 'Not found' } })) // patient lookup fails
        .mockReturnValueOnce(createChain({ data: null, error: { message: 'Insert error' } })); // patient creation fails

      const res = await request(app)
        .post('/appointments/book')
        .send({ providerId: UUID, date: '2026-03-15', time: '09:00', reason: 'Checkup' });
      expect(res.status).toBe(500);
    });
  });
});
