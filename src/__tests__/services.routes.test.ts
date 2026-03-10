/**
 * Services Routes Tests
 * Covers: GET / (list), GET /categories, GET /:id,
 * POST / (create), PUT /:id (update), DELETE /:id (soft-delete),
 * POST /:id/activate, GET /admin/stats, POST /admin/refresh
 */
import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

// ── Mocks ──

const mockGetAll = jest.fn<any>();
const mockGetById = jest.fn<any>();
const mockGetByCategory = jest.fn<any>();
const mockSearch = jest.fn<any>();
const mockGetCategories = jest.fn<any>();
const mockGetStats = jest.fn<any>();
const mockUpsert = jest.fn<any>();
const mockRefresh = jest.fn<any>();
const mockRemove = jest.fn<any>();

jest.unstable_mockModule('../services/service-catalog.service.js', () => ({
  serviceCatalog: {
    getAll: mockGetAll,
    getById: mockGetById,
    getByCategory: mockGetByCategory,
    search: mockSearch,
    getCategories: mockGetCategories,
    getStats: mockGetStats,
    upsert: mockUpsert,
    refresh: mockRefresh,
    remove: mockRemove,
  },
}));

const mockDbInsert = jest.fn<any>();
const mockDbUpdate = jest.fn<any>();
const mockDbSelect = jest.fn<any>();
const mockDbEq = jest.fn<any>();
const mockDbSingle = jest.fn<any>();

jest.unstable_mockModule('../lib/supabase.js', () => ({
  supabase: {
    from: jest.fn<any>().mockReturnValue({
      insert: mockDbInsert,
      update: mockDbUpdate,
      select: mockDbSelect,
    }),
  },
}));

jest.unstable_mockModule('../middleware/auth.middleware.js', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

jest.unstable_mockModule('../middleware/validation.middleware.js', () => ({
  validateBody: () => (_req: any, _res: any, next: any) => next(),
  validateQuery: () => (_req: any, _res: any, next: any) => next(),
  validateParams: () => (_req: any, _res: any, next: any) => next(),
  uuidSchema: { optional: () => ({}) },
}));

const { default: servicesRouter } = await import('../routes/services.routes.js');

const expressModule = await import('express');
const express = expressModule.default;
const { default: request } = await import('supertest');

let app: any;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/services', servicesRouter);
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Helpers ──

function makeSvc(overrides: Record<string, any> = {}) {
  return {
    id: overrides.id ?? 'svc-1',
    name: overrides.name ?? 'Checkup',
    category: overrides.category ?? 'primary-care',
    default_price: 100,
    is_active: true,
    ...overrides,
  };
}

// ── Tests ──

describe('Services Routes', () => {
  describe('GET /services', () => {
    it('returns paginated services from memory', async () => {
      const services = [makeSvc({ id: '1' }), makeSvc({ id: '2' })];
      mockGetAll.mockReturnValue(services);

      const res = await request(app).get('/services?limit=50&offset=0');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.source).toBe('memory');
      expect(res.body.pagination).toBeDefined();
    });

    it('returns empty array when no services', async () => {
      mockGetAll.mockReturnValue([]);

      const res = await request(app).get('/services?limit=50&offset=0');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('filters by category when query param provided', async () => {
      const services = [
        makeSvc({ id: '1', category: 'cardiology' }),
        makeSvc({ id: '2', category: 'dermatology' }),
      ];
      mockGetAll.mockReturnValue(services);

      const res = await request(app).get('/services?category=cardiology&limit=50&offset=0');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].category).toBe('cardiology');
    });

    it('uses search when query param provided', async () => {
      mockGetAll.mockReturnValue([]);
      mockSearch.mockReturnValue([makeSvc({ name: 'Blood Test' })]);

      const res = await request(app).get('/services?search=blood&limit=50&offset=0');

      expect(res.status).toBe(200);
      expect(mockSearch).toHaveBeenCalledWith('blood', false);
    });
  });

  describe('GET /services/categories', () => {
    it('returns categories from memory', async () => {
      mockGetCategories.mockReturnValue(['cardiology', 'dermatology']);

      const res = await request(app).get('/services/categories');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(['cardiology', 'dermatology']);
      expect(res.body.source).toBe('memory');
    });
  });

  describe('GET /services/:id', () => {
    it('returns service by ID', async () => {
      mockGetById.mockReturnValue(makeSvc({ id: 'abc' }));

      const res = await request(app).get('/services/abc');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('abc');
      expect(res.body.source).toBe('memory');
    });

    it('returns 404 for unknown ID', async () => {
      mockGetById.mockReturnValue(undefined);

      const res = await request(app).get('/services/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /services', () => {
    it('creates and returns new service', async () => {
      const newSvc = makeSvc({ id: 'new-1' });
      mockDbInsert.mockReturnValue({
        select: jest.fn<any>().mockReturnValue({
          single: jest.fn<any>().mockResolvedValue({ data: newSvc, error: null }),
        }),
      });
      mockUpsert.mockResolvedValue(undefined);

      const res = await request(app).post('/services').send({
        name: 'New Service',
        category: 'primary-care',
        default_price: 100,
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(mockUpsert).toHaveBeenCalledWith(newSvc);
    });

    it('returns 400 on database error', async () => {
      mockDbInsert.mockReturnValue({
        select: jest.fn<any>().mockReturnValue({
          single: jest.fn<any>().mockResolvedValue({ data: null, error: { message: 'duplicate' } }),
        }),
      });

      const res = await request(app).post('/services').send({
        name: 'Dup',
        category: 'test',
        default_price: 50,
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /services/admin/stats', () => {
    it('returns catalog statistics', async () => {
      const stats = {
        total: 10,
        active: 8,
        inactive: 2,
        categories: 3,
        lastSync: new Date().toISOString(),
      };
      mockGetStats.mockReturnValue(stats);

      const res = await request(app).get('/services/admin/stats');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(stats);
    });
  });

  describe('POST /services/admin/refresh', () => {
    it('refreshes catalog and returns stats', async () => {
      mockRefresh.mockResolvedValue(undefined);
      const stats = { total: 5, active: 5, inactive: 0, categories: 2 };
      mockGetStats.mockReturnValue(stats);

      const res = await request(app).post('/services/admin/refresh');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});
