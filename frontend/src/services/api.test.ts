import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError } from './api';

// We test ApiError class directly and api service methods via fetch mocking

describe('ApiError', () => {
  it('creates error with message and status', () => {
    const err = new ApiError('Not Found', 404);
    expect(err.message).toBe('Not Found');
    expect(err.status).toBe(404);
    expect(err.name).toBe('ApiError');
  });

  it('sets optional code and details', () => {
    const err = new ApiError('Bad', 400, 'VALIDATION', { field: 'email' });
    expect(err.code).toBe('VALIDATION');
    expect(err.details).toEqual({ field: 'email' });
  });

  describe('status helpers', () => {
    it('isNetworkError for status 0', () => {
      expect(new ApiError('', 0).isNetworkError).toBe(true);
      expect(new ApiError('', 500).isNetworkError).toBe(false);
    });

    it('isUnauthorized for 401', () => {
      expect(new ApiError('', 401).isUnauthorized).toBe(true);
      expect(new ApiError('', 403).isUnauthorized).toBe(false);
    });

    it('isForbidden for 403', () => {
      expect(new ApiError('', 403).isForbidden).toBe(true);
    });

    it('isNotFound for 404', () => {
      expect(new ApiError('', 404).isNotFound).toBe(true);
    });

    it('isValidationError for 400', () => {
      expect(new ApiError('', 400).isValidationError).toBe(true);
    });

    it('isRateLimited for 429', () => {
      expect(new ApiError('', 429).isRateLimited).toBe(true);
    });

    it('isServerError for 5xx', () => {
      expect(new ApiError('', 500).isServerError).toBe(true);
      expect(new ApiError('', 503).isServerError).toBe(true);
      expect(new ApiError('', 400).isServerError).toBe(false);
    });

    it('isRetryable for network/server/rate-limit errors', () => {
      expect(new ApiError('', 0).isRetryable).toBe(true);
      expect(new ApiError('', 500).isRetryable).toBe(true);
      expect(new ApiError('', 429).isRetryable).toBe(true);
      expect(new ApiError('', 400).isRetryable).toBe(false);
      expect(new ApiError('', 404).isRetryable).toBe(false);
    });
  });
});

describe('api service', () => {
  let api: typeof import('./api').api;
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    // Fresh import each test to reset the singleton
    vi.resetModules();
    // Mock sentry
    vi.mock('../lib/sentry', () => ({ captureError: vi.fn() }));
    const mod = await import('./api');
    api = mod.api;
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockFetch(body: unknown, status = 200, headers: Record<string, string> = {}) {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      headers: {
        get: (key: string) => {
          if (key === 'content-type') return 'application/json';
          return headers[key] ?? null;
        },
      },
      json: async () => body,
      text: async () => JSON.stringify(body),
    });
  }

  it('makes GET request with auth header', async () => {
    api.setToken('test-token');
    mockFetch({ data: [1, 2, 3] });

    const result = await api.get('/items');
    expect(result).toEqual({ data: [1, 2, 3] });

    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/items');
    expect(opts.headers.Authorization).toBe('Bearer test-token');
  });

  it('makes POST with JSON body', async () => {
    mockFetch({ id: 1 }, 200);

    await api.post('/items', { name: 'test' });

    const [, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(opts.method).toBe('POST');
    expect(opts.body).toBe(JSON.stringify({ name: 'test' }));
  });

  it('makes PUT with JSON body', async () => {
    mockFetch({ updated: true });

    await api.put('/items/1', { name: 'updated' });

    const [, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(opts.method).toBe('PUT');
  });

  it('makes PATCH with JSON body', async () => {
    mockFetch({ patched: true });

    await api.patch('/items/1', { status: 'done' });

    const [, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(opts.method).toBe('PATCH');
  });

  it('makes DELETE request', async () => {
    mockFetch({ deleted: true });

    await api.delete('/items/1');

    const [, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(opts.method).toBe('DELETE');
  });

  it('throws ApiError on non-ok response', async () => {
    mockFetch({ message: 'Not found' }, 404);

    await expect(api.get('/missing', { retry: false })).rejects.toThrow('Not found');
  });

  it('throws ApiError with correct status', async () => {
    mockFetch({ message: 'Forbidden' }, 403);

    try {
      await api.get('/secret', { retry: false });
      expect.fail('should have thrown');
    } catch (err: unknown) {
      expect((err as Record<string, unknown>).name).toBe('ApiError');
      expect((err as Record<string, unknown>).status).toBe(403);
    }
  });

  it('sends request without auth header when no token', async () => {
    api.setToken(null);
    mockFetch({ ok: true });

    await api.get('/public');

    const [, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(opts.headers.Authorization).toBeUndefined();
  });
});
