/**
 * Uptime Monitor — lightweight health-check poller
 *
 * Checks API and frontend at regular intervals and logs results.
 * Can optionally send alerts via Resend email when an endpoint goes down.
 *
 * Usage:
 *   npx tsx scripts/uptime-monitor.ts                          # one-shot check
 *   npx tsx scripts/uptime-monitor.ts --watch                  # poll every 5 min
 *   npx tsx scripts/uptime-monitor.ts --watch --interval 60    # poll every 60s
 *
 * Environment:
 *   UPTIME_API_URL       — API health endpoint (default: https://api.advanciapayledger.com/health)
 *   UPTIME_FRONTEND_URL  — Frontend URL (default: https://advanciapayledger.com)
 *   RESEND_API_KEY       — (optional) enables email alerts on failure
 *   UPTIME_ALERT_EMAIL   — (optional) email to notify (default: support@advanciapayledger.com)
 */

import 'dotenv/config';

const API_URL = process.env.UPTIME_API_URL || 'https://api.advanciapayledger.com/health';
const FRONTEND_URL = process.env.UPTIME_FRONTEND_URL || 'https://advanciapayledger.com';
const ALERT_EMAIL = process.env.UPTIME_ALERT_EMAIL || 'support@advanciapayledger.com';
const RESEND_KEY = process.env.RESEND_API_KEY;

interface CheckResult {
  url: string;
  status: 'up' | 'down';
  statusCode?: number;
  responseTime: number; // ms
  error?: string;
  details?: Record<string, unknown>;
}

async function checkEndpoint(url: string, timeout = 10000): Promise<CheckResult> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeout),
      headers: { 'User-Agent': 'AdvanciaUptimeMonitor/1.0' },
    });
    const elapsed = Date.now() - start;

    let details: Record<string, unknown> | undefined;
    try {
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        details = await res.json();
      }
    } catch {
      // Non-JSON response is fine for frontend
    }

    return {
      url,
      status: res.ok ? 'up' : 'down',
      statusCode: res.status,
      responseTime: elapsed,
      details,
    };
  } catch (err: any) {
    return {
      url,
      status: 'down',
      responseTime: Date.now() - start,
      error: err.message || 'Unknown error',
    };
  }
}

async function sendAlert(results: CheckResult[]) {
  if (!RESEND_KEY) return;

  const downServices = results.filter((r) => r.status === 'down');
  if (downServices.length === 0) return;

  const body = downServices
    .map(
      (r) =>
        `• ${r.url}\n  Status: ${r.statusCode || 'N/A'} | Error: ${r.error || 'HTTP error'}\n  Response time: ${r.responseTime}ms`
    )
    .join('\n\n');

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Advancia Uptime <alerts@advanciapayledger.com>',
        to: [ALERT_EMAIL],
        subject: `🔴 Downtime Alert — ${downServices.length} service(s) down`,
        text: `Advancia PayLedger Uptime Alert\n${'='.repeat(40)}\n\n${body}\n\nTimestamp: ${new Date().toISOString()}\n\n— Advancia Uptime Monitor`,
      }),
    });
    console.log(`  📧 Alert sent to ${ALERT_EMAIL}`);
  } catch (err: any) {
    console.error(`  ⚠ Failed to send alert: ${err.message}`);
  }
}

function printResult(r: CheckResult) {
  const icon = r.status === 'up' ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
  const time = `${r.responseTime}ms`;
  const code = r.statusCode ? `HTTP ${r.statusCode}` : 'N/A';
  const db = r.details && 'database' in r.details ? ` | DB: ${r.details.database}` : '';
  const redis =
    r.details && 'redis' in r.details
      ? ` | Redis: ${(r.details.redis as any)?.status || 'N/A'}`
      : '';

  console.log(
    `  ${icon} ${r.url} — ${code} (${time})${db}${redis}${r.error ? ` | ${r.error}` : ''}`
  );
}

async function runChecks(): Promise<CheckResult[]> {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] Running uptime checks...`);

  const results = await Promise.all([checkEndpoint(API_URL), checkEndpoint(FRONTEND_URL)]);

  for (const r of results) printResult(r);

  // Send alerts if any service is down
  await sendAlert(results);

  return results;
}

// ─── CLI ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const watchMode = args.includes('--watch');
const intervalIdx = args.indexOf('--interval');
const intervalSec = intervalIdx !== -1 ? parseInt(args[intervalIdx + 1], 10) : 300; // default 5 min

async function main() {
  if (watchMode) {
    console.log(`Uptime monitor started (polling every ${intervalSec}s)`);
    console.log(`  API:      ${API_URL}`);
    console.log(`  Frontend: ${FRONTEND_URL}`);
    console.log(
      `  Alerts:   ${RESEND_KEY ? `enabled → ${ALERT_EMAIL}` : 'disabled (no RESEND_API_KEY)'}`
    );

    // Initial check
    await runChecks();

    // Continue polling
    setInterval(runChecks, intervalSec * 1000);
  } else {
    const results = await runChecks();
    const allUp = results.every((r) => r.status === 'up');
    process.exit(allUp ? 0 : 1);
  }
}

main().catch((err) => {
  console.error('Uptime monitor error:', err);
  process.exit(2);
});
