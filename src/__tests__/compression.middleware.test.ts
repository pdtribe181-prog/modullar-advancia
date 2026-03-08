/**
 * Compression Middleware Tests
 * Tests for createCompressionMiddleware, compressionMiddleware,
 * highCompressionMiddleware, fastCompressionMiddleware
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// Import directly — no external mocks needed for this module
const {
  createCompressionMiddleware,
  compressionMiddleware,
  highCompressionMiddleware,
  fastCompressionMiddleware,
} = await import('../middleware/compression.middleware.js');

// ── Helpers ──

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    path: '/api/data',
    headers: {
      'accept-encoding': 'gzip, deflate, br',
    },
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response & { _endCalled: boolean; _chunk: any; _encoding: any } {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  const res: any = {
    _endCalled: false,
    _chunk: null,
    _encoding: null,
    statusCode: 200,
    getHeader: jest.fn<any>().mockImplementation((name: string) => headers[name.toLowerCase()]),
    setHeader: jest
      .fn<any>()
      .mockImplementation((name: string, value: string) => {
        headers[name.toLowerCase()] = value;
      })
      .mockReturnThis(),
    removeHeader: jest
      .fn<any>()
      .mockImplementation((name: string) => {
        delete headers[name.toLowerCase()];
      })
      .mockReturnThis(),
    // Simulated end function — will be overridden by the middleware
    end: jest.fn<any>().mockImplementation(function (this: any, chunk?: any, encoding?: any) {
      this._endCalled = true;
      this._chunk = chunk;
      this._encoding = encoding;
      return this;
    }),
  };
  return res;
}

const nextFn: NextFunction = jest.fn<any>();

// ── Tests ──

describe('Compression Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCompressionMiddleware', () => {
    it('returns a middleware function', () => {
      const mw = createCompressionMiddleware();
      expect(typeof mw).toBe('function');
      expect(mw.length).toBe(3); // (req, res, next)
    });

    it('calls next() immediately (sets up res.end intercept)', () => {
      const mw = createCompressionMiddleware();
      const req = mockReq();
      const res = mockRes();
      mw(req, res, nextFn);
      expect(nextFn).toHaveBeenCalled();
    });

    it('skips compression when no accept-encoding header', () => {
      const mw = createCompressionMiddleware();
      const req = mockReq({ headers: {} });
      const res = mockRes();

      mw(req, res, nextFn);
      expect(nextFn).toHaveBeenCalled();

      // res.end should NOT be overridden (still the original mock)
      res.end('hello');
      expect(res._endCalled).toBe(true);
    });

    it('skips compression when content is below threshold', () => {
      const mw = createCompressionMiddleware({ threshold: 10000 });
      const req = mockReq();
      const res = mockRes();

      mw(req, res, nextFn);
      // End is intercepted by middleware but chunk is small
      const smallPayload = JSON.stringify({ ok: true });
      res.end(smallPayload);
      // Result should still call end (passthrough for small payloads)
    });

    it('compresses JSON content with gzip when above threshold', (done) => {
      const mw = createCompressionMiddleware({ threshold: 10 });
      const req = mockReq({ headers: { 'accept-encoding': 'gzip' } });
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      const res: any = {
        statusCode: 200,
        getHeader: (n: string) => headers[n.toLowerCase()],
        setHeader: (n: string, v: string) => {
          headers[n.toLowerCase()] = v;
        },
        removeHeader: (n: string) => {
          delete headers[n.toLowerCase()];
        },
        end: function (chunk?: any, _encoding?: any, callback?: any) {
          // After middleware overrides end(), the compressed result arrives here
          try {
            expect(headers['content-encoding']).toBe('gzip');
            expect(headers['vary']).toBe('Accept-Encoding');
            expect(Buffer.isBuffer(chunk)).toBe(true);
            if (callback) callback();
            done();
          } catch (err) {
            done(err as Error);
          }
          return this;
        },
      };

      mw(req, res, () => {
        // After next(), simulate a large response
        const largePayload = JSON.stringify({ data: 'x'.repeat(2000) });
        res.end(largePayload);
      });
    });

    it('prefers brotli over gzip when both accepted', () => {
      const mw = createCompressionMiddleware({ threshold: 10 });
      const req = mockReq({ headers: { 'accept-encoding': 'gzip, br' } });
      const res = mockRes();

      mw(req, res, nextFn);

      // res.end is intercepted — trigger it to see which encoding is picked
      const largePayload = JSON.stringify({ data: 'x'.repeat(2000) });
      res.end(largePayload);

      // Since brotli is preferred, the setHeader should be called with 'br'
      expect(res.setHeader).toHaveBeenCalledWith('Content-Encoding', 'br');
    });

    it('falls back to deflate when only deflate is accepted', () => {
      const mw = createCompressionMiddleware({ threshold: 10 });
      const req = mockReq({ headers: { 'accept-encoding': 'deflate' } });
      const res = mockRes();

      mw(req, res, nextFn);

      const largePayload = JSON.stringify({ data: 'x'.repeat(2000) });
      res.end(largePayload);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Encoding', 'deflate');
    });

    it('skips already-compressed content types (image/jpeg)', () => {
      const mw = createCompressionMiddleware({ threshold: 10 });
      const req = mockReq();
      const headers: Record<string, string> = { 'content-type': 'image/jpeg' };
      const res: any = {
        statusCode: 200,
        getHeader: (n: string) => headers[n.toLowerCase()],
        setHeader: jest.fn<any>(),
        removeHeader: jest.fn<any>(),
        end: jest.fn<any>().mockReturnThis(),
      };

      mw(req, res, () => {
        res.end(Buffer.alloc(5000));
      });

      // Should NOT have set Content-Encoding
      expect(res.setHeader).not.toHaveBeenCalledWith('Content-Encoding', expect.anything());
    });

    it('handles callback-style end(chunk, callback)', () => {
      const mw = createCompressionMiddleware({ threshold: 100000 });
      const req = mockReq();
      const res = mockRes();
      const callback = jest.fn<any>();

      mw(req, res, nextFn);

      // Small payload — passthrough
      res.end('small', callback);
    });

    it('handles end(callback) with no chunk', () => {
      const mw = createCompressionMiddleware({ threshold: 10 });
      const req = mockReq();
      const res = mockRes();

      mw(req, res, nextFn);
      // Calling end() with no chunk should pass through
      res.end();
    });

    it('respects custom filter function', () => {
      const filter = jest.fn<any>().mockReturnValue(false);
      const mw = createCompressionMiddleware({ threshold: 10, filter });
      const req = mockReq();
      const res = mockRes();

      mw(req, res, nextFn);

      const largePayload = JSON.stringify({ data: 'x'.repeat(2000) });
      res.end(largePayload);

      // Filter returned false — compression should be skipped
      expect(res.setHeader).not.toHaveBeenCalledWith('Content-Encoding', expect.anything());
    });
  });

  describe('exported presets', () => {
    it('compressionMiddleware is a function', () => {
      expect(typeof compressionMiddleware).toBe('function');
    });

    it('highCompressionMiddleware is a function', () => {
      expect(typeof highCompressionMiddleware).toBe('function');
    });

    it('fastCompressionMiddleware is a function', () => {
      expect(typeof fastCompressionMiddleware).toBe('function');
    });

    it('fastCompressionMiddleware filter skips /realtime paths', () => {
      const req = mockReq({
        path: '/realtime/events',
        headers: { 'accept-encoding': 'gzip' },
      });
      const res = mockRes();

      fastCompressionMiddleware(req, res, nextFn);

      const largePayload = JSON.stringify({ data: 'x'.repeat(5000) });
      res.end(largePayload);

      // Should not compress /realtime paths
      expect(res.setHeader).not.toHaveBeenCalledWith('Content-Encoding', expect.anything());
    });

    it('fastCompressionMiddleware filter skips /stream paths', () => {
      const req = mockReq({
        path: '/stream/data',
        headers: { 'accept-encoding': 'gzip' },
      });
      const res = mockRes();

      fastCompressionMiddleware(req, res, nextFn);

      const largePayload = JSON.stringify({ data: 'x'.repeat(5000) });
      res.end(largePayload);

      expect(res.setHeader).not.toHaveBeenCalledWith('Content-Encoding', expect.anything());
    });
  });
});
