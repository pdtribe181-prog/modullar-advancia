/**
 * Monitoring Service Tests
 * Covers: initializeMonitoring, sentryErrorHandler, sentryRequestHandler,
 *         captureError, captureMessage, addBreadcrumb, setUser,
 *         startTransaction, userContextMiddleware, getMonitoringHealth, flushEvents
 */
import { jest } from '@jest/globals';

// Mock Sentry
const mockInit = jest.fn<any>();
const mockCaptureException = jest.fn<any>().mockReturnValue('event-id-123');
const mockCaptureMessage = jest.fn<any>().mockReturnValue('msg-id-123');
const mockAddBreadcrumb = jest.fn<any>();
const mockSetUser = jest.fn<any>();
const mockStartInactiveSpan = jest.fn<any>().mockReturnValue({ end: jest.fn<any>() });
const mockGetClient = jest.fn<any>();
const mockClose = jest.fn<any>().mockResolvedValue(true);

jest.unstable_mockModule('@sentry/node', () => ({
  init: mockInit,
  captureException: mockCaptureException,
  captureMessage: mockCaptureMessage,
  addBreadcrumb: mockAddBreadcrumb,
  setUser: mockSetUser,
  startInactiveSpan: mockStartInactiveSpan,
  getClient: mockGetClient,
  close: mockClose,
}));

jest.unstable_mockModule('../middleware/logging.middleware.js', () => ({
  logger: {
    info: jest.fn<any>(),
    warn: jest.fn<any>(),
    error: jest.fn<any>(),
    debug: jest.fn<any>(),
  },
}));

const {
  initializeMonitoring,
  sentryErrorHandler,
  sentryRequestHandler,
  sentryTracingHandler,
  captureError,
  captureMessage,
  addBreadcrumb,
  setUser,
  startTransaction,
  userContextMiddleware,
  getMonitoringHealth,
  flushEvents,
} = await import('../services/monitoring.service.js');

// Helper to create mock request/response/next
function mockReq(overrides: any = {}): any {
  return {
    method: 'GET',
    url: '/api/test',
    query: {},
    headers: {},
    ...overrides,
  };
}

function mockRes(): any {
  return {
    status: jest.fn<any>().mockReturnThis(),
    json: jest.fn<any>().mockReturnThis(),
  };
}

