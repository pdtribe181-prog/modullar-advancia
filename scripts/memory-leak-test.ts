#!/usr/bin/env npx tsx
/**
 * Memory Leak Detector — sustained load with memory trend analysis
 * ---
 * Sends sustained traffic to the API while polling /health?verbose=true
 * for memory snapshots. Performs linear regression on heap usage to detect
 * monotonic growth that indicates a memory leak.
 *
 * Usage:
 *   npx tsx scripts/memory-leak-test.ts                         # 10-minute quick test
 *   npx tsx scripts/memory-leak-test.ts --duration 3600         # 1-hour soak test
 *   npx tsx scripts/memory-leak-test.ts --base-url http://localhost:3000
 *   npx tsx scripts/memory-leak-test.ts --rps 20 --duration 600
 *   npx tsx scripts/memory-leak-test.ts --csv results.csv       # Export snapshots to CSV
 *   npx tsx scripts/memory-leak-test.ts --warmup 60             # Skip first 60s from analysis
 *   npx tsx scripts/memory-leak-test.ts --help
 *
 * Exit codes:
 *   0 — No leak detected (growth < 1MB/min or R² < 0.7)
 *   1 — Potential leak detected (significant upward trend)
 *   2 — Could not complete test (connection errors)
 *
 * Output:
 *   - Real-time memory snapshots every 10 seconds
 *   - Linear regression on heapUsed over time
 *   - Response latency percentiles (P50 / P95)
 *   - Final verdict with growth rate (MB/min)
 */

import 'dotenv/config';
import { writeFileSync } from 'node:fs';

// ── CLI Args ──

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Memory Leak Detector — sustained load with memory trend analysis

