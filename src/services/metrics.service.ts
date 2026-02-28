/**
 * Application Metrics Collection Service
 *
 * In-memory metrics with periodic Supabase persistence.
 * Tracks: transaction volume, payment success rate, API response times,
 * active users, error rates, and per-endpoint latency histograms.
 *
 * Designed for the health-check dashboard and Prometheus-compatible /metrics export.
 */

import { createServiceClient } from '../lib/supabase.js';
import { logger } from '../middleware/logging.middleware.js';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface LatencyBucket {
  count: number;
  sum: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface EndpointMetric {
  method: string;
  path: string;
  statusBuckets: Record<string, number>; // e.g. "2xx": 42
  latency: LatencyBucket;
}

export interface MetricsSnapshot {
  collectedAt: string;
  uptimeSeconds: number;

  // Transaction / payment metrics
  transactions: {
    total: number;
    successful: number;
    failed: number;
    successRate: number; // 0-100
  };

  // API-level metrics
  api: {
    totalRequests: number;
    totalErrors: number; // 5xx
    errorRate: number; // 0-100
    avgResponseMs: number;
  };

  // Active users (unique user IDs seen in the last window)
  activeUsers: {
    last5min: number;
    last1hr: number;
  };

  // Per-endpoint breakdown (top 20 by request count)
  endpoints: EndpointMetric[];
}

/* ------------------------------------------------------------------ */
/*  Internal counters                                                 */
/* ------------------------------------------------------------------ */

const startTime = Date.now();

// Transaction counters
let txTotal = 0;
let txSuccess = 0;
let txFailed = 0;

// API counters
let reqTotal = 0;
let errTotal = 0; // 5xx only
let latencySum = 0;

// Per-endpoint map:  "GET /api/v1/auth/me" → { count, statusCodes, latencies }
interface RawEndpoint {
  count: number;
  statusCodes: Record<number, number>;
  latencies: number[];
}
const endpointMap = new Map<string, RawEndpoint>();

// Active-user sliding windows (Set<userId>)
interface UserWindow {
  users: Set<string>;
  resetAt: number;
}
let window5min: UserWindow = { users: new Set(), resetAt: Date.now() + 5 * 60_000 };
let window1hr: UserWindow = { users: new Set(), resetAt: Date.now() + 60 * 60_000 };

// Keep previous window counts so resetting doesn't briefly show 0
let prev5min = 0;
let prev1hr = 0;

/* ------------------------------------------------------------------ */
/*  Public recording API                                              */
/* ------------------------------------------------------------------ */

/** Record an API request (called from metrics middleware). */
export function recordRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  userId?: string
): void {
  reqTotal++;
  latencySum += durationMs;

  if (statusCode >= 500) errTotal++;

  // Endpoint-level
  const key = `${method} ${normalisePath(path)}`;
  let ep = endpointMap.get(key);
  if (!ep) {
    ep = { count: 0, statusCodes: {}, latencies: [] };
    endpointMap.set(key, ep);
  }
  ep.count++;
  ep.statusCodes[statusCode] = (ep.statusCodes[statusCode] || 0) + 1;
  // Keep last 1000 latencies per endpoint for percentile calc
  if (ep.latencies.length >= 1000) ep.latencies.shift();
  ep.latencies.push(durationMs);

  // Active users
  if (userId) {
    trackActiveUser(userId);
  }
}

/** Record a payment transaction outcome. */
export function recordTransaction(success: boolean): void {
  txTotal++;
  if (success) txSuccess++;
  else txFailed++;
}

/** Track an active user (call from auth or request middleware). */
export function trackActiveUser(userId: string): void {
  rotateWindows();
  window5min.users.add(userId);
  window1hr.users.add(userId);
}

/* ------------------------------------------------------------------ */
/*  Snapshot / read                                                   */
/* ------------------------------------------------------------------ */

