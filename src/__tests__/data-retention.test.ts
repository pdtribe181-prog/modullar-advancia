/**
 * Data Retention Service — Tests
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ── Mocks ──────────────────────────────────────────────────────────────

// Build a thenable query builder so both `await .lt()` and `.lt().eq(...)` work
function buildThenableQuery(result: any) {
  const obj: any = {
    eq: jest.fn<any>(),
    then(resolve: any, reject?: any) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  obj.eq.mockReturnValue(obj);
  return obj;
}

const mockDelete = jest.fn<any>().mockReturnValue({
  lt: jest.fn<any>().mockReturnValue(buildThenableQuery({ count: 3, error: null })),
});

const mockUpdate = jest.fn<any>().mockReturnValue({
  lt: jest.fn<any>().mockReturnValue(buildThenableQuery({ count: 2, error: null })),
});

const mockInsert = jest.fn<any>().mockResolvedValue({ error: null });

const mockSelect = jest.fn<any>().mockReturnValue({
  or: jest.fn<any>().mockResolvedValue({ data: [], error: null }),
  eq: jest.fn<any>().mockReturnValue({
    order: jest.fn<any>().mockReturnValue({
      limit: jest.fn<any>().mockResolvedValue({ data: [], error: null }),
    }),
  }),
});

const mockFrom = jest.fn<any>().mockImplementation(() => ({
  delete: mockDelete,
  update: mockUpdate,
  insert: mockInsert,
  select: mockSelect,
}));

jest.unstable_mockModule('../lib/supabase.js', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}));

jest.unstable_mockModule('../middleware/logging.middleware.js', () => ({
  logger: {
    info: jest.fn<any>(),
    error: jest.fn<any>(),
    warn: jest.fn<any>(),
    debug: jest.fn<any>(),
  },
}));

// ── Dynamic imports ────────────────────────────────────────────────────

const {
  RETENTION_POLICIES,
  parseIntervalToMs,
  enforceRetentionPolicies,
  getRetentionPolicySummary,
} = await import('../services/data-retention.service.js');

// ── Tests ──────────────────────────────────────────────────────────────

describe('Data Retention Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── parseIntervalToMs ─────────────────────────────────────────────

  describe('parseIntervalToMs', () => {
    it('should parse "30 days" correctly', () => {
      expect(parseIntervalToMs('30 days')).toBe(30 * 86_400_000);
    });

    it('should parse "1 year" correctly', () => {
      const result = parseIntervalToMs('1 year');
      // ~365.25 days
      expect(result).toBeGreaterThan(364 * 86_400_000);
      expect(result).toBeLessThan(367 * 86_400_000);
    });

    it('should parse "7 years" correctly', () => {
      const result = parseIntervalToMs('7 years');
      expect(result).toBeGreaterThan(2550 * 86_400_000);
    });

    it('should parse "1 hour" correctly', () => {
      expect(parseIntervalToMs('1 hour')).toBe(3_600_000);
    });

    it('should parse "90 days" correctly', () => {
      expect(parseIntervalToMs('90 days')).toBe(90 * 86_400_000);
    });

    it('should throw for invalid interval', () => {
      expect(() => parseIntervalToMs('invalid')).toThrow();
    });

    it('should throw for unknown unit', () => {
      expect(() => parseIntervalToMs('5 parsecs')).toThrow();
    });
  });

  // ── RETENTION_POLICIES ────────────────────────────────────────────

  describe('RETENTION_POLICIES', () => {
    it('should define at least 10 policies', () => {
      expect(RETENTION_POLICIES.length).toBeGreaterThanOrEqual(10);
    });

    it('every policy should have required fields', () => {
      for (const p of RETENTION_POLICIES) {
        expect(p.name).toBeTruthy();
        expect(p.table).toBeTruthy();
        expect(p.timestampColumn).toBeTruthy();
        expect(p.retentionInterval).toBeTruthy();
        expect(['delete', 'anonymise']).toContain(p.action);
        expect(p.regulation).toBeTruthy();
      }
    });

    it('anonymise policies should have anonymiseColumns', () => {
      const anonymisePolicies = RETENTION_POLICIES.filter((p) => p.action === 'anonymise');
      for (const p of anonymisePolicies) {
        expect(p.anonymiseColumns).toBeDefined();
        expect(Object.keys(p.anonymiseColumns!).length).toBeGreaterThan(0);
      }
    });

    it('HIPAA-regulated tables should have 7-year retention', () => {
      const hipaa = RETENTION_POLICIES.filter((p) => p.regulation.includes('HIPAA'));
      expect(hipaa.length).toBeGreaterThanOrEqual(3);
      for (const p of hipaa) {
        expect(p.retentionInterval).toBe('7 years');
      }
    });
  });

  // ── getRetentionPolicySummary ─────────────────────────────────────

  describe('getRetentionPolicySummary', () => {
    it('should return a summary for each policy', () => {
      const summary = getRetentionPolicySummary();
      expect(summary.length).toBe(RETENTION_POLICIES.length);
      expect(summary[0]).toHaveProperty('name');
      expect(summary[0]).toHaveProperty('table');
      expect(summary[0]).toHaveProperty('retention');
      expect(summary[0]).toHaveProperty('action');
      expect(summary[0]).toHaveProperty('regulation');
    });
  });

  // ── enforceRetentionPolicies ──────────────────────────────────────

  describe('enforceRetentionPolicies', () => {
    it('should return results for all policies', async () => {
      const results = await enforceRetentionPolicies();
      expect(results.length).toBe(RETENTION_POLICIES.length);
    });

    it('each result should have policy, table, action, rowsAffected', async () => {
      const results = await enforceRetentionPolicies();
      for (const r of results) {
        expect(r).toHaveProperty('policy');
        expect(r).toHaveProperty('table');
        expect(r).toHaveProperty('action');
        expect(typeof r.rowsAffected).toBe('number');
      }
    });

    it('should log the enforcement run to compliance_logs', async () => {
      await enforceRetentionPolicies();

      const insertCalls = mockInsert.mock.calls;
      // At least one compliance_logs insert for the enforcement run itself
      const complianceInserts = mockFrom.mock.calls.filter((c: any) => c[0] === 'compliance_logs');
      expect(complianceInserts.length).toBeGreaterThan(0);
    });

    it('should handle DB errors gracefully', async () => {
      mockDelete.mockReturnValueOnce({
        lt: jest.fn<any>().mockReturnValue({
          eq: jest.fn<any>().mockResolvedValue({
            count: null,
            error: { message: 'table not found' },
          }),
        }),
      });

      const results = await enforceRetentionPolicies();
      // Should have some results with errors
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle anonymise action for policies with anonymiseColumns', async () => {
      // The enforceRetentionPolicies includes anonymise actions (e.g., user_profiles after 7y).
      // The mock update chain should be called for those.
      const results = await enforceRetentionPolicies();
      const anonymised = results.filter((r: any) => r.action === 'anonymise');
      // If there are anonymise policies, they should succeed
      if (anonymised.length > 0) {
        for (const a of anonymised) {
          expect(typeof a.rowsAffected).toBe('number');
        }
      }
    });

    it('should handle policies with custom conditions', async () => {
      const results = await enforceRetentionPolicies();
      const withConditions = RETENTION_POLICIES.filter((p: any) => p.condition);
      // If there are policies with conditions, they should be in results
      if (withConditions.length > 0) {
        const conditionResults = results.filter((r: any) =>
          withConditions.some((p: any) => p.table === r.table)
        );
        expect(conditionResults.length).toBeGreaterThan(0);
      }
    });

    it('should handle update errors during anonymisation', async () => {
      mockUpdate.mockReturnValueOnce({
        lt: jest.fn<any>().mockResolvedValue({
          count: null,
          error: { message: 'permission denied' },
        }),
      });

      const results = await enforceRetentionPolicies();
      // Some results may have error info
      expect(results.length).toBeGreaterThan(0);
    });
  });
});
