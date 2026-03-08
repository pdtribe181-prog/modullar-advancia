/**
 * Service Catalog Tests
 * Tests for in-memory service catalog: initialize, CRUD lookups, search, stats
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// ── Mocks ──

const mockFrom = jest.fn<any>();
const mockSelect = jest.fn<any>();
const mockOrder1 = jest.fn<any>();
const mockOrder2 = jest.fn<any>();

jest.unstable_mockModule('../lib/supabase.js', () => ({
  supabase: { from: mockFrom },
}));

jest.unstable_mockModule('../middleware/logging.middleware.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const { serviceCatalog, initializeServiceCatalog, shutdownServiceCatalog } =
  await import('../services/service-catalog.service.js');

// ── Helpers ──

function makeService(overrides: Record<string, any> = {}) {
  return {
    id: overrides.id ?? 'svc-1',
    name: overrides.name ?? 'General Checkup',
    description: overrides.description ?? 'Routine physical',
    category: overrides.category ?? 'primary-care',
    code: overrides.code ?? 'GEN-001',
    code_type: overrides.code_type ?? 'CPT',
    default_price: overrides.default_price ?? 150,
    currency: overrides.currency ?? 'USD',
    duration_minutes: overrides.duration_minutes ?? 30,
    is_active: overrides.is_active ?? true,
    requires_authorization: overrides.requires_authorization ?? false,
    metadata: overrides.metadata ?? {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

function setupDbResponse(data: any[] | null, error: any = null) {
  mockFrom.mockReturnValue({ select: mockSelect });
  mockSelect.mockReturnValue({ order: mockOrder1 });
  mockOrder1.mockReturnValue({ order: mockOrder2 });
  mockOrder2.mockResolvedValue({ data, error });
}

// ── Tests ──

describe('ServiceCatalog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Reset catalog state by calling stopAutoSync and manually clearing
    serviceCatalog.stopAutoSync();
  });

  afterEach(() => {
    serviceCatalog.stopAutoSync();
    jest.useRealTimers();
  });

  describe('initialize', () => {
    it('loads services from database into memory', async () => {
      const services = [
        makeService({ id: '1', category: 'cardiology' }),
        makeService({ id: '2', category: 'dermatology' }),
      ];
      setupDbResponse(services);

      await serviceCatalog.initialize();

      expect(mockFrom).toHaveBeenCalledWith('services');
      expect(serviceCatalog.getAll(true)).toHaveLength(2);
    });

    it('throws when database returns an error', async () => {
      setupDbResponse(null, { message: 'DB connection failed', code: '500' });

      await expect(serviceCatalog.initialize()).rejects.toEqual(
        expect.objectContaining({ message: 'DB connection failed' })
      );
    });

    it('handles empty service list', async () => {
      setupDbResponse([]);

      await serviceCatalog.initialize();

      expect(serviceCatalog.getAll()).toHaveLength(0);
      expect(serviceCatalog.getCategories()).toHaveLength(0);
    });
  });

  describe('getAll', () => {
    it('returns only active services by default', async () => {
      const services = [
        makeService({ id: '1', is_active: true }),
        makeService({ id: '2', is_active: false }),
        makeService({ id: '3', is_active: true }),
      ];
      setupDbResponse(services);
      await serviceCatalog.initialize();

      const active = serviceCatalog.getAll();
      expect(active).toHaveLength(2);
      expect(active.every((s: any) => s.is_active)).toBe(true);
    });

    it('returns all services when includeInactive is true', async () => {
      const services = [
        makeService({ id: '1', is_active: true }),
        makeService({ id: '2', is_active: false }),
      ];
      setupDbResponse(services);
      await serviceCatalog.initialize();

      expect(serviceCatalog.getAll(true)).toHaveLength(2);
    });
  });

  describe('getById', () => {
    it('returns a service by ID', async () => {
      setupDbResponse([makeService({ id: 'abc-123', name: 'Cardiology Consult' })]);
      await serviceCatalog.initialize();

      const svc = serviceCatalog.getById('abc-123');
      expect(svc).toBeDefined();
      expect(svc?.name).toBe('Cardiology Consult');
    });

    it('returns undefined for unknown ID', async () => {
      setupDbResponse([makeService()]);
      await serviceCatalog.initialize();

      expect(serviceCatalog.getById('nonexistent')).toBeUndefined();
    });
  });

  describe('getByCategory', () => {
    it('returns services filtered by category', async () => {
      const services = [
        makeService({ id: '1', category: 'cardiology' }),
        makeService({ id: '2', category: 'dermatology' }),
        makeService({ id: '3', category: 'cardiology' }),
      ];
      setupDbResponse(services);
      await serviceCatalog.initialize();

      const cardio = serviceCatalog.getByCategory('cardiology');
      expect(cardio).toHaveLength(2);
    });

    it('returns empty array for unknown category', async () => {
      setupDbResponse([makeService()]);
      await serviceCatalog.initialize();

      expect(serviceCatalog.getByCategory('nonexistent')).toHaveLength(0);
    });
  });

  describe('search', () => {
    it('matches services by name (case-insensitive)', async () => {
      const services = [
        makeService({ id: '1', name: 'Physical Exam', description: 'Annual' }),
        makeService({ id: '2', name: 'Blood Test', description: 'Lab panel' }),
      ];
      setupDbResponse(services);
      await serviceCatalog.initialize();

      const results = serviceCatalog.search('physical');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Physical Exam');
    });

    it('matches services by description', async () => {
      setupDbResponse([makeService({ id: '1', description: 'Annual wellness checkup' })]);
      await serviceCatalog.initialize();

      expect(serviceCatalog.search('wellness')).toHaveLength(1);
    });

    it('matches services by code', async () => {
      setupDbResponse([makeService({ id: '1', code: 'CPT-99213' })]);
      await serviceCatalog.initialize();

      expect(serviceCatalog.search('99213')).toHaveLength(1);
    });

    it('returns empty array for no matches', async () => {
      setupDbResponse([makeService()]);
      await serviceCatalog.initialize();

      expect(serviceCatalog.search('zzzzz')).toHaveLength(0);
    });
  });

  describe('getCategories', () => {
    it('returns sorted unique categories', async () => {
      const services = [
        makeService({ id: '1', category: 'dermatology' }),
        makeService({ id: '2', category: 'cardiology' }),
        makeService({ id: '3', category: 'dermatology' }),
      ];
      setupDbResponse(services);
      await serviceCatalog.initialize();

      expect(serviceCatalog.getCategories()).toEqual(['cardiology', 'dermatology']);
    });
  });

  describe('getStats', () => {
    it('returns correct statistics', async () => {
      const services = [
        makeService({ id: '1', is_active: true }),
        makeService({ id: '2', is_active: false }),
        makeService({ id: '3', is_active: true, category: 'specialty' }),
      ];
      setupDbResponse(services);
      await serviceCatalog.initialize();

      const stats = serviceCatalog.getStats();
      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.inactive).toBe(1);
      expect(stats.categories).toBe(2); // 'primary-care' and 'specialty'
      expect(stats.lastSync).toBeDefined();
      expect(stats.memorySize).toBeGreaterThan(0);
    });
  });

  describe('upsert', () => {
    it('adds a new service to the catalog', async () => {
      setupDbResponse([]);
      await serviceCatalog.initialize();

      const newService = makeService({ id: 'new-1', name: 'New Service' });
      await serviceCatalog.upsert(newService);

      expect(serviceCatalog.getById('new-1')).toBeDefined();
      expect(serviceCatalog.getById('new-1')?.name).toBe('New Service');
    });

    it('updates an existing service', async () => {
      setupDbResponse([makeService({ id: '1', name: 'Old Name' })]);
      await serviceCatalog.initialize();

      await serviceCatalog.upsert(makeService({ id: '1', name: 'Updated Name' }));
      expect(serviceCatalog.getById('1')?.name).toBe('Updated Name');
    });
  });

  describe('remove', () => {
    it('removes a service from the catalog', async () => {
      setupDbResponse([makeService({ id: '1' }), makeService({ id: '2' })]);
      await serviceCatalog.initialize();

      serviceCatalog.remove('1');
      expect(serviceCatalog.getById('1')).toBeUndefined();
      expect(serviceCatalog.getAll(true)).toHaveLength(1);
    });

    it('does nothing for unknown ID', async () => {
      setupDbResponse([makeService()]);
      await serviceCatalog.initialize();

      serviceCatalog.remove('nonexistent');
      expect(serviceCatalog.getAll(true)).toHaveLength(1);
    });

    it('rebuilds categories after removal', async () => {
      const services = [
        makeService({ id: '1', category: 'only-one' }),
        makeService({ id: '2', category: 'primary-care' }),
      ];
      setupDbResponse(services);
      await serviceCatalog.initialize();

      serviceCatalog.remove('1');
      expect(serviceCatalog.getCategories()).toEqual(['primary-care']);
    });
  });

  describe('refresh', () => {
    it('reloads services from database', async () => {
      // Initial load
      setupDbResponse([makeService({ id: '1' })]);
      await serviceCatalog.initialize();
      expect(serviceCatalog.getAll(true)).toHaveLength(1);

      // Refresh with new data
      setupDbResponse([makeService({ id: '1' }), makeService({ id: '2' })]);
      await serviceCatalog.refresh();
      expect(serviceCatalog.getAll(true)).toHaveLength(2);
    });
  });

  describe('stopAutoSync', () => {
    it('stops the sync interval', async () => {
      setupDbResponse([]);
      await serviceCatalog.initialize();

      serviceCatalog.stopAutoSync();
      // Calling again should be safe (no-op)
      serviceCatalog.stopAutoSync();
    });
  });

  describe('initializeServiceCatalog / shutdownServiceCatalog', () => {
    it('initialize and shutdown helpers work', async () => {
      setupDbResponse([makeService()]);
      await initializeServiceCatalog();

      expect(serviceCatalog.getAll(true)).toHaveLength(1);

      shutdownServiceCatalog();
    });
  });
});