const mockNext = jest.fn<any>();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Monitoring Service', () => {
  describe('initializeMonitoring', () => {
    it('initializes Sentry when DSN is provided', () => {
      initializeMonitoring({
        dsn: 'https://abc@sentry.io/123',
        environment: 'test',
        release: '1.0.0',
      });
      expect(mockInit).toHaveBeenCalledWith(
        expect.objectContaining({ dsn: 'https://abc@sentry.io/123', environment: 'test' })
      );
    });

    it('skips initialization when DSN is undefined', () => {
      initializeMonitoring({ dsn: undefined, environment: 'test' });
      expect(mockInit).not.toHaveBeenCalled();
    });

    it('uses lower sample rate in production', () => {
      initializeMonitoring({
        dsn: 'https://abc@sentry.io/123',
        environment: 'production',
      });
      const call = mockInit.mock.calls[0][0] as any;
      expect(call.tracesSampleRate).toBe(0.1);
    });

    it('uses full sample rate in non-production', () => {
      initializeMonitoring({
        dsn: 'https://abc@sentry.io/123',
        environment: 'staging',
      });
      const call = mockInit.mock.calls[0][0] as any;
      expect(call.tracesSampleRate).toBe(1.0);
    });

    it('filters sensitive headers in beforeSend', () => {
      initializeMonitoring({
        dsn: 'https://abc@sentry.io/123',
        environment: 'test',
      });
      const { beforeSend } = mockInit.mock.calls[0][0] as any;
      const event = {
        request: {
          headers: {
            authorization: 'Bearer xxx',
            cookie: 'session=abc',
            'x-api-key': 'key123',
            'content-type': 'application/json',
          },
          data: JSON.stringify({ password: 'secret', name: 'John' }),
        },
      };
      const result = beforeSend(event);
      expect(result.request.headers.authorization).toBeUndefined();
      expect(result.request.headers.cookie).toBeUndefined();
      expect(result.request.headers['x-api-key']).toBeUndefined();
      expect(result.request.headers['content-type']).toBe('application/json');
      const parsedData = JSON.parse(result.request.data);
      expect(parsedData.password).toBe('[REDACTED]');
      expect(parsedData.name).toBe('John');
    });

    it('handles non-JSON request data gracefully in beforeSend', () => {
      initializeMonitoring({
        dsn: 'https://abc@sentry.io/123',
        environment: 'test',
      });
      const { beforeSend } = mockInit.mock.calls[0][0] as any;
      const event = {
        request: {
          headers: {},
          data: 'not-valid-json{{{',
        },
      };
      // Should not throw — the catch block ignores JSON parse errors
      const result = beforeSend(event);
      expect(result).toBeDefined();
      expect(result.request.data).toBe('not-valid-json{{{');
    });

    it('handles beforeSend with no request data', () => {
      initializeMonitoring({
        dsn: 'https://abc@sentry.io/123',
        environment: 'test',
      });
      const { beforeSend } = mockInit.mock.calls[0][0] as any;
      const event = { request: { headers: {} } };
      const result = beforeSend(event);
      expect(result).toBeDefined();
    });
  });

  describe('sentryErrorHandler', () => {
    it('reports 5xx errors', () => {
      const error = Object.assign(new Error('Server crash'), { status: 500 });
      sentryErrorHandler(error, mockReq(), mockRes(), mockNext);
      expect(mockCaptureException).toHaveBeenCalledWith(error);
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('reports errors without status', () => {
      const error = new Error('Unknown');
      sentryErrorHandler(error as any, mockReq(), mockRes(), mockNext);
      expect(mockCaptureException).toHaveBeenCalledWith(error);
    });

    it('skips 401, 403, 404, 429 errors', () => {
      for (const status of [401, 403, 404, 429]) {
        jest.clearAllMocks();
        const error = Object.assign(new Error('Expected'), { status });
        sentryErrorHandler(error, mockReq(), mockRes(), mockNext);
        expect(mockCaptureException).not.toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalledWith(error);
      }
    });

    it('reports 400 errors (non-excluded 4xx)', () => {
      const error = Object.assign(new Error('Bad request'), { status: 400 });
      sentryErrorHandler(error, mockReq(), mockRes(), mockNext);
      expect(mockCaptureException).toHaveBeenCalledWith(error);
    });
  });

  describe('sentryRequestHandler', () => {
    it('adds breadcrumb and continues', () => {
      const req = mockReq({ method: 'POST', url: '/api/payment' });
      sentryRequestHandler(req, mockRes(), mockNext);
      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'http', message: 'POST /api/payment' })
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('sentryTracingHandler', () => {
    it('calls next', () => {
      sentryTracingHandler(mockReq(), mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('captureError', () => {
    it('captures exception with context', () => {
      const error = new Error('Test error');
      const result = captureError(error, {
        user: { id: 'u1', email: 'test@test.com' },
        tags: { component: 'payment' },
        extra: { orderId: '123' },
        level: 'error',
      });
      expect(result).toBe('event-id-123');
      expect(mockCaptureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ user: { id: 'u1', email: 'test@test.com' } })
      );
    });
  });

  describe('captureMessage', () => {
    it('captures message with level and context', () => {
      const result = captureMessage('Test message', 'warning', { tags: { env: 'test' } });
      expect(result).toBe('msg-id-123');
      expect(mockCaptureMessage).toHaveBeenCalledWith(
        'Test message',
        expect.objectContaining({ level: 'warning' })
      );
    });
  });

  describe('addBreadcrumb', () => {
    it('adds breadcrumb with timestamp', () => {
      addBreadcrumb({ category: 'test', message: 'Test breadcrumb', level: 'info' });
      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'test', message: 'Test breadcrumb' })
      );
    });
  });

  describe('setUser', () => {
    it('sets user context', () => {
      setUser({ id: 'u1', email: 'test@test.com', role: 'admin' });
      expect(mockSetUser).toHaveBeenCalledWith({ id: 'u1', email: 'test@test.com', role: 'admin' });
    });

    it('clears user context', () => {
      setUser(null);
      expect(mockSetUser).toHaveBeenCalledWith(null);
    });
  });

  describe('startTransaction', () => {
    it('creates inactive span', () => {
      startTransaction('payment-flow', 'http.request');
      expect(mockStartInactiveSpan).toHaveBeenCalledWith({
        name: 'payment-flow',
        op: 'http.request',
      });
    });
  });

  describe('userContextMiddleware', () => {
    it('sets user from request when authenticated', () => {
      const req = mockReq({ user: { id: 'u1', email: 'test@test.com', role: 'admin' } });
      userContextMiddleware(req, mockRes(), mockNext);
      expect(mockSetUser).toHaveBeenCalledWith({ id: 'u1', email: 'test@test.com', role: 'admin' });
      expect(mockNext).toHaveBeenCalled();
    });

    it('skips when no user on request', () => {
      userContextMiddleware(mockReq(), mockRes(), mockNext);
      expect(mockSetUser).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('getMonitoringHealth', () => {
    it('reports enabled when client exists', () => {
      mockGetClient.mockReturnValue({ getDsn: () => 'https://abc@sentry.io/123' });
      const health = getMonitoringHealth();
      expect(health.enabled).toBe(true);
      expect(health.dsn).toBe(true);
    });

    it('reports disabled when no client', () => {
      mockGetClient.mockReturnValue(null);
      const health = getMonitoringHealth();
      expect(health.enabled).toBe(false);
      expect(health.dsn).toBe(false);
    });
  });

  describe('flushEvents', () => {
    it('flushes with default timeout', async () => {
      const result = await flushEvents();
      expect(result).toBe(true);
      expect(mockClose).toHaveBeenCalledWith(2000);
    });

    it('flushes with custom timeout', async () => {
      await flushEvents(5000);
      expect(mockClose).toHaveBeenCalledWith(5000);
    });
  });
});
