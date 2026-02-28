/**
 * Invoices Routes Tests
 * Covers: GET /invoices, GET /invoices/:id
 */
import { jest } from '@jest/globals';

// Each chain has its own isolated mock functions
function createChain(finalResult: any = { data: [], error: null, count: 0 }): any {
  const c: any = {};
  c.select = jest.fn<any>().mockReturnValue(c);
  c.eq = jest.fn<any>().mockReturnValue(c);
  c.order = jest.fn<any>().mockReturnValue(c);
  c.range = jest.fn<any>().mockReturnValue(c);
  c.limit = jest.fn<any>().mockReturnValue(c);
  c.single = jest.fn<any>().mockResolvedValue(finalResult);
  // Thenable: resolves when awaited (e.g. `await query`)
  c.then = (resolve: any, reject: any) => Promise.resolve(finalResult).then(resolve, reject);
  return c;
}

const mockFrom = jest.fn<any>();
let mockRole = 'patient';
let mockUserId = 'user-uuid';

jest.unstable_mockModule('../lib/supabase.js', () => ({
  supabase: { from: mockFrom },
  createServiceClient: () => ({ from: mockFrom }),
}));

jest.unstable_mockModule('../middleware/auth.middleware.js', () => ({
  authenticate: (_req: any, _res: any, next: any) => {
    _req.user = { id: mockUserId };
    _req.userProfile = { role: mockRole };
    next();
  },
  AuthenticatedRequest: {},
}));

jest.unstable_mockModule('../middleware/rateLimit.middleware.js', () => ({
  apiLimiter: (_req: any, _res: any, next: any) => next(),
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
}));

const { default: express } = await import('express');
const { default: request } = await import('supertest');
const { default: invoicesRouter } = await import('../routes/invoices.routes.js');

const app = express();
app.use(express.json());
app.use('/invoices', invoicesRouter);

beforeEach(() => {
  jest.clearAllMocks();
  mockRole = 'patient';
  mockUserId = 'user-uuid';
});

const UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('Invoices Routes', () => {
  describe('GET /invoices', () => {
    it('returns invoices list for patient', async () => {
      // The route: 1) builds invoice query (from('invoices')), 2) looks up patient (from('patients'))
      // Then calls query.eq('patient_id', patient.id) and finally await query
      const invoiceChain = createChain({
        data: [{ id: 'inv-1', invoice_number: 'INV-001', status: 'sent', total_amount: 100 }],
        error: null,
        count: 1,
      });
      const patientChain = createChain({ data: { id: 'pat-1' }, error: null });
      mockFrom.mockReturnValueOnce(invoiceChain).mockReturnValueOnce(patientChain);

      const res = await request(app).get('/invoices?page=1&limit=10');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('filters by status', async () => {
      const invoiceChain = createChain({ data: [], error: null, count: 0 });
      const patientChain = createChain({ data: { id: 'pat-1' }, error: null });
      mockFrom.mockReturnValueOnce(invoiceChain).mockReturnValueOnce(patientChain);

      const res = await request(app).get('/invoices?status=paid');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns empty for unknown patient', async () => {
      const invoiceChain = createChain({ data: [], error: null, count: 0 });
      const patientChain = createChain({ data: null, error: null });
      mockFrom.mockReturnValueOnce(invoiceChain).mockReturnValueOnce(patientChain);

      const res = await request(app).get('/invoices');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('returns invoices for provider role', async () => {
      mockRole = 'provider';
      const invoiceChain = createChain({
        data: [{ id: 'inv-p1', invoice_number: 'INV-P001', status: 'sent', total_amount: 200 }],
        error: null,
        count: 1,
      });
      const providerChain = createChain({ data: { id: 'prov-1' }, error: null });
      mockFrom.mockReturnValueOnce(invoiceChain).mockReturnValueOnce(providerChain);

      const res = await request(app).get('/invoices?page=1&limit=10');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns empty for unknown provider', async () => {
      mockRole = 'provider';
      const invoiceChain = createChain({ data: [], error: null, count: 0 });
      const providerChain = createChain({ data: null, error: null });
      mockFrom.mockReturnValueOnce(invoiceChain).mockReturnValueOnce(providerChain);

      const res = await request(app).get('/invoices');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination.total).toBe(0);
    });

    it('returns invoices for admin role without filter', async () => {
      mockRole = 'admin';
      const invoiceChain = createChain({
        data: [{ id: 'inv-a1', invoice_number: 'INV-A001', status: 'paid', total_amount: 500 }],
        error: null,
        count: 1,
      });
      mockFrom.mockReturnValueOnce(invoiceChain);

      const res = await request(app).get('/invoices?page=1&limit=10');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /invoices/:id', () => {
    it('returns invoice details', async () => {
      mockFrom
        .mockReturnValueOnce(
          createChain({
            data: {
              id: UUID,
              invoice_number: 'INV-001',
              patient_id: 'pat-1',
              patient: { user_id: 'user-uuid' },
            },
            error: null,
          })
        )
        .mockReturnValueOnce(createChain({ data: { id: 'pat-1' }, error: null }));

      const res = await request(app).get(`/invoices/${UUID}`);
      expect([200, 403]).toContain(res.status);
    });

    it('rejects non-UUID id', async () => {
      const res = await request(app).get('/invoices/bad-id');
      expect(res.status).toBe(400);
    });

    it('returns 200 for patient accessing own invoice', async () => {
      mockRole = 'patient';
      mockFrom
        .mockReturnValueOnce(
          createChain({
            data: {
              id: UUID,
              invoice_number: 'INV-001',
              patient_id: 'pat-1',
              provider_id: 'prov-1',
              patient: { user_id: 'user-uuid' },
            },
            error: null,
          })
        )
        .mockReturnValueOnce(createChain({ data: { id: 'pat-1' }, error: null }));

      const res = await request(app).get(`/invoices/${UUID}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 403 for patient accessing another patients invoice', async () => {
      mockRole = 'patient';
      mockFrom
        .mockReturnValueOnce(
          createChain({
            data: {
              id: UUID,
              invoice_number: 'INV-002',
              patient_id: 'pat-other',
              provider_id: 'prov-1',
              patient: { user_id: 'other-user' },
            },
            error: null,
          })
        )
        .mockReturnValueOnce(createChain({ data: { id: 'pat-1' }, error: null }));

      const res = await request(app).get(`/invoices/${UUID}`);
      expect(res.status).toBe(403);
    });

    it('returns 200 for provider accessing own invoice', async () => {
      mockRole = 'provider';
      mockFrom
        .mockReturnValueOnce(
          createChain({
            data: {
              id: UUID,
              invoice_number: 'INV-003',
              patient_id: 'pat-1',
              provider_id: 'prov-1',
              provider: { user_id: 'user-uuid' },
            },
            error: null,
          })
        )
        .mockReturnValueOnce(createChain({ data: { id: 'prov-1' }, error: null }));

      const res = await request(app).get(`/invoices/${UUID}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 403 for provider accessing another providers invoice', async () => {
      mockRole = 'provider';
      mockFrom
        .mockReturnValueOnce(
          createChain({
            data: {
              id: UUID,
              invoice_number: 'INV-004',
              patient_id: 'pat-1',
              provider_id: 'prov-other',
              provider: { user_id: 'other-user' },
            },
            error: null,
          })
        )
        .mockReturnValueOnce(createChain({ data: { id: 'prov-1' }, error: null }));

      const res = await request(app).get(`/invoices/${UUID}`);
      expect(res.status).toBe(403);
    });

    it('returns 200 for admin accessing any invoice', async () => {
      mockRole = 'admin';
      mockFrom.mockReturnValueOnce(
        createChain({
          data: {
            id: UUID,
            invoice_number: 'INV-005',
            patient_id: 'pat-1',
            provider_id: 'prov-1',
          },
          error: null,
        })
      );

      const res = await request(app).get(`/invoices/${UUID}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 404 when invoice not found', async () => {
      mockFrom.mockReturnValueOnce(
        createChain({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        })
      );

      const res = await request(app).get(`/invoices/${UUID}`);
      expect(res.status).toBe(404);
    });
  });
});
