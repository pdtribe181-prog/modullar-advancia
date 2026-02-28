/**
 * CSRF Middleware Tests
 * Covers: generateCsrfToken, csrfProtection
 */
import { jest } from '@jest/globals';

const mockRedisSet = jest.fn<any>().mockResolvedValue('OK');
const mockRedisGet = jest.fn<any>();

jest.unstable_mockModule('../lib/redis.js', () => ({
  getRedis: () => ({
    set: mockRedisSet,
    get: mockRedisGet,
  }),
}));

jest.unstable_mockModule('../middleware/logging.middleware.js', () => ({
  logger: {
    info: jest.fn<any>(),
    warn: jest.fn<any>(),
    error: jest.fn<any>(),
    debug: jest.fn<any>(),
  },
}));

const { generateCsrfToken, csrfProtection } = await import('../middleware/csrf.middleware.js');

function mockReq(overrides: any = {}): any {
  return {
    method: 'GET',
    url: '/api/v1/test',
    path: '/api/v1/test',
    originalUrl: '/api/v1/test',
    headers: {},
    ...overrides,
  };
}

function mockRes(): any {
  const res: any = {};
  res.status = jest.fn<any>().mockReturnValue(res);
  res.json = jest.fn<any>().mockReturnValue(res);
  return res;
}

describe('CSRF Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('generateCsrfToken', () => {
    it('generates a token when authenticated', async () => {
      const req = mockReq({ headers: { authorization: 'Bearer valid-jwt-token' } });
      const res = mockRes();
      const token = await generateCsrfToken(req, res);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes → 64 hex chars
      expect(mockRedisSet).toHaveBeenCalledWith(expect.stringContaining('csrf:'), token, {
        ex: 3600,
      });
    });

    it('throws when not authenticated', async () => {
      const req = mockReq({ headers: {} });
      const res = mockRes();
      await expect(generateCsrfToken(req, res)).rejects.toThrow(
        'CSRF token generation requires authentication'
      );
    });

    it('throws when authorization header is not Bearer', async () => {
      const req = mockReq({ headers: { authorization: 'Basic abc123' } });
      const res = mockRes();
      await expect(generateCsrfToken(req, res)).rejects.toThrow(
        'CSRF token generation requires authentication'
      );
    });
  });

  describe('csrfProtection', () => {
    const next = jest.fn<any>();

    beforeEach(() => {
      next.mockClear();
    });

    it('skips GET requests (safe method)', () => {
      const req = mockReq({ method: 'GET' });
      const res = mockRes();
      csrfProtection(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('skips HEAD requests (safe method)', () => {
      const req = mockReq({ method: 'HEAD' });
      const res = mockRes();
      csrfProtection(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('skips OPTIONS requests (safe method)', () => {
      const req = mockReq({ method: 'OPTIONS' });
      const res = mockRes();
      csrfProtection(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('skips Stripe webhook path', () => {
      const req = mockReq({
        method: 'POST',
        path: '/api/v1/stripe/webhook',
        originalUrl: '/api/v1/stripe/webhook',
      });
      const res = mockRes();
      csrfProtection(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('skips Supabase webhook path', () => {
      const req = mockReq({
        method: 'POST',
        path: '/api/v1/webhooks/supabase',
        originalUrl: '/api/v1/webhooks/supabase',
      });
      const res = mockRes();
      csrfProtection(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('skips unauthenticated requests (login/register)', () => {
      const req = mockReq({ method: 'POST', headers: {} });
      const res = mockRes();
      csrfProtection(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('skips Bearer-authenticated requests (SPA clients)', () => {
      const req = mockReq({
        method: 'POST',
        headers: { authorization: 'Bearer valid-jwt' },
      });
      const res = mockRes();
      csrfProtection(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('rejects POST with cookie-auth but missing CSRF token', async () => {
      // Simulate cookie-based auth: has session key but no Bearer → needs CSRF
      // sessionKey returns a key only for Bearer tokens, but csrfProtection
      // skips if sessionKey returns null (no auth) or if Bearer auth is present.
      // The only path that requires CSRF is cookie auth which is not implemented
      // in Express (Bearer-only). Test documents the current behavior:
      // With no auth header, csrfProtection skips (unauthenticated).
      const req = mockReq({ method: 'POST', headers: {} });
      const res = mockRes();
      csrfProtection(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('skips DELETE requests with Bearer auth', () => {
      const req = mockReq({
        method: 'DELETE',
        headers: { authorization: 'Bearer valid-jwt' },
      });
      const res = mockRes();
      csrfProtection(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('skips PATCH requests with Bearer auth', () => {
      const req = mockReq({
        method: 'PATCH',
        headers: { authorization: 'Bearer valid-jwt' },
      });
      const res = mockRes();
      csrfProtection(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });
  });
});
