import { jest } from '@jest/globals';

// Lightweight Express mock for middleware tests
function mockReq(overrides: Record<string, any> = {}): any {
  return {
    originalUrl: '/api/v1/test',
    headers: {},
    ...overrides,
  };
}

function mockRes(): any {
  const res: any = {
    _headers: {} as Record<string, string>,
    _status: 200,
    _body: null as any,
  };
  res.setHeader = jest.fn((k: string, v: string) => {
    res._headers[k] = v;
  });
  res.status = jest.fn((code: number) => {
    res._status = code;
    return res;
  });
  res.json = jest.fn((body: any) => {
    res._body = body;
  });
  return res;
}

const nextFn = jest.fn<any>();

const { apiVersioning, requireVersion, SUPPORTED_VERSIONS, CURRENT_VERSION, DEPRECATED_VERSIONS } =
  await import('../middleware/api-versioning.middleware.js');

describe('API Versioning Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('apiVersioning', () => {
    it('resolves version from URL path prefix /api/v1/', () => {
      const req = mockReq({ originalUrl: '/api/v1/auth/login' });
      const res = mockRes();
      apiVersioning(req, res, nextFn);
      expect(req.apiVersion).toBe(1);
      expect(nextFn).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('X-API-Version', '1');
    });

    it('resolves version from Accept header', () => {
      const req = mockReq({
        originalUrl: '/something',
        headers: { accept: 'application/vnd.advancia.v1+json' },
      });
      const res = mockRes();
      apiVersioning(req, res, nextFn);
      expect(req.apiVersion).toBe(1);
      expect(nextFn).toHaveBeenCalled();
    });

    it('resolves version from X-API-Version header', () => {
      const req = mockReq({
        originalUrl: '/something',
        headers: { 'x-api-version': '1' },
      });
      const res = mockRes();
      apiVersioning(req, res, nextFn);
      expect(req.apiVersion).toBe(1);
      expect(nextFn).toHaveBeenCalled();
    });

    it('defaults to CURRENT_VERSION when no version indicator present', () => {
      const req = mockReq({ originalUrl: '/something' });
      const res = mockRes();
      apiVersioning(req, res, nextFn);
      expect(req.apiVersion).toBe(CURRENT_VERSION);
      expect(nextFn).toHaveBeenCalled();
    });

    it('URL path takes priority over headers', () => {
      const req = mockReq({
        originalUrl: '/api/v1/test',
        headers: { 'x-api-version': '99' },
      });
      const res = mockRes();
      apiVersioning(req, res, nextFn);
      expect(req.apiVersion).toBe(1);
    });

    it('Accept header takes priority over X-API-Version header', () => {
      const req = mockReq({
        originalUrl: '/something',
        headers: {
          accept: 'application/vnd.advancia.v1+json',
          'x-api-version': '99',
        },
      });
      const res = mockRes();
      apiVersioning(req, res, nextFn);
      expect(req.apiVersion).toBe(1);
      expect(nextFn).toHaveBeenCalled();
    });

    it('rejects unsupported version from URL path with 400', () => {
      const req = mockReq({ originalUrl: '/api/v99/test' });
      const res = mockRes();
      apiVersioning(req, res, nextFn);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res._body).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('not supported'),
          currentVersion: CURRENT_VERSION,
        })
      );
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('rejects unsupported version from Accept header with 400', () => {
      const req = mockReq({
        originalUrl: '/something',
        headers: { accept: 'application/vnd.advancia.v99+json' },
      });
      const res = mockRes();
      apiVersioning(req, res, nextFn);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res._body.error).toContain('not supported');
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('rejects version 0 as unsupported', () => {
      const req = mockReq({ originalUrl: '/api/v0/test' });
      const res = mockRes();
      apiVersioning(req, res, nextFn);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('adds deprecation headers for deprecated versions', () => {
      // Temporarily mark version 1 as deprecated
      DEPRECATED_VERSIONS[1] = { sunset: '2099-01-01', message: 'v1 is deprecated, use v2' };
      try {
        const req = mockReq({ originalUrl: '/api/v1/test' });
        const res = mockRes();
        apiVersioning(req, res, nextFn);
        expect(res.setHeader).toHaveBeenCalledWith('Deprecation', 'true');
        expect(res.setHeader).toHaveBeenCalledWith('Sunset', '2099-01-01');
        expect(res.setHeader).toHaveBeenCalledWith(
          'X-Deprecation-Notice',
          'v1 is deprecated, use v2'
        );
        expect(nextFn).toHaveBeenCalled();
      } finally {
        delete DEPRECATED_VERSIONS[1];
      }
    });

    it('sets X-API-Version response header', () => {
      const req = mockReq({ originalUrl: '/api/v1/test' });
      const res = mockRes();
      apiVersioning(req, res, nextFn);
      expect(res.setHeader).toHaveBeenCalledWith('X-API-Version', '1');
    });

    it('ignores non-numeric X-API-Version header', () => {
      const req = mockReq({
        originalUrl: '/something',
        headers: { 'x-api-version': 'abc' },
      });
      const res = mockRes();
      apiVersioning(req, res, nextFn);
      expect(req.apiVersion).toBe(CURRENT_VERSION);
      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('requireVersion', () => {
    it('allows request when version matches', () => {
      const req = mockReq({ apiVersion: 1 });
      const res = mockRes();
      const mw = requireVersion(1);
      mw(req, res, nextFn);
      expect(nextFn).toHaveBeenCalled();
    });

    it('allows request when version is in allowed list', () => {
      const req = mockReq({ apiVersion: 1 });
      const res = mockRes();
      const mw = requireVersion(1, 2);
      mw(req, res, nextFn);
      expect(nextFn).toHaveBeenCalled();
    });

    it('rejects request when version is not in allowed list', () => {
      const req = mockReq({ apiVersion: 1 });
      const res = mockRes();
      const mw = requireVersion(2);
      mw(req, res, nextFn);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res._body).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('only available'),
        })
      );
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('defaults to CURRENT_VERSION when apiVersion is undefined', () => {
      const req = mockReq({});
      const res = mockRes();
      const mw = requireVersion(CURRENT_VERSION);
      mw(req, res, nextFn);
      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('SUPPORTED_VERSIONS constant', () => {
    it('includes version 1', () => {
      expect(SUPPORTED_VERSIONS).toContain(1);
    });

    it('has at least one version', () => {
      expect(SUPPORTED_VERSIONS.length).toBeGreaterThan(0);
    });
  });

  describe('CURRENT_VERSION constant', () => {
    it('equals 1', () => {
      expect(CURRENT_VERSION).toBe(1);
    });

    it('is included in SUPPORTED_VERSIONS', () => {
      expect(SUPPORTED_VERSIONS).toContain(CURRENT_VERSION);
    });
  });
});
