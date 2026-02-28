/**
 * Circuit Breaker Tests
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock the logger before importing the module under test
const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
jest.unstable_mockModule('../middleware/logging.middleware.js', () => ({
  logger: mockLogger,
}));

const {
  CircuitBreaker,
  CircuitBreakerError,
  stripeBreaker,
  resendBreaker,
  twilioBreaker,
  getAllCircuitBreakerStats,
} = await import('../utils/circuit-breaker.js');

describe('CircuitBreaker', () => {
  let breaker: InstanceType<typeof CircuitBreaker>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    breaker = new CircuitBreaker('test-service', {
      failureThreshold: 3,
      resetTimeoutMs: 100, // 100ms for fast tests
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts in CLOSED state', () => {
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('passes through successful calls', async () => {
    const result = await breaker.execute(() => Promise.resolve('ok'));
    expect(result).toBe('ok');
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('re-throws errors while counting failures', async () => {
    const err = new Error('fail');
    await expect(breaker.execute(() => Promise.reject(err))).rejects.toThrow('fail');
    expect(breaker.getState()).toBe('CLOSED');
    expect(breaker.getStats().failureCount).toBe(1);
  });

  it('opens after reaching failure threshold', async () => {
    const err = new Error('fail');
    for (let i = 0; i < 3; i++) {
      await breaker.execute(() => Promise.reject(err)).catch(() => {});
    }
    expect(breaker.getState()).toBe('OPEN');
    // Logger should have been called for the state transition
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('CLOSED → OPEN'),
      expect.any(Object)
    );
  });

  it('fast-fails with CircuitBreakerError when OPEN', async () => {
    // Force open
    for (let i = 0; i < 3; i++) {
      await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    }

    await expect(breaker.execute(() => Promise.resolve('nope'))).rejects.toThrow(
      CircuitBreakerError
    );
  });

  it('transitions to HALF_OPEN after reset timeout', async () => {
    // Force open
    for (let i = 0; i < 3; i++) {
      await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    }
    expect(breaker.getState()).toBe('OPEN');

    // Advance past reset timeout using fake timers
    jest.advanceTimersByTime(150);

    // Next call should be attempted (HALF_OPEN probe)
    const result = await breaker.execute(() => Promise.resolve('recovered'));
    expect(result).toBe('recovered');
    expect(breaker.getState()).toBe('CLOSED');
    // Logger should record both OPEN and then back to CLOSED transitions
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('HALF_OPEN → CLOSED'),
      expect.any(Object)
    );
  });

  it('returns to OPEN if HALF_OPEN probe fails', async () => {
    for (let i = 0; i < 3; i++) {
      await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    }

    jest.advanceTimersByTime(150);

    await breaker.execute(() => Promise.reject(new Error('still broken'))).catch(() => {});
    expect(breaker.getState()).toBe('OPEN');
  });

  it('resets manually', async () => {
    for (let i = 0; i < 3; i++) {
      await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    }
    expect(breaker.getState()).toBe('OPEN');

    breaker.reset();
    expect(breaker.getState()).toBe('CLOSED');
    expect(breaker.getStats().failureCount).toBe(0);
  });

  it('respects isFailure predicate', async () => {
    const selective = new CircuitBreaker('selective', {
      failureThreshold: 2,
      resetTimeoutMs: 100,
      isFailure: (err) => (err as any).statusCode >= 500,
    });

    // 404 should NOT trip the breaker
    for (let i = 0; i < 5; i++) {
      await selective
        .execute(() => Promise.reject({ statusCode: 404, message: 'not found' }))
        .catch(() => {});
    }
    expect(selective.getState()).toBe('CLOSED');

    // 500 should trip
    for (let i = 0; i < 2; i++) {
      await selective
        .execute(() => Promise.reject({ statusCode: 500, message: 'server error' }))
        .catch(() => {});
    }
    expect(selective.getState()).toBe('OPEN');
  });

  it('getStats returns diagnostic info', () => {
    const stats = breaker.getStats();
    expect(stats.service).toBe('test-service');
    expect(stats.state).toBe('CLOSED');
    expect(stats.failureCount).toBe(0);
    expect(stats.lastFailure).toBeNull();
  });
});

describe('Pre-configured Breakers & Helpers', () => {
  afterEach(() => {
    stripeBreaker.reset();
    resendBreaker.reset();
    twilioBreaker.reset();
  });

  it('stripeBreaker ignores client errors (400) for failure count', async () => {
    for (let i = 0; i < 10; i++) {
      await stripeBreaker
        .execute(() => Promise.reject({ statusCode: 400, message: 'bad request' }))
        .catch(() => {});
    }
    expect(stripeBreaker.getState()).toBe('CLOSED');
  });

  it('stripeBreaker trips on 429 rate-limit errors', async () => {
    for (let i = 0; i < 5; i++) {
      await stripeBreaker
        .execute(() => Promise.reject({ statusCode: 429, message: 'rate limited' }))
        .catch(() => {});
    }
    expect(stripeBreaker.getState()).toBe('OPEN');
  });

  it('stripeBreaker trips on 5xx server errors', async () => {
    for (let i = 0; i < 5; i++) {
      await stripeBreaker
        .execute(() => Promise.reject({ statusCode: 502, message: 'bad gateway' }))
        .catch(() => {});
    }
    expect(stripeBreaker.getState()).toBe('OPEN');
  });

  it('stripeBreaker trips on plain errors without statusCode', async () => {
    for (let i = 0; i < 5; i++) {
      await stripeBreaker
        .execute(() => Promise.reject(new Error('network timeout')))
        .catch(() => {});
    }
    expect(stripeBreaker.getState()).toBe('OPEN');
  });

  it('getAllCircuitBreakerStats returns stats for all breakers', () => {
    const stats = getAllCircuitBreakerStats();
    expect(stats).toHaveLength(3);
    expect(stats[0].service).toBe('stripe');
    expect(stats[1].service).toBe('resend');
    expect(stats[2].service).toBe('twilio');
    expect(stats.every((s: any) => s.state === 'CLOSED')).toBe(true);
  });
});