Options:
  --base-url <url>    Server URL (default: $API_URL or http://localhost:3000)
  --duration <sec>    Test duration in seconds (default: 600)
  --rps <n>           Target requests per second (default: 10)
  --warmup <sec>      Seconds to skip from analysis start (default: 30)
  --csv <file>        Export memory snapshots to CSV file
  --help, -h          Show this help message

Exit codes:
  0  No leak detected
  1  Potential leak detected
  2  Could not complete test
`);
  process.exit(0);
}

function getArg(name: string, fallback: string): string {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

function hasFlag(name: string): boolean {
  return args.includes(name);
}

const BASE_URL = getArg('--base-url', process.env.API_URL || 'http://localhost:3000');
const DURATION_SEC = parseInt(getArg('--duration', '600'), 10); // 10 minutes default
const RPS = parseInt(getArg('--rps', '10'), 10);
const WARMUP_SEC = parseInt(getArg('--warmup', '30'), 10); // Skip initial JIT noise
const CSV_PATH = hasFlag('--csv') ? getArg('--csv', '') : '';
const POLL_INTERVAL_SEC = 10;

// Leak detection thresholds
const GROWTH_THRESHOLD_MB_PER_MIN = 1.0; // >1 MB/min growth = suspicious
const R_SQUARED_THRESHOLD = 0.7; // R² > 0.7 = strong correlation

// ── Types ──

interface MemSnapshot {
  timestamp: number; // ms since test start
  rss: number; // MB (server already returns MB)
  heapUsed: number; // MB
  heapTotal: number; // MB
  external: number; // MB
  requestCount: number;
  errorCount: number;
  latencyP50: number; // ms
  latencyP95: number; // ms
}

// ── Endpoints to hit ──

const ENDPOINTS = [
  { method: 'GET', path: '/health', weight: 3 },
  { method: 'GET', path: '/api/v1/health', weight: 2 },
  { method: 'GET', path: '/api/v1/providers', weight: 1 },
  { method: 'GET', path: '/api/v1/appointments', weight: 1 },
  { method: 'GET', path: '/api/v1/transactions', weight: 1 },
  { method: 'GET', path: '/api/v1/invoices', weight: 1 },
];

function pickEndpoint() {
  const totalWeight = ENDPOINTS.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * totalWeight;
  for (const ep of ENDPOINTS) {
    r -= ep.weight;
    if (r <= 0) return ep;
  }
  return ENDPOINTS[0];
}

// ── Stats ──

let totalRequests = 0;
let totalErrors = 0;
const snapshots: MemSnapshot[] = [];
const latencies: number[] = []; // response times in ms for current poll window
let windowLatencies: number[] = []; // reset each poll interval

// ── Linear Regression ──

function linearRegression(points: { x: number; y: number }[]) {
  const n = points.length;
  if (n < 3) return { slope: 0, intercept: 0, rSquared: 0 };

  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0,
    sumY2 = 0;

  for (const { x, y } of points) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: 0, rSquared: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const ssRes = points.reduce((s, { x, y }) => s + (y - (slope * x + intercept)) ** 2, 0);
  const meanY = sumY / n;
  const ssTot = points.reduce((s, { y }) => s + (y - meanY) ** 2, 0);
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, rSquared };
}

// ── Memory Poller ──

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function pollMemory(startTime: number): Promise<MemSnapshot | null> {
  try {
    const res = await fetch(`${BASE_URL}/health?verbose=true`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    // The health endpoint returns: { server: { memory: { rss, heapUsed, heapTotal, external } } }
    // Values are already in MB (server divides by 1024/1024)
    const data = (await res.json()) as {
      server?: {
        memory?: { rss?: number; heapUsed?: number; heapTotal?: number; external?: number };
      };
    };

    const mem = data.server?.memory;
    if (!mem) return null;

    // Compute latency percentiles from current window, then reset
    const sorted = [...windowLatencies].sort((a, b) => a - b);
    windowLatencies = [];

    const snap: MemSnapshot = {
      timestamp: Date.now() - startTime,
      rss: mem.rss ?? 0,
      heapUsed: mem.heapUsed ?? 0,
      heapTotal: mem.heapTotal ?? 0,
      external: mem.external ?? 0,
      requestCount: totalRequests,
      errorCount: totalErrors,
      latencyP50: percentile(sorted, 50),
      latencyP95: percentile(sorted, 95),
    };

    snapshots.push(snap);
    return snap;
  } catch {
    return null;
  }
}

// ── Load Generator ──

async function sendRequest() {
  const ep = pickEndpoint();
  const t0 = performance.now();
  try {
    const res = await fetch(`${BASE_URL}${ep.path}`, {
      method: ep.method,
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'AdvanciaMemTest/1.0',
      },
    });
    totalRequests++;
    if (!res.ok) totalErrors++;
    // Drain body
    await res.text();
  } catch {
    totalRequests++;
    totalErrors++;
  }
  const elapsed = Math.round(performance.now() - t0);
  latencies.push(elapsed);
  windowLatencies.push(elapsed);
}

// ── Display ──

function fmtMB(mb: number): string {
  return mb.toFixed(1);
}

function printSnapshot(snap: MemSnapshot) {
  const elapsed = Math.round(snap.timestamp / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  process.stdout.write(
    `  [${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}] ` +
      `RSS ${fmtMB(snap.rss).padStart(7)}MB  ` +
      `Heap ${fmtMB(snap.heapUsed).padStart(7)}/${fmtMB(snap.heapTotal).padStart(7)}MB  ` +
      `Ext ${fmtMB(snap.external).padStart(6)}MB  ` +
      `P50 ${String(snap.latencyP50).padStart(4)}ms  ` +
      `P95 ${String(snap.latencyP95).padStart(4)}ms  ` +
      `Reqs ${snap.requestCount}  ` +
      `Errs ${snap.errorCount}\n`
  );
}

// ── Main ──

async function main() {
  const boxW = 52;
  const line = (label: string, value: string) =>
    `║  ${label}${value.padEnd(boxW - 4 - label.length)}║`;

  console.log(`
╔${'═'.repeat(boxW)}╗
║${' '.repeat(Math.floor((boxW - 46) / 2))}Advancia PayLedger — Memory Leak Detector${' '.repeat(Math.ceil((boxW - 46) / 2 + 4))}║
╠${'═'.repeat(boxW)}╣
${line('Target:   ', BASE_URL)}
${line('Duration: ', `${DURATION_SEC}s`)}
${line('RPS:      ', String(RPS))}
${line('Warmup:   ', `${WARMUP_SEC}s`)}
${line('Poll:     ', `Every ${POLL_INTERVAL_SEC}s`)}
${CSV_PATH ? line('CSV:      ', CSV_PATH) + '\n' : ''}╚${'═'.repeat(boxW)}╝
  `);

  // Verify server is reachable
  console.log('  Checking server connectivity...');
  try {
    const res = await fetch(`${BASE_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log('  ✅ Server reachable\n');
  } catch (err) {
    console.error(
      `  ❌ Cannot reach ${BASE_URL}/health — ${err instanceof Error ? err.message : err}`
    );
    console.error('  Start the server first: npm run dev\n');
    process.exit(2);
  }

  // Check if verbose health endpoint returns memory data
  const testSnap = await pollMemory(Date.now());
  if (!testSnap || testSnap.heapUsed === 0) {
    console.warn('  ⚠️  /health?verbose=true does not return memory data.');
    console.warn(
      '  Will track request counts only. Ensure your health endpoint exposes memory info.'
    );
    console.warn(
      '  Expected format: { server: { memory: { rss, heapUsed, heapTotal, external } } }\n'
    );
  }

  const startTime = Date.now();
  const endTime = startTime + DURATION_SEC * 1000;

  // Interval: send requests at configured RPS
  const requestInterval = Math.max(1, Math.round(1000 / RPS));
  let requestTimer: NodeJS.Timeout | null = null;

  console.log('  Starting sustained load...\n');
  console.log(
    '  Time      RSS          Heap Used/Total       External    P50     P95     Reqs    Errs'
  );
  console.log(
    '  ─────────────────────────────────────────────────────────────────────────────────────────'
  );

  // Fire requests at target RPS
  requestTimer = setInterval(() => {
    void sendRequest();
  }, requestInterval);

  // Poll memory at fixed interval
  const pollTimer = setInterval(async () => {
    const snap = await pollMemory(startTime);
    if (snap) printSnapshot(snap);
  }, POLL_INTERVAL_SEC * 1000);

  // Wait for duration
  await new Promise<void>((resolve) => {
    const checkDone = setInterval(() => {
      if (Date.now() >= endTime) {
        clearInterval(checkDone);
        resolve();
      }
    }, 1000);
  });

  // Cleanup
  if (requestTimer) clearInterval(requestTimer);
  clearInterval(pollTimer);

  // Final snapshot
  const finalSnap = await pollMemory(startTime);
  if (finalSnap) printSnapshot(finalSnap);

  console.log(
    '\n  ─────────────────────────────────────────────────────────────────────────────────────────'
  );
  console.log(`  Test complete. Total requests: ${totalRequests}, Errors: ${totalErrors}\n`);

  // ── CSV Export ──
  if (CSV_PATH && snapshots.length > 0) {
    const header =
      'timestamp_ms,rss_mb,heapUsed_mb,heapTotal_mb,external_mb,requests,errors,latencyP50_ms,latencyP95_ms';
    const rows = snapshots.map(
      (s) =>
        `${s.timestamp},${s.rss},${s.heapUsed},${s.heapTotal},${s.external},${s.requestCount},${s.errorCount},${s.latencyP50},${s.latencyP95}`
    );
    writeFileSync(CSV_PATH, [header, ...rows].join('\n') + '\n');
    console.log(`  📄 Snapshots exported to ${CSV_PATH}\n`);
  }

  // ── Analyze ──

  // Filter out warmup snapshots for analysis
  const warmupMs = WARMUP_SEC * 1000;
  const analysisSnapshots = snapshots.filter((s) => s.timestamp >= warmupMs);

  if (analysisSnapshots.length < 5) {
    console.log(
      '  ⚠️  Not enough post-warmup snapshots for analysis (need ≥5, got ' +
        analysisSnapshots.length +
        ')'
    );
    console.log('  Try increasing --duration or decreasing --warmup.\n');
    process.exit(0);
  }

  // Linear regression on heapUsed over time (minutes)
  // Values are already in MB from /health endpoint
  const heapPoints = analysisSnapshots.map((s) => ({
    x: s.timestamp / 60000, // minutes
    y: s.heapUsed, // already MB
  }));

  const reg = linearRegression(heapPoints);
  const growthRate = reg.slope; // MB per minute

  // Overall latency stats
  const allSorted = [...latencies].sort((a, b) => a - b);
  const overallP50 = percentile(allSorted, 50);
  const overallP95 = percentile(allSorted, 95);
  const overallP99 = percentile(allSorted, 99);

  const first = analysisSnapshots[0];
  const last = analysisSnapshots[analysisSnapshots.length - 1];
  const heapDelta = (last.heapUsed - first.heapUsed).toFixed(1);

  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║                     ANALYSIS                       ║');
  console.log('╠════════════════════════════════════════════════════╣');
  console.log(
    `  Snapshots total:      ${snapshots.length} (${analysisSnapshots.length} after warmup)`
  );
  console.log(`  Heap start:           ${fmtMB(first.heapUsed)}MB`);
  console.log(`  Heap end:             ${fmtMB(last.heapUsed)}MB`);
  console.log(`  Heap delta:           ${heapDelta}MB`);
  console.log(`  Growth rate:          ${growthRate.toFixed(3)} MB/min`);
  console.log(`  R² (fit quality):     ${reg.rSquared.toFixed(4)}`);
  console.log(
    `  Error rate:           ${totalErrors === 0 ? '0' : ((totalErrors / totalRequests) * 100).toFixed(1)}%`
  );
  console.log(`  Latency P50/P95/P99:  ${overallP50}ms / ${overallP95}ms / ${overallP99}ms`);
  console.log('╚════════════════════════════════════════════════════╝\n');

  // Verdict
  const isLeaking = growthRate > GROWTH_THRESHOLD_MB_PER_MIN && reg.rSquared > R_SQUARED_THRESHOLD;

  if (isLeaking) {
    console.log('  ❌ POTENTIAL MEMORY LEAK DETECTED');
    console.log(
      `     Heap is growing at ${growthRate.toFixed(2)} MB/min with R²=${reg.rSquared.toFixed(3)}`
    );
    console.log('     This indicates a strong, consistent upward trend in memory usage.');
    console.log(
      '     Investigate with: node --inspect src/server.ts + Chrome DevTools heap profiler\n'
    );
    process.exit(1);
  } else if (growthRate > GROWTH_THRESHOLD_MB_PER_MIN) {
    console.log('  ⚠️  INCONCLUSIVE — Growth detected but low correlation');
    console.log(`     Growth: ${growthRate.toFixed(2)} MB/min, R²: ${reg.rSquared.toFixed(3)}`);
    console.log('     May be GC fluctuations. Run a longer soak test: --duration 3600\n');
    process.exit(0);
  } else {
    console.log('  ✅ NO MEMORY LEAK DETECTED');
    console.log(
      `     Growth: ${growthRate.toFixed(2)} MB/min (threshold: ${GROWTH_THRESHOLD_MB_PER_MIN} MB/min)`
    );
    console.log(`     R²: ${reg.rSquared.toFixed(3)} (threshold: ${R_SQUARED_THRESHOLD})`);
    console.log('     Memory usage is stable under sustained load.\n');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Memory leak test failed:', err);
  process.exit(2);
});
