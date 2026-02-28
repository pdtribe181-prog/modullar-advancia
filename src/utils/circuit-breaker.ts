/**
 * Circuit Breaker for External Service Calls
 *
 * Prevents cascading failures when Stripe, Resend, or Twilio are down.
 * Instead of hammering a degraded service, the breaker "opens" after
 * consecutive failures and returns a fast error for a cooldown period,
 * then allows a single "half-open" probe to test recovery.
 *
 * States:
 *   CLOSED   → Normal operation; failures increment counter
 *   OPEN     → Fast-fail; no requests sent (cooldown timer active)
 *   HALF_OPEN→ Single probe request allowed; success → CLOSED, failure → OPEN
 *
 * Usage:
 *   import { CircuitBreaker } from '../utils/circuit-breaker.js';
 *
 *   const stripeCB = new CircuitBreaker('stripe', { failureThreshold: 5, resetTimeoutMs: 30_000 });
 *   const result = await stripeCB.execute(() => stripe.paymentIntents.create({...}));
 */

import { logger } from '../middleware/logging.middleware.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening the circuit (default: 5) */
  failureThreshold?: number;
  /** How long the circuit stays open before allowing a probe (ms, default: 30 000) */
  resetTimeoutMs?: number;
  /** Predicate to decide if an error counts as a circuit-breaking failure.
   *  By default, all errors count. Return false for expected errors (e.g. 404). */
  isFailure?: (error: unknown) => boolean;
  /** Optional callback fired when state transitions */
  onStateChange?: (from: CircuitState, to: CircuitState, service: string) => void;
}

export class CircuitBreakerError extends Error {
  constructor(service: string) {
    super(`Circuit breaker OPEN for service "${service}" — request blocked`);
    this.name = 'CircuitBreakerError';
  }
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export class CircuitBreaker {
  readonly service: string;
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly isFailure: (error: unknown) => boolean;
  private readonly onStateChange?: (from: CircuitState, to: CircuitState, svc: string) => void;

  constructor(service: string, opts: CircuitBreakerOptions = {}) {
    this.service = service;
    this.failureThreshold = opts.failureThreshold ?? 5;
    this.resetTimeoutMs = opts.resetTimeoutMs ?? 30_000;
    this.isFailure = opts.isFailure ?? (() => true);
    this.onStateChange = opts.onStateChange;
  }

  // ── Public API ──

  /** Execute `fn` through the circuit breaker. */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.transition('HALF_OPEN');
      } else {
        throw new CircuitBreakerError(this.service);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      if (this.isFailure(error)) {
        this.onFailure();
      }
      throw error; // always re-throw so the caller sees the original error
    }
  }

  /** Current state (useful for health checks / metrics) */
  getState(): CircuitState {
    return this.state;
  }

  /** Reset the breaker manually (e.g. after a deploy) */
  reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.transition('CLOSED');
  }

  /** Snapshot for diagnostics / health endpoint */
  getStats() {
    return {
      service: this.service,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailure: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
    };
  }

  // ── Internal ──

  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.resetTimeoutMs;
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.transition('CLOSED');
    }
    this.failureCount = 0;
    this.successCount++;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.transition('OPEN');
    } else if (this.failureCount >= this.failureThreshold) {
      this.transition('OPEN');
    }
  }

  private transition(newState: CircuitState): void {
    if (this.state === newState) return;
    const prev = this.state;
    this.state = newState;
    logger.warn(`Circuit breaker [${this.service}]: ${prev} → ${newState}`, {
      failureCount: this.failureCount,
      service: this.service,
    });
    this.onStateChange?.(prev, newState, this.service);
  }
}

// ---------------------------------------------------------------------------
// Pre-configured breakers for the platform's external services
// ---------------------------------------------------------------------------

/** Stripe API — payment-critical, moderate timeout */
export const stripeBreaker = new CircuitBreaker('stripe', {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  isFailure: (err: unknown) => {
    // Stripe rate-limit (429) or server errors (5xx) trip the breaker
    // Client errors (400, 402, 404) do NOT trip the breaker
    if (err && typeof err === 'object' && 'statusCode' in err) {
      const code = (err as any).statusCode;
      return code === 429 || code >= 500;
    }
    return true; // network/timeout errors always trip
  },
});

/** Resend email API */
export const resendBreaker = new CircuitBreaker('resend', {
  failureThreshold: 3,
  resetTimeoutMs: 60_000,
});

/** Twilio SMS API */
export const twilioBreaker = new CircuitBreaker('twilio', {
  failureThreshold: 3,
  resetTimeoutMs: 60_000,
});

/**
 * Return stats for all breakers (e.g. for a /health or /admin/status endpoint)
 */
export function getAllCircuitBreakerStats() {
  return [stripeBreaker.getStats(), resendBreaker.getStats(), twilioBreaker.getStats()];
}
