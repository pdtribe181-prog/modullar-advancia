/**
 * Audit Logging Middleware — Tests
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// ── Mocks ──────────────────────────────────────────────────────────────

const mockInsert = jest.fn<any>().mockResolvedValue({ error: null });
const mockFrom = jest.fn<any>().mockReturnValue({ insert: mockInsert });

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

const { auditLog, auditAuth, auditPayment, auditAdmin, auditGdpr } =
  await import('../middleware/audit.middleware.js');

// ── Helpers ────────────────────────────────────────────────────────────

function createMockReq(overrides: Partial<Request> = {}): any {
  return {
    method: 'POST',
    path: '/api/v1/payments',
    originalUrl: '/api/v1/payments',
    headers: { 'user-agent': 'test-agent' },
    params: {},
    socket: { remoteAddress: '127.0.0.1' },
    user: { id: 'user-123' },
    ...overrides,
  };
}

function createMockRes(): any {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  return {
    statusCode: 200,
    on: jest.fn<any>((event: string, cb: (...args: unknown[]) => void) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
    }),
    _emit: (event: string) => {
      for (const cb of listeners[event] || []) cb();
    },
  };
}

function createMockNext(): NextFunction {
  return jest.fn<any>() as any;
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('Audit Logging Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call next() immediately', () => {
    const middleware = auditLog('test.action');
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should register a finish listener on the response', () => {
    const middleware = auditLog('test.action');
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    middleware(req, res, next);

    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('should write to access_audit_logs on response finish', async () => {
    const middleware = auditLog('payment.create');
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    middleware(req, res, next);
    res._emit('finish');

    // Allow the async fire-and-forget to complete
    await new Promise((r) => setTimeout(r, 50));

    expect(mockFrom).toHaveBeenCalledWith('access_audit_logs');
    expect(mockInsert).toHaveBeenCalled();

    const insertArg = mockInsert.mock.calls[0][0] as any;
    expect(insertArg.user_id).toBe('user-123');
    expect(insertArg.action).toBe('payment.create');
    expect(insertArg.request_method).toBe('POST');
    expect(insertArg.response_status).toBe(200);
    expect(insertArg.access_granted).toBe(true);
  });

  it('should also write to compliance_logs for compliance actions', async () => {
    const middleware = auditLog({ action: 'auth.login', compliance: true });
    const req = createMockReq({ method: 'POST', path: '/api/v1/auth/login' });
    const res = createMockRes();
    const next = createMockNext();

    middleware(req, res, next);
    res._emit('finish');
    await new Promise((r) => setTimeout(r, 50));

    const calledTables = mockFrom.mock.calls.map((c: any) => c[0]);
    expect(calledTables).toContain('access_audit_logs');
    expect(calledTables).toContain('compliance_logs');
  });

  it('should write to security_events for high-severity actions', async () => {
    const middleware = auditLog({ action: 'gdpr.erasure', severity: 'high' });
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    middleware(req, res, next);
    res._emit('finish');
    await new Promise((r) => setTimeout(r, 50));

    const calledTables = mockFrom.mock.calls.map((c: any) => c[0]);
    expect(calledTables).toContain('access_audit_logs');
    expect(calledTables).toContain('compliance_logs'); // gdpr.erasure is in COMPLIANCE_ACTIONS
    expect(calledTables).toContain('security_events');
  });

  it('should record denial for 4xx/5xx responses', async () => {
    const middleware = auditLog('test.action');
    const req = createMockReq();
    const res = createMockRes();
    res.statusCode = 403;
    const next = createMockNext();

    middleware(req, res, next);
    res._emit('finish');
    await new Promise((r) => setTimeout(r, 50));

    const insertArg = mockInsert.mock.calls[0][0] as any;
    expect(insertArg.access_granted).toBe(false);
    expect(insertArg.denial_reason).toBe('HTTP 403');
  });

  it('should extract resource ID from route params', async () => {
    const middleware = auditLog('payment.get');
    const req = createMockReq({
      params: { id: 'a1111111-1111-4111-a111-111111111111' } as any,
    });
    const res = createMockRes();
    const next = createMockNext();

    middleware(req, res, next);
    res._emit('finish');
    await new Promise((r) => setTimeout(r, 50));

    const insertArg = mockInsert.mock.calls[0][0] as any;
    expect(insertArg.resource_id).toBe('a1111111-1111-4111-a111-111111111111');
  });

  it('should handle unauthenticated requests (no user)', async () => {
    const middleware = auditLog('public.access');
    const req = createMockReq();
    delete req.user;
    const res = createMockRes();
    const next = createMockNext();

    middleware(req, res, next);
    res._emit('finish');
    await new Promise((r) => setTimeout(r, 50));

    const insertArg = mockInsert.mock.calls[0][0] as any;
    expect(insertArg.user_id).toBeNull();
  });

  it('should never throw even if DB insert fails', async () => {
    mockInsert.mockRejectedValueOnce(new Error('DB down'));

    const middleware = auditLog('test.action');
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    middleware(req, res, next);
    res._emit('finish');

    // Should not throw
    await new Promise((r) => setTimeout(r, 50));

    expect(next).toHaveBeenCalled();
  });

  // ── Convenience helpers ──────────────────────────────────────────────

  it('auditAuth should prefix action with auth.', async () => {
    const middleware = auditAuth('login');
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();

    res._emit('finish');
    await new Promise((r) => setTimeout(r, 50));

    const insertArg = mockInsert.mock.calls[0][0] as any;
    expect(insertArg.action).toBe('auth.login');
  });

  it('auditPayment should prefix action with payment.', async () => {
    const middleware = auditPayment('create');
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();

    res._emit('finish');
    await new Promise((r) => setTimeout(r, 50));

    const insertArg = mockInsert.mock.calls[0][0] as any;
    expect(insertArg.action).toBe('payment.create');
  });

  it('auditAdmin should prefix action with admin.', async () => {
    const middleware = auditAdmin('role_change');
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();

    res._emit('finish');
    await new Promise((r) => setTimeout(r, 50));

    const insertArg = mockInsert.mock.calls[0][0] as any;
    expect(insertArg.action).toBe('admin.role_change');
  });

  it('auditGdpr should prefix action with gdpr.', async () => {
    const middleware = auditGdpr('export');
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();

    res._emit('finish');
    await new Promise((r) => setTimeout(r, 50));

    const insertArg = mockInsert.mock.calls[0][0] as any;
    expect(insertArg.action).toBe('gdpr.export');
  });

  it('should catch and log errors when audit write throws synchronously', async () => {
    // Make mockFrom throw to trigger the catch block in writeAuditRecord
    mockFrom.mockImplementationOnce(() => {
      throw new Error('Supabase unavailable');
    });

    const middleware = auditLog('test.crash');
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    middleware(req, res, next);
    res._emit('finish');

    // Wait for async writeAuditRecord to complete
    await new Promise((r) => setTimeout(r, 50));

    // Should not throw — the catch block handles it
    expect(next).toHaveBeenCalled();
  });
});
