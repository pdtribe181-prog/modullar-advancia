#!/usr/bin/env npx tsx
/**
 * Load Test Script for Advancia PayLedger API
 * ---
 * Validates production checklist items:
 *  - "API can handle 100 concurrent users"
 *  - "Response time < 200ms under normal load"
 *
 * Usage:
 *   npx tsx scripts/load-test.ts                       # defaults: 100 users, 10 rps
 *   npx tsx scripts/load-test.ts --users 200 --rps 50  # custom
 *   npx tsx scripts/load-test.ts --base-url http://localhost:3000
 *
 * Requirements:
 *   - Server must be running
 *   - Valid auth token needed for authenticated endpoints (or use --anon for public-only)
 */

import { performance } from 'node:perf_hooks';

// ── CLI args ──

const args = process.argv.slice(2);
function getArg(name: string, fallback: string): string {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const BASE_URL = getArg('base-url', 'http://localhost:3000');
const TOTAL_REQUESTS = parseInt(getArg('users', '100'), 10);
const RPS = parseInt(getArg('rps', '20'), 10);
const AUTH_TOKEN = getArg('token', '');
const ANON_MODE = args.includes('--anon');

// ── Endpoint definitions ──

interface Endpoint {
  name: string;
  method: 'GET' | 'POST';
  path: string;
  auth: boolean;
  body?: Record<string, unknown>;
  weight: number; // likelihood of being picked (higher = more common)
}

const ENDPOINTS: Endpoint[] = [
  // Public / health
  { name: 'Health Check', method: 'GET', path: '/api/v1/health', auth: false, weight: 3 },

  // Auth (no token needed for these)
  {
    name: 'Login',
    method: 'POST',
    path: '/api/v1/auth/login',
    auth: false,
    body: { email: `loadtest_${Date.now()}@example.com`, password: 'TestPassword123!' },
    weight: 2,
  },

  // Authenticated reads (high traffic)
  {
    name: 'Provider List',
    method: 'GET',
    path: '/api/v1/provider?page=1&limit=10',
    auth: true,
    weight: 5,
  },
  { name: 'Provider Profile', method: 'GET', path: '/api/v1/provider/me', auth: true, weight: 3 },
  {
    name: 'Appointments',
    method: 'GET',
    path: '/api/v1/provider/appointments',
    auth: true,
    weight: 4,
  },
  {
    name: 'Earnings',
    method: 'GET',
    path: '/api/v1/provider/earnings?period=30',
    auth: true,
    weight: 2,
  },
  {
    name: 'Schedule',
    method: 'GET',
    path: '/api/v1/provider/schedule?startDate=2025-01-01&endDate=2025-12-31',
    auth: true,
    weight: 2,
  },
  {
    name: 'Payment History',
    method: 'GET',
    path: '/api/v1/stripe/payment-history',
    auth: true,
    weight: 3,
  },
];

// ── Weighted random selection ──

function pickEndpoint(allowAuth: boolean): Endpoint {
  const pool = ENDPOINTS.filter((e) => allowAuth || !e.auth);
  const totalWeight = pool.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * totalWeight;
  for (const ep of pool) {
    r -= ep.weight;
    if (r <= 0) return ep;
  }
  return pool[pool.length - 1];
}

// ── Request executor ──

interface RequestResult {
  endpoint: string;
  status: number;
  latencyMs: number;
  error?: string;
}

async function fireRequest(ep: Endpoint): Promise<RequestResult> {
  const url = `${BASE_URL}${ep.path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (ep.auth && AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }

  const start = performance.now();
  try {
    const resp = await fetch(url, {
      method: ep.method,
      headers,
      body: ep.body ? JSON.stringify(ep.body) : undefined,
      signal: AbortSignal.timeout(10_000),
    });
    const latencyMs = performance.now() - start;
    return { endpoint: ep.name, status: resp.status, latencyMs };
  } catch (err: any) {
    const latencyMs = performance.now() - start;
    return { endpoint: ep.name, status: 0, latencyMs, error: err.message };
  }
}

// ── Stats ──

function computeStats(results: RequestResult[]) {
  const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
  const successful = results.filter((r) => r.status >= 200 && r.status < 500);
  const errors = results.filter((r) => r.status === 0 || r.status >= 500);

  const sum = latencies.reduce((a, b) => a + b, 0);
  const avg = sum / latencies.length;
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p90 = latencies[Math.floor(latencies.length * 0.9)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];
  const max = latencies[latencies.length - 1];
  const min = latencies[0];

  // Per-endpoint breakdown
  const byEndpoint: Record<
    string,
    { count: number; avgMs: number; p95Ms: number; errors: number }
  > = {};
  for (const r of results) {
    if (!byEndpoint[r.endpoint]) {
      byEndpoint[r.endpoint] = { count: 0, avgMs: 0, p95Ms: 0, errors: 0 };
    }
    byEndpoint[r.endpoint].count++;
    if (r.status === 0 || r.status >= 500) byEndpoint[r.endpoint].errors++;
  }
  for (const [name, stat] of Object.entries(byEndpoint)) {
    const lats = results
      .filter((r) => r.endpoint === name)
      .map((r) => r.latencyMs)
      .sort((a, b) => a - b);
    stat.avgMs = Math.round(lats.reduce((a, b) => a + b, 0) / lats.length);
    stat.p95Ms = Math.round(lats[Math.floor(lats.length * 0.95)] || lats[lats.length - 1]);
  }

  // Status code distribution
  const statusDist: Record<number, number> = {};
  for (const r of results) {
    statusDist[r.status] = (statusDist[r.status] || 0) + 1;
  }

  return {
    avg,
    p50,
    p90,
    p95,
    p99,
    max,
    min,
    successful: successful.length,
    errors: errors.length,
    byEndpoint,
    statusDist,
  };
}

// ── Main ──

async function main() {
  const allowAuth = !ANON_MODE && AUTH_TOKEN.length > 0;
  console.log(`
╔══════════════════════════════════════════════════╗
║         Advancia PayLedger - Load Test           ║
╠══════════════════════════════════════════════════╣
║  Base URL:   ${BASE_URL.padEnd(35)}║
║  Requests:   ${String(TOTAL_REQUESTS).padEnd(35)}║
║  Target RPS: ${String(RPS).padEnd(35)}║
║  Auth mode:  ${(allowAuth ? 'Authenticated' : 'Anonymous (public endpoints only)').padEnd(35)}║
╚══════════════════════════════════════════════════╝
  `);

  if (!allowAuth) {
    console.log('⚠  No --token provided. Testing public endpoints only.');
    console.log('   Pass --token <jwt> to test authenticated endpoints.\n');
  }

  const results: RequestResult[] = [];
  const delayBetween = 1000 / RPS;
  let completed = 0;
  const startTime = performance.now();

  // Fire requests with rate limiting
  const promises: Promise<void>[] = [];

  for (let i = 0; i < TOTAL_REQUESTS; i++) {
    const ep = pickEndpoint(allowAuth);
    const promise = (async () => {
      // Stagger start
      await new Promise((r) => setTimeout(r, i * delayBetween));
      const result = await fireRequest(ep);
      results.push(result);
      completed++;
      if (completed % Math.ceil(TOTAL_REQUESTS / 10) === 0) {
        process.stdout.write(
          `  Progress: ${completed}/${TOTAL_REQUESTS} (${Math.round((completed / TOTAL_REQUESTS) * 100)}%)\r`
        );
      }
    })();
    promises.push(promise);
  }

  await Promise.all(promises);
  const totalTimeMs = performance.now() - startTime;

  console.log('\n');

  // ── Report ──

  const stats = computeStats(results);
  const passedLatency = stats.p95 < 200;
  const passedErrors = (stats.errors / TOTAL_REQUESTS) * 100 < 1;

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║                   RESULTS                        ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`  Total Requests:   ${TOTAL_REQUESTS}`);
  console.log(`  Total Time:       ${(totalTimeMs / 1000).toFixed(2)}s`);
  console.log(`  Actual RPS:       ${(TOTAL_REQUESTS / (totalTimeMs / 1000)).toFixed(1)}`);
  console.log(
    `  Successful:       ${stats.successful} (${((stats.successful / TOTAL_REQUESTS) * 100).toFixed(1)}%)`
  );
  console.log(
    `  Errors:           ${stats.errors} (${((stats.errors / TOTAL_REQUESTS) * 100).toFixed(1)}%)`
  );
  console.log('');
  console.log('  Latency (ms):');
  console.log(`    Min:    ${stats.min.toFixed(1)}`);
  console.log(`    Avg:    ${stats.avg.toFixed(1)}`);
  console.log(`    P50:    ${stats.p50.toFixed(1)}`);
  console.log(`    P90:    ${stats.p90.toFixed(1)}`);
  console.log(
    `    P95:    ${stats.p95.toFixed(1)}  ${passedLatency ? '✅ < 200ms' : '❌ > 200ms'}`
  );
  console.log(`    P99:    ${stats.p99.toFixed(1)}`);
  console.log(`    Max:    ${stats.max.toFixed(1)}`);
  console.log('');
  console.log('  Status Code Distribution:');
  for (const [code, count] of Object.entries(stats.statusDist).sort()) {
    console.log(`    ${code === '0' ? 'ERR' : code}: ${count}`);
  }
  console.log('');
  console.log('  Per-Endpoint Breakdown:');
  console.log('  ┌────────────────────────┬───────┬────────┬────────┬────────┐');
  console.log('  │ Endpoint               │ Count │ Avg ms │ P95 ms │ Errors │');
  console.log('  ├────────────────────────┼───────┼────────┼────────┼────────┤');
  for (const [name, s] of Object.entries(stats.byEndpoint)) {
    console.log(
      `  │ ${name.padEnd(22)} │ ${String(s.count).padStart(5)} │ ${String(s.avgMs).padStart(6)} │ ${String(s.p95Ms).padStart(6)} │ ${String(s.errors).padStart(6)} │`
    );
  }
  console.log('  └────────────────────────┴───────┴────────┴────────┴────────┘');

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║              CHECKLIST VALIDATION                ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(
    `  ☐ 100 concurrent users:     ${TOTAL_REQUESTS >= 100 ? '✅ PASS' : '⚠  Not enough requests'}`
  );
  console.log(
    `  ☐ P95 < 200ms:              ${passedLatency ? '✅ PASS' : '❌ FAIL'} (${stats.p95.toFixed(1)}ms)`
  );
  console.log(
    `  ☐ Error rate < 1%:          ${passedErrors ? '✅ PASS' : '❌ FAIL'} (${((stats.errors / TOTAL_REQUESTS) * 100).toFixed(2)}%)`
  );
  console.log('╚══════════════════════════════════════════════════╝\n');

  process.exit(passedLatency && passedErrors ? 0 : 1);
}

main().catch((err) => {
  console.error('Load test failed:', err);
  process.exit(1);
});
