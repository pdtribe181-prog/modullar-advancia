/**
 * GDPR Routes & Service — Unit + Integration Tests
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ── Module mocks (must be before dynamic imports) ──────────────────────────

const mockFrom = jest.fn<any>();
const mockStorage = {
  from: jest.fn<any>().mockReturnValue({
    list: jest.fn<any>().mockResolvedValue({ data: [], error: null }),
    remove: jest.fn<any>().mockResolvedValue({ error: null }),
  }),
};
const mockAuthAdmin = {
  deleteUser: jest.fn<any>().mockResolvedValue({ error: null }),
};

jest.unstable_mockModule('../lib/supabase.js', () => ({
  createServiceClient: () => ({
    from: mockFrom,
    storage: mockStorage,
    auth: { admin: mockAuthAdmin },
  }),
  getSupabaseClient: () => ({
    from: mockFrom,
    storage: mockStorage,
    auth: { admin: mockAuthAdmin },
  }),
  supabase: new Proxy(
    {},
    {
      get() {
        return () => ({});
      },
    }
  ),
}));

jest.unstable_mockModule('../lib/redis.js', () => ({
  getRedis: () => ({
    get: jest.fn<any>().mockResolvedValue(null),
    set: jest.fn<any>().mockResolvedValue('OK'),
    del: jest.fn<any>().mockResolvedValue(1),
    incr: jest.fn<any>().mockResolvedValue(1),
  }),
  getRedisKind: () => 'memory',
  redisHelpers: {
    isHealthy: jest.fn<any>().mockResolvedValue(true),
  },
}));

jest.unstable_mockModule('../middleware/rateLimit.middleware.js', () => {
  const pass = (_req: any, _res: any, next: any) => next();
  return {
    apiLimiter: pass,
    paymentLimiter: pass,
    sensitiveLimiter: pass,
    authLimiter: pass,
    onboardingLimiter: pass,
    __esModule: true,
  };
});

jest.unstable_mockModule('../middleware/csrf.middleware.js', () => ({
  csrfProtection: (_req: any, _res: any, next: any) => next(),
  generateCsrfToken: jest.fn<any>().mockResolvedValue('fake-csrf-token'),
}));

jest.unstable_mockModule('../middleware/cache.middleware.js', () => ({
  cacheResponse: () => (_req: any, _res: any, next: any) => next(),
  invalidateCache: jest.fn<any>(),
  invalidateResource: jest.fn<any>(),
}));

jest.unstable_mockModule('../utils/circuit-breaker.js', () => ({
  stripeBreaker: { execute: (fn: any) => fn() },
  resendBreaker: { execute: (fn: any) => fn() },
  twilioBreaker: { execute: (fn: any) => fn() },
  getAllCircuitBreakerStats: () => ({}),
}));

jest.unstable_mockModule('../services/monitoring.service.js', () => ({
  initializeMonitoring: jest.fn<any>(),
  sentryRequestHandler: (_req: any, _res: any, next: any) => next(),
  sentryErrorHandler: (_err: any, _req: any, _res: any, next: any) => next(),
  userContextMiddleware: (_req: any, _res: any, next: any) => next(),
  getMonitoringHealth: () => ({ enabled: false }),
  flushEvents: jest.fn<any>(),
  captureError: jest.fn<any>(),
}));

const TEST_USER_MOCK = {
  id: 'a1111111-1111-4111-a111-111111111111',
  email: 'test@example.com',
  user_metadata: { full_name: 'Test User' },
};

jest.unstable_mockModule('../middleware/auth.middleware.js', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = TEST_USER_MOCK;
    req.userProfile = { id: TEST_USER_MOCK.id, role: 'patient' };
    next();
  },
  authenticateWithProfile: (req: any, _res: any, next: any) => {
    req.user = TEST_USER_MOCK;
    req.userProfile = { id: TEST_USER_MOCK.id, role: 'patient' };
    next();
  },
  requireRole:
    (..._roles: string[]) =>
    (_req: any, _res: any, next: any) =>
      next(),
  AuthenticatedRequest: {},
}));

jest.unstable_mockModule('../utils/errors.js', () => {
  class AppError extends Error {
    statusCode: number;
    code?: string;
    constructor(message: string, statusCode = 500, code?: string) {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
    }
    static internal(message: string) {
      return new AppError(message, 500, 'INTERNAL_ERROR');
    }
    static notFound(message: string) {
      return new AppError(message, 404, 'NOT_FOUND');
    }
    static forbidden(message: string) {
      return new AppError(message, 403, 'FORBIDDEN');
    }
  }
  return {
    AppError,
    asyncHandler: (fn: any) => (req: any, res: any, next: any) =>
      Promise.resolve(fn(req, res, next)).catch(next),
  };
});

// ── Imports ────────────────────────────────────────────────────────────────

// Dynamic imports (after mocks are registered)
const { exportUserData, eraseUserData, getConsents, updateConsent } =
  await import('../services/gdpr.service.js');

// ── Helpers ────────────────────────────────────────────────────────────────

const TEST_USER_ID = 'a1111111-1111-4111-a111-111111111111';
const TEST_PATIENT_ID = 'b2222222-2222-4222-b222-222222222222';

function chainableQuery(resolvedData: any = null, resolvedError: any = null) {
  const result = { data: resolvedData, error: resolvedError };
  const chain: any = {};
  chain.select = jest.fn<any>().mockReturnValue(chain);
  chain.eq = jest.fn<any>().mockReturnValue(chain);
  chain.single = jest.fn<any>().mockResolvedValue(result);
  chain.order = jest.fn<any>().mockReturnValue(chain);
  chain.limit = jest.fn<any>().mockResolvedValue(result);
  chain.update = jest.fn<any>().mockReturnValue(chain);
  chain.delete = jest.fn<any>().mockReturnValue(chain);
  chain.insert = jest.fn<any>().mockReturnValue(chain);
  // Make it thenable
  Object.defineProperty(chain, 'then', {
    value: (resolve: any) => Promise.resolve(result).then(resolve),
    enumerable: false,
    configurable: true,
  });
  return chain;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('GDPR Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── exportUserData ──────────────────────────────────────────────────

  describe('exportUserData', () => {
    it('should return a complete export package for a user with patient record', async () => {
      // Mock table queries — mockFrom is called with table name
      mockFrom.mockImplementation((table: string) => {
        if (table === 'patients') {
          return chainableQuery({ id: TEST_PATIENT_ID, user_id: TEST_USER_ID });
        }
        if (table === 'providers') {
          return chainableQuery(null, { code: 'PGRST116' }); // not found
        }
        if (table === 'user_profiles') {
          return chainableQuery({
            id: TEST_USER_ID,
            email: 'test@example.com',
            full_name: 'Test User',
          });
        }
        // All other tables — return empty array / null
        return chainableQuery([]);
      });

      const pkg = await exportUserData(TEST_USER_ID);

      expect(pkg.userId).toBe(TEST_USER_ID);
      expect(pkg.exportedAt).toBeDefined();
      expect(pkg.profile).toBeDefined();
      expect(pkg.patient).toBeDefined();
      expect(Array.isArray(pkg.appointments)).toBe(true);
      expect(Array.isArray(pkg.transactions)).toBe(true);
      expect(Array.isArray(pkg.notifications)).toBe(true);
      expect(Array.isArray(pkg.consents)).toBe(true);
      expect(Array.isArray(pkg.medicalRecords)).toBe(true);
      expect(Array.isArray(pkg.apiKeys)).toBe(true);
    });

    it('should handle user with no patient or provider record', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'patients' || table === 'providers') {
          return chainableQuery(null, { code: 'PGRST116' });
        }
        if (table === 'user_profiles') {
          return chainableQuery({ id: TEST_USER_ID, email: 'test@example.com' });
        }
        return chainableQuery([]);
      });

      const pkg = await exportUserData(TEST_USER_ID);

      expect(pkg.userId).toBe(TEST_USER_ID);
      expect(pkg.patient).toBeNull();
      expect(pkg.provider).toBeNull();
      expect(pkg.appointments).toEqual([]);
    });

    it('should include all expected data categories in the export', async () => {
      mockFrom.mockImplementation(() => chainableQuery(null, { code: 'PGRST116' }));

      const pkg = await exportUserData(TEST_USER_ID);

      // Verify the shape includes all required keys
      const requiredKeys = [
        'exportedAt',
        'userId',
        'profile',
        'patient',
        'provider',
        'appointments',
        'transactions',
        'invoices',
        'disputes',
        'notifications',
        'messages',
        'paymentMethods',
        'paymentPlans',
        'consents',
        'medicalRecords',
        'prescriptions',
        'labResults',
        'apiKeys',
        'webhooks',
        'linkedWallets',
        'accessLogs',
        'complianceLogs',
        'emailSettings',
        'notificationPreferences',
        'paymentPreferences',
        'brandCustomization',
        'organizationSettings',
        'medbedBookings',
      ];
      for (const key of requiredKeys) {
        expect(pkg).toHaveProperty(key);
      }
    });

    it('should merge provider data into appointments/transactions/invoices', async () => {
      const PROVIDER_ID = 'c3333333-3333-4333-c333-333333333333';

      mockFrom.mockImplementation((table: string) => {
        if (table === 'patients') {
          return chainableQuery({ id: TEST_PATIENT_ID, user_id: TEST_USER_ID });
        }
        if (table === 'providers') {
          return chainableQuery({
            id: PROVIDER_ID,
            user_id: TEST_USER_ID,
            business_name: 'Test Clinic',
          });
        }
        if (table === 'user_profiles') {
          return chainableQuery({ id: TEST_USER_ID, email: 'test@example.com' });
        }
        if (table === 'appointments') {
          // Return different data for patient vs provider queries
          return chainableQuery([{ id: 'apt-1', patient_id: TEST_PATIENT_ID }]);
        }
        if (table === 'transactions') {
          return chainableQuery([{ id: 'txn-1' }]);
        }
        if (table === 'invoices') {
          return chainableQuery([{ id: 'inv-1' }]);
        }
        return chainableQuery([]);
      });

      const pkg = await exportUserData(TEST_USER_ID);

      expect(pkg.provider).toBeDefined();
      expect(pkg.provider?.id).toBe(PROVIDER_ID);
      // Appointments should have merged patient + provider data
      expect(pkg.appointments.length).toBeGreaterThan(0);
    });

    it('should handle safeSelect DB error gracefully (returns empty array)', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'patients') {
          return chainableQuery({ id: TEST_PATIENT_ID, user_id: TEST_USER_ID });
        }
        if (table === 'providers') {
          return chainableQuery(null, { code: 'PGRST116' });
        }
        if (table === 'user_profiles') {
          return chainableQuery(null, { message: 'DB connection error' }); // error in safeSelect
        }
        if (table === 'notifications') {
          // Simulate error — safeSelect returns []
          return chainableQuery(null, { message: 'table not found' });
        }
        return chainableQuery([]);
      });

      const pkg = await exportUserData(TEST_USER_ID);

      // Should still succeed with empty arrays where errors occurred
      expect(pkg.userId).toBe(TEST_USER_ID);
      expect(pkg.notifications).toEqual([]);
    });

    it('should handle safeSelect exception (catch block)', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'patients') {
          return chainableQuery({ id: TEST_PATIENT_ID, user_id: TEST_USER_ID });
        }
        if (table === 'providers') {
          return chainableQuery(null, { code: 'PGRST116' });
        }
        if (table === 'user_profiles') {
          return chainableQuery({ id: TEST_USER_ID, email: 'test@example.com' });
        }
        if (table === 'notifications') {
          // Throw to exercise the catch block in safeSelect
          throw new Error('Unexpected crash');
        }
        return chainableQuery([]);
      });

      const pkg = await exportUserData(TEST_USER_ID);

      expect(pkg.userId).toBe(TEST_USER_ID);
      // Should still complete — notifications default to []
    });

    it('should handle safeSingle thrown exception (catch branch)', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'patients') {
          return chainableQuery({ id: TEST_PATIENT_ID, user_id: TEST_USER_ID });
        }
        if (table === 'providers') {
          return chainableQuery(null, { code: 'PGRST116' });
        }
        if (table === 'user_profiles') {
          // Throw to exercise the catch block in safeSingle
          throw new Error('safeSingle crash');
        }
        return chainableQuery([]);
      });

      const pkg = await exportUserData(TEST_USER_ID);
      expect(pkg.userId).toBe(TEST_USER_ID);
      expect(pkg.profile).toBeNull();
    });
  });

  // ── eraseUserData ───────────────────────────────────────────────────

  describe('eraseUserData', () => {
    it('should process tables, clear storage, and delete auth account', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'patients') {
          return chainableQuery({ id: TEST_PATIENT_ID, user_id: TEST_USER_ID });
        }
        if (table === 'providers') {
          return chainableQuery(null, { code: 'PGRST116' });
        }
        if (table === 'user_profiles') {
          return chainableQuery({ id: TEST_USER_ID, email: 'test@example.com' });
        }
        // Return success for delete/update operations
        return chainableQuery(null, null);
      });

      mockAuthAdmin.deleteUser.mockResolvedValue({ error: null });

      const result = await eraseUserData(TEST_USER_ID, 'admin-123');

      expect(result.userId).toBe(TEST_USER_ID);
      expect(result.deletedAt).toBeDefined();
      expect(result.tablesProcessed.length).toBeGreaterThan(0);
      expect(result.authAccountDeleted).toBe(true);
    });

    it('should handle auth deletion failure gracefully', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'patients' || table === 'providers') {
          return chainableQuery(null, { code: 'PGRST116' });
        }
        if (table === 'user_profiles') {
          return chainableQuery({ id: TEST_USER_ID, email: 'test@example.com' });
        }
        return chainableQuery(null, null);
      });

      mockAuthAdmin.deleteUser.mockResolvedValue({
        error: { message: 'User not found' },
      });

      const result = await eraseUserData(TEST_USER_ID, TEST_USER_ID);

      expect(result.authAccountDeleted).toBe(false);
      // Erasure should still complete for other tables
      expect(result.tablesProcessed.length).toBeGreaterThan(0);
    });

    it('should anonymise financial and audit tables instead of deleting them', async () => {
      const updateCalls: string[] = [];

      mockFrom.mockImplementation((table: string) => {
        if (table === 'patients') {
          return chainableQuery({ id: TEST_PATIENT_ID, user_id: TEST_USER_ID });
        }
        if (table === 'providers') {
          return chainableQuery(null, { code: 'PGRST116' });
        }
        // Track update calls (anonymisation) for ALL tables including user_profiles
        const resolvedData =
          table === 'user_profiles' ? { id: TEST_USER_ID, email: 'test@example.com' } : null;
        const chain = chainableQuery(resolvedData, null);
        const origUpdate = chain.update;
        chain.update = jest.fn<any>((...args: any[]) => {
          updateCalls.push(table);
          return origUpdate(...args);
        });
        return chain;
      });

      await eraseUserData(TEST_USER_ID, 'admin-123');

      // Verify anonymisation happened for financial/audit tables
      expect(updateCalls).toContain('transactions');
      expect(updateCalls).toContain('user_profiles');
    });

    it('should anonymise provider record when user has provider role', async () => {
      const PROVIDER_ID = 'c3333333-3333-4333-c333-333333333333';
      const anonymisedTables: string[] = [];

      mockFrom.mockImplementation((table: string) => {
        if (table === 'patients') {
          return chainableQuery(null, { code: 'PGRST116' }); // no patient
        }
        if (table === 'user_profiles') {
          return chainableQuery({ id: TEST_USER_ID, email: 'test@example.com' });
        }
        // For every table, track .update() calls (including providers)
        const resolvedData =
          table === 'providers'
            ? { id: PROVIDER_ID, user_id: TEST_USER_ID, business_name: 'Test Clinic' }
            : null;
        const chain = chainableQuery(resolvedData, null);
        const origUpdate = chain.update;
        chain.update = jest.fn<any>((...args: any[]) => {
          anonymisedTables.push(table);
          return origUpdate(...args);
        });
        return chain;
      });

      const result = await eraseUserData(TEST_USER_ID, 'admin-123');

      expect(result.userId).toBe(TEST_USER_ID);
      // Provider should have been anonymised
      expect(anonymisedTables).toContain('providers');
    });

    it('should handle auth deletion throwing an exception', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'patients' || table === 'providers') {
          return chainableQuery(null, { code: 'PGRST116' });
        }
        if (table === 'user_profiles') {
          return chainableQuery({ id: TEST_USER_ID, email: 'test@example.com' });
        }
        return chainableQuery(null, null);
      });

      mockAuthAdmin.deleteUser.mockRejectedValue(new Error('Auth service unavailable'));

      const result = await eraseUserData(TEST_USER_ID, TEST_USER_ID);

      // Erasure should still complete even if auth deletion threw
      expect(result.authAccountDeleted).toBe(false);
      expect(result.tablesProcessed.length).toBeGreaterThan(0);
    });

    it('should handle safeDelete errors gracefully', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'patients') {
          return chainableQuery({ id: TEST_PATIENT_ID, user_id: TEST_USER_ID });
        }
        if (table === 'providers') {
          return chainableQuery(null, { code: 'PGRST116' });
        }
        if (table === 'user_profiles') {
          return chainableQuery({ id: TEST_USER_ID, email: 'test@example.com' });
        }
        if (table === 'notifications') {
          // Simulate delete failure
          const chain = chainableQuery(null, { message: 'Delete permission denied' });
          chain.delete = jest.fn<any>().mockReturnValue({
            eq: jest
              .fn<any>()
              .mockResolvedValue({ error: { message: 'Delete permission denied' } }),
          });
          return chain;
        }
        return chainableQuery(null, null);
      });

      // Should still complete without throwing
      const result = await eraseUserData(TEST_USER_ID, 'admin-123');
      expect(result.deletedAt).toBeDefined();
    });

    it('should handle safeAnonymise errors gracefully', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'patients') {
          return chainableQuery({ id: TEST_PATIENT_ID, user_id: TEST_USER_ID });
        }
        if (table === 'providers') {
          return chainableQuery(null, { code: 'PGRST116' });
        }
        if (table === 'user_profiles') {
          return chainableQuery({ id: TEST_USER_ID, email: 'test@example.com' });
        }
        if (table === 'transactions') {
          // Simulate update failure in safeAnonymise
          return chainableQuery(null, { message: 'Update permission denied' });
        }
        return chainableQuery(null, null);
      });

      // Should still complete
      const result = await eraseUserData(TEST_USER_ID, 'admin-123');
      expect(result.deletedAt).toBeDefined();
    });

    it('should handle safeDelete thrown exception (catch branch)', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'patients') {
          return chainableQuery({ id: TEST_PATIENT_ID, user_id: TEST_USER_ID });
        }
        if (table === 'providers') {
          return chainableQuery(null, { code: 'PGRST116' });
        }
        if (table === 'user_profiles') {
          return chainableQuery({ id: TEST_USER_ID, email: 'test@example.com' });
        }
        if (table === 'notifications') {
          throw new Error('safeDelete connection lost');
        }
        return chainableQuery(null, null);
      });

      const result = await eraseUserData(TEST_USER_ID, 'admin-123');
      expect(result.deletedAt).toBeDefined();
    });

    it('should handle safeAnonymise thrown exception (catch branch)', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'patients') {
          return chainableQuery({ id: TEST_PATIENT_ID, user_id: TEST_USER_ID });
        }
        if (table === 'providers') {
          return chainableQuery(null, { code: 'PGRST116' });
        }
        if (table === 'user_profiles') {
          return chainableQuery({ id: TEST_USER_ID, email: 'test@example.com' });
        }
        if (table === 'transactions') {
          throw new Error('safeAnonymise crash');
        }
        return chainableQuery(null, null);
      });

      const result = await eraseUserData(TEST_USER_ID, 'admin-123');
      expect(result.deletedAt).toBeDefined();
    });

    it('should clear storage files during erasure (clearStorageBucket)', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'patients') {
          return chainableQuery({ id: TEST_PATIENT_ID, user_id: TEST_USER_ID });
        }
        if (table === 'providers') {
          return chainableQuery(null, { code: 'PGRST116' });
        }
        if (table === 'user_profiles') {
          return chainableQuery({ id: TEST_USER_ID, email: 'test@example.com' });
        }
        return chainableQuery(null, null);
      });

      mockStorage.from.mockReturnValue({
        list: jest.fn<any>().mockResolvedValue({
          data: [{ name: 'doc1.pdf' }, { name: 'avatar.png' }],
          error: null,
        }),
        remove: jest.fn<any>().mockResolvedValue({ error: null }),
      });

      mockAuthAdmin.deleteUser.mockResolvedValue({ error: null });

      const result = await eraseUserData(TEST_USER_ID, 'admin-123');
      expect(result.storageCleared.length).toBeGreaterThan(0);

      // Restore storage mock for subsequent tests
      mockStorage.from.mockReturnValue({
        list: jest.fn<any>().mockResolvedValue({ data: [], error: null }),
        remove: jest.fn<any>().mockResolvedValue({ error: null }),
      });
    });

    it('should handle compliance log failure (best-effort audit catch)', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'patients') {
          return chainableQuery(null, { code: 'PGRST116' });
        }
        if (table === 'providers') {
          return chainableQuery(null, { code: 'PGRST116' });
        }
        if (table === 'user_profiles') {
          return chainableQuery({ id: TEST_USER_ID, email: 'test@example.com' });
        }
        if (table === 'compliance_logs') {
          throw new Error('Audit service down');
        }
        return chainableQuery(null, null);
      });

      mockAuthAdmin.deleteUser.mockResolvedValue({ error: null });

      const result = await eraseUserData(TEST_USER_ID, 'admin-123');
      expect(result.deletedAt).toBeDefined();
    });
  });

  // ── getConsents ─────────────────────────────────────────────────────

  describe('getConsents', () => {
    it('should return consent records for a patient', async () => {
      const mockConsents = [
        { id: '1', consent_type: 'treatment', granted: true },
        { id: '2', consent_type: 'marketing', granted: false },
      ];

      mockFrom.mockImplementation((table: string) => {
        if (table === 'patient_consents') {
          return chainableQuery(mockConsents);
        }
        return chainableQuery([]);
      });

      const consents = await getConsents(TEST_PATIENT_ID);

      expect(consents).toHaveLength(2);
      expect(consents[0]).toHaveProperty('consent_type', 'treatment');
    });
  });

  // ── updateConsent ───────────────────────────────────────────────────

  describe('updateConsent', () => {
    it('should create a new consent record when none exists', async () => {
      const newConsent = {
        id: '3',
        patient_id: TEST_PATIENT_ID,
        consent_type: 'data_sharing',
        granted: true,
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'patient_consents') {
          const chain = chainableQuery(null, { code: 'PGRST116' });
          // Override insert path
          chain.insert = jest.fn<any>().mockReturnValue({
            select: jest.fn<any>().mockReturnValue({
              single: jest.fn<any>().mockResolvedValue({ data: newConsent, error: null }),
            }),
          });
          return chain;
        }
        return chainableQuery([]);
      });

      const result = await updateConsent(TEST_PATIENT_ID, 'data_sharing', true, '127.0.0.1');

      expect(result).toBeDefined();
    });

    it('should update an existing consent record', async () => {
      const updatedConsent = {
        id: '3',
        patient_id: TEST_PATIENT_ID,
        consent_type: 'marketing',
        granted: false,
        revoked_at: '2026-02-26T00:00:00Z',
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'patient_consents') {
          const chain: any = {};
          chain.select = jest.fn<any>().mockReturnValue(chain);
          chain.eq = jest.fn<any>().mockReturnValue(chain);
          chain.single = jest.fn<any>().mockResolvedValue({ data: { id: '3' }, error: null });
          chain.update = jest.fn<any>().mockReturnValue({
            eq: jest.fn<any>().mockReturnValue({
              select: jest.fn<any>().mockReturnValue({
                single: jest.fn<any>().mockResolvedValue({
                  data: updatedConsent,
                  error: null,
                }),
              }),
            }),
          });
          return chain;
        }
        return chainableQuery([]);
      });

      const result = await updateConsent(TEST_PATIENT_ID, 'marketing', false);

      expect(result).toBeDefined();
    });

    it('should return null when consent insert fails', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'patient_consents') {
          const chain: any = {};
          chain.select = jest.fn<any>().mockReturnValue(chain);
          chain.eq = jest.fn<any>().mockReturnValue(chain);
          // single() → no existing consent found (null + PGRST116 error)
          chain.single = jest
            .fn<any>()
            .mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
          // insert fails
          chain.insert = jest.fn<any>().mockReturnValue({
            select: jest.fn<any>().mockReturnValue({
              single: jest.fn<any>().mockResolvedValue({
                data: null,
                error: { message: 'Insert failed' },
              }),
            }),
          });
          return chain;
        }
        return chainableQuery([]);
      });

      const result = await updateConsent(TEST_PATIENT_ID, 'data_sharing', true);

      expect(result).toBeNull();
    });

    it('should return null when consent update fails', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'patient_consents') {
          const chain: any = {};
          chain.select = jest.fn<any>().mockReturnValue(chain);
          chain.eq = jest.fn<any>().mockReturnValue(chain);
          // single() → existing consent found
          chain.single = jest.fn<any>().mockResolvedValue({ data: { id: '3' }, error: null });
          // update fails
          chain.update = jest.fn<any>().mockReturnValue({
            eq: jest.fn<any>().mockReturnValue({
              select: jest.fn<any>().mockReturnValue({
                single: jest.fn<any>().mockResolvedValue({
                  data: null,
                  error: { message: 'Update failed' },
                }),
              }),
            }),
          });
          return chain;
        }
        return chainableQuery([]);
      });

      const result = await updateConsent(TEST_PATIENT_ID, 'marketing', false);

      expect(result).toBeNull();
    });
  });
});

// ── Route-level integration tests ──────────────────────────────────────

describe('GDPR Routes', () => {
  let app: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock DB responses for route handlers
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return chainableQuery({
          id: TEST_USER_ID,
          email: 'test@example.com',
          role: 'patient',
        });
      }
      if (table === 'patients') {
        return chainableQuery({ id: TEST_PATIENT_ID, user_id: TEST_USER_ID });
      }
      if (table === 'providers') {
        return chainableQuery(null, { code: 'PGRST116' });
      }
      return chainableQuery([]);
    });

    // Build a minimal Express app with GDPR routes
    const express = (await import('express')).default;
    const testApp = express();
    testApp.use(express.json());

    const { default: gdprRoutes } = await import('../routes/gdpr.routes.js');
    testApp.use('/gdpr', gdprRoutes);
    app = testApp;
  });

  it('GET /gdpr/export should return a data export package', async () => {
    const { default: request } = await import('supertest');
    const res = await request(app).get('/gdpr/export').set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('exportedAt');
    expect(res.body.data).toHaveProperty('userId');
  });

  it('POST /gdpr/erasure should require confirmDeletion', async () => {
    const { default: request } = await import('supertest');
    const res = await request(app)
      .post('/gdpr/erasure')
      .set('Authorization', 'Bearer test-token')
      .send({});

    expect(res.status).toBe(400);
  });

  it('POST /gdpr/erasure with confirmation should succeed', async () => {
    mockAuthAdmin.deleteUser.mockResolvedValue({ error: null });

    const { default: request } = await import('supertest');
    const res = await request(app)
      .post('/gdpr/erasure')
      .set('Authorization', 'Bearer test-token')
      .send({ confirmDeletion: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('tablesProcessed');
  });

  it('GET /gdpr/consents should return consent list', async () => {
    const { default: request } = await import('supertest');
    const res = await request(app).get('/gdpr/consents').set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('PUT /gdpr/consents should validate required fields', async () => {
    const { default: request } = await import('supertest');
    const res = await request(app)
      .put('/gdpr/consents')
      .set('Authorization', 'Bearer test-token')
      .send({ consentType: 'marketing' });
    // missing "granted"

    expect(res.status).toBe(400);
  });

  it('PUT /gdpr/consents should reject invalid consent types', async () => {
    const { default: request } = await import('supertest');
    const res = await request(app)
      .put('/gdpr/consents')
      .set('Authorization', 'Bearer test-token')
      .send({ consentType: 'invalid_type', granted: true });

    expect(res.status).toBe(400);
  });

  it('PUT /gdpr/consents should succeed with valid consent data', async () => {
    // Override mock for successful consent flow
    mockFrom.mockImplementation((table: string) => {
      if (table === 'patients') {
        return chainableQuery({ id: TEST_PATIENT_ID, user_id: TEST_USER_ID });
      }
      if (table === 'patient_consents') {
        return chainableQuery({
          id: 'consent-1',
          patient_id: TEST_PATIENT_ID,
          consent_type: 'marketing',
          granted: true,
        });
      }
      if (table === 'compliance_logs') {
        return chainableQuery({ id: 'log-1' });
      }
      return chainableQuery([]);
    });

    const { default: request } = await import('supertest');
    const res = await request(app)
      .put('/gdpr/consents')
      .set('Authorization', 'Bearer test-token')
      .send({ consentType: 'marketing', granted: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('PUT /gdpr/consents should return 404 if no patient record', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'patients') {
        return chainableQuery(null); // No patient found
      }
      return chainableQuery([]);
    });

    const { default: request } = await import('supertest');
    const res = await request(app)
      .put('/gdpr/consents')
      .set('Authorization', 'Bearer test-token')
      .send({ consentType: 'marketing', granted: true });

    expect(res.status).toBe(404);
  });

  it('PUT /gdpr/consents should return 500 when consent update fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'patients') {
        return chainableQuery({ id: TEST_PATIENT_ID, user_id: TEST_USER_ID });
      }
      if (table === 'patient_consents') {
        // Return error to simulate DB failure
        return chainableQuery(null, { message: 'DB error' });
      }
      return chainableQuery([]);
    });

    const { default: request } = await import('supertest');
    const res = await request(app)
      .put('/gdpr/consents')
      .set('Authorization', 'Bearer test-token')
      .send({ consentType: 'treatment', granted: false });

    expect(res.status).toBe(500);
  });

  it('POST /gdpr/erasure should return 403 when non-admin tries to erase another user', async () => {
    // Override mock so user_profiles returns patient role
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return chainableQuery({ id: TEST_USER_ID, role: 'patient' });
      }
      return chainableQuery([]);
    });

    const { default: request } = await import('supertest');
    const res = await request(app)
      .post('/gdpr/erasure')
      .set('Authorization', 'Bearer test-token')
      .send({ confirmDeletion: true, userId: 'other-user-id' });

    expect(res.status).toBe(403);
  });

  it('POST /gdpr/erasure should allow admin to erase another user', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return chainableQuery({ id: TEST_USER_ID, role: 'admin', email: 'admin@example.com' });
      }
      if (table === 'patients' || table === 'providers') {
        return chainableQuery(null, { code: 'PGRST116' });
      }
      return chainableQuery(null, null);
    });

    mockAuthAdmin.deleteUser.mockResolvedValue({ error: null });

    const { default: request } = await import('supertest');
    const res = await request(app)
      .post('/gdpr/erasure')
      .set('Authorization', 'Bearer test-token')
      .send({ confirmDeletion: true, userId: 'other-user-id' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /gdpr/consents should return empty array when no patient record', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'patients') {
        return chainableQuery(null); // No patient found
      }
      return chainableQuery([]);
    });

    const { default: request } = await import('supertest');
    const res = await request(app).get('/gdpr/consents').set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });
});