/** Get current metrics snapshot. */
export function getMetricsSnapshot(): MetricsSnapshot {
  rotateWindows();

  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const successRate = txTotal > 0 ? +((txSuccess / txTotal) * 100).toFixed(2) : 100;
  const errorRate = reqTotal > 0 ? +((errTotal / reqTotal) * 100).toFixed(2) : 0;
  const avgResponseMs = reqTotal > 0 ? +(latencySum / reqTotal).toFixed(2) : 0;

  // Build endpoint breakdown (top 20 by count)
  const endpoints: EndpointMetric[] = [...endpointMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([key, raw]) => {
      const [method, ...rest] = key.split(' ');
      const path = rest.join(' ');
      const statusBuckets: Record<string, number> = {};
      for (const [code, cnt] of Object.entries(raw.statusCodes)) {
        const bucket = `${Math.floor(Number(code) / 100)}xx`;
        statusBuckets[bucket] = (statusBuckets[bucket] || 0) + cnt;
      }
      return {
        method,
        path,
        statusBuckets,
        latency: computeLatency(raw.latencies),
      };
    });

  return {
    collectedAt: new Date().toISOString(),
    uptimeSeconds,
    transactions: { total: txTotal, successful: txSuccess, failed: txFailed, successRate },
    api: { totalRequests: reqTotal, totalErrors: errTotal, errorRate, avgResponseMs },
    activeUsers: {
      last5min: window5min.users.size || prev5min,
      last1hr: window1hr.users.size || prev1hr,
    },
    endpoints,
  };
}

/** Prometheus-style text output. */
export function getPrometheusMetrics(): string {
  const s = getMetricsSnapshot();
  const lines: string[] = [];

  const g = (name: string, help: string, value: number) => {
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} gauge`);
    lines.push(`${name} ${value}`);
  };

  g('app_uptime_seconds', 'Application uptime in seconds', s.uptimeSeconds);
  g('app_transactions_total', 'Total payment transactions', s.transactions.total);
  g('app_transactions_successful', 'Successful payment transactions', s.transactions.successful);
  g('app_transactions_failed', 'Failed payment transactions', s.transactions.failed);
  g('app_transactions_success_rate', 'Payment success rate percent', s.transactions.successRate);
  g('app_requests_total', 'Total API requests', s.api.totalRequests);
  g('app_errors_total', 'Total 5xx errors', s.api.totalErrors);
  g('app_error_rate', 'API error rate percent', s.api.errorRate);
  g('app_response_time_avg_ms', 'Average API response time ms', s.api.avgResponseMs);
  g('app_active_users_5min', 'Active users in last 5 minutes', s.activeUsers.last5min);
  g('app_active_users_1hr', 'Active users in last hour', s.activeUsers.last1hr);

  return lines.join('\n') + '\n';
}

/** Reset all counters (useful for testing). */
export function resetMetrics(): void {
  txTotal = 0;
  txSuccess = 0;
  txFailed = 0;
  reqTotal = 0;
  errTotal = 0;
  latencySum = 0;
  endpointMap.clear();
  window5min = { users: new Set(), resetAt: Date.now() + 5 * 60_000 };
  window1hr = { users: new Set(), resetAt: Date.now() + 60 * 60_000 };
  prev5min = 0;
  prev1hr = 0;
}

/* ------------------------------------------------------------------ */
/*  Persistence (optional — write to system_performance_metrics)      */
/* ------------------------------------------------------------------ */

/** Persist current snapshot to the database for historical tracking. */
export async function persistMetrics(): Promise<void> {
  try {
    const snapshot = getMetricsSnapshot();
    const admin = createServiceClient();
    await admin.from('system_performance_metrics').insert({
      metric_name: 'app_snapshot',
      metric_value: snapshot.api.totalRequests,
      metadata: snapshot as unknown as Record<string, unknown>,
    });
    logger.info('Metrics persisted to database');
  } catch (err) {
    logger.error('Failed to persist metrics', err instanceof Error ? err : undefined);
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Normalise URL paths:  /api/v1/patients/abc-123 → /api/v1/patients/:id */
function normalisePath(raw: string): string {
  return raw
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:id')
    .replace(/\?.*$/, '');
}

function computeLatency(latencies: number[]): LatencyBucket {
  if (latencies.length === 0) {
    return { count: 0, sum: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
  }
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    count: sorted.length,
    sum: +sum.toFixed(2),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
  };
}

function percentile(sorted: number[], pct: number): number {
  const idx = Math.ceil((pct / 100) * sorted.length) - 1;
  return +sorted[Math.max(0, idx)].toFixed(2);
}

function rotateWindows(): void {
  const now = Date.now();
  if (now >= window5min.resetAt) {
    prev5min = window5min.users.size;
    window5min = { users: new Set(), resetAt: now + 5 * 60_000 };
  }
  if (now >= window1hr.resetAt) {
    prev1hr = window1hr.users.size;
    window1hr = { users: new Set(), resetAt: now + 60 * 60_000 };
  }
}
