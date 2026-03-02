#!/usr/bin/env npx tsx

/**
 * Server Health Monitor — disk, memory, CPU, and process monitoring
 * ---
 * Designed to run on the VPS as a cron job or ad-hoc check.
 * Reports disk space, memory usage, PM2 process health, and certificate expiry.
 *
 * Usage:
 *   npx tsx scripts/server-health-monitor.ts              # full health report
 *   npx tsx scripts/server-health-monitor.ts --json       # JSON output (for log ingestion)
 *   npx tsx scripts/server-health-monitor.ts --alert      # only print if thresholds exceeded
 *
 * Thresholds (exit code 1 if exceeded):
 *   - Disk usage > 85%
 *   - Memory usage > 85%
 *   - SSL cert expires within 14 days
 *   - PM2 process not online
 *
 * Cron example (every 30 min):
 *   0,30 * * * * cd /var/www/advancia && npx tsx scripts/server-health-monitor.ts --alert >> /var/log/advancia-health.log 2>&1
 */

import 'dotenv/config';
import { execSync, spawnSync } from 'node:child_process';
import os from 'node:os';

const JSON_MODE = process.argv.includes('--json');
const ALERT_ONLY = process.argv.includes('--alert');

// ── Thresholds ──
const DISK_WARN_PCT = 85;
const MEM_WARN_PCT = 85;
const CERT_WARN_DAYS = 14;

interface HealthCheck {
  name: string;
  status: 'ok' | 'warn' | 'critical';
  value: string;
  detail?: string;
}

const checks: HealthCheck[] = [];

// ── System Info ──

function getSystemInfo() {
  const uptime = os.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);

  checks.push({
    name: 'hostname',
    status: 'ok',
    value: os.hostname(),
  });

  checks.push({
    name: 'platform',
    status: 'ok',
    value: `${os.platform()} ${os.arch()} — Node ${process.version}`,
  });

  checks.push({
    name: 'uptime',
    status: 'ok',
    value: `${days}d ${hours}h`,
  });
}

// ── Disk Usage ──

function checkDiskUsage() {
  const isWindows = os.platform() === 'win32';

  if (isWindows) {
    // Windows: use wmic or PowerShell
    try {
      const out = execSync(
        "powershell -Command \"Get-PSDrive -PSProvider FileSystem | Select-Object Name,@{N='UsedGB';E={[math]::Round($_.Used/1GB,1)}},@{N='FreeGB';E={[math]::Round($_.Free/1GB,1)}},@{N='TotalGB';E={[math]::Round(($_.Used+$_.Free)/1GB,1)}} | ConvertTo-Json\"",
        { encoding: 'utf-8', timeout: 10000 }
      );
      const drives = JSON.parse(out);
      const driveList = Array.isArray(drives) ? drives : [drives];

      for (const d of driveList) {
        if (!d.TotalGB || d.TotalGB === 0) continue;
        const usedPct = Math.round((d.UsedGB / d.TotalGB) * 100);
        checks.push({
          name: `disk:${d.Name}`,
          status: usedPct > DISK_WARN_PCT ? 'critical' : usedPct > 70 ? 'warn' : 'ok',
          value: `${usedPct}% used (${d.FreeGB}GB free / ${d.TotalGB}GB total)`,
        });
      }
    } catch {
      checks.push({ name: 'disk', status: 'warn', value: 'Could not read disk usage (Windows)' });
    }
  } else {
    // Linux: use df
    try {
      const out = execSync('df -h / --output=pcent,avail,size 2>/dev/null || df -h /', {
        encoding: 'utf-8',
        timeout: 5000,
      });
      const lines = out.trim().split('\n');
      if (lines.length >= 2) {
        const parts = lines[1].trim().split(/\s+/);
        const usedPct = parseInt(parts[0], 10);
        const avail = parts[1] || 'unknown';
        const total = parts[2] || 'unknown';

        checks.push({
          name: 'disk:/',
          status: usedPct > DISK_WARN_PCT ? 'critical' : usedPct > 70 ? 'warn' : 'ok',
          value: `${usedPct}% used (${avail} free / ${total} total)`,
        });
      }
    } catch {
      checks.push({ name: 'disk', status: 'warn', value: 'Could not read disk usage' });
    }
  }
}

// ── Memory Usage ──

function checkMemory() {
  const totalMB = Math.round(os.totalmem() / 1024 / 1024);
  const freeMB = Math.round(os.freemem() / 1024 / 1024);
  const usedMB = totalMB - freeMB;
  const usedPct = Math.round((usedMB / totalMB) * 100);

  checks.push({
    name: 'memory:system',
    status: usedPct > MEM_WARN_PCT ? 'critical' : usedPct > 70 ? 'warn' : 'ok',
    value: `${usedPct}% used (${usedMB}MB / ${totalMB}MB)`,
    detail: `${freeMB}MB free`,
  });

  // Node.js process memory
  const proc = process.memoryUsage();
  const rss = Math.round(proc.rss / 1024 / 1024);
  const heap = Math.round(proc.heapUsed / 1024 / 1024);
  const heapTotal = Math.round(proc.heapTotal / 1024 / 1024);

  checks.push({
    name: 'memory:node',
    status: 'ok',
    value: `RSS ${rss}MB, Heap ${heap}/${heapTotal}MB`,
  });
}

// ── PM2 Processes ──

function checkPm2() {
  const r = spawnSync('pm2', ['jlist'], {
    encoding: 'utf-8',
    shell: true,
    timeout: 10000,
  });

  if (r.status !== 0 || !r.stdout) {
    checks.push({
      name: 'pm2',
      status: 'warn',
      value: 'PM2 not available (normal on dev machine)',
    });
    return;
  }

  try {
    const apps = JSON.parse(r.stdout);
    for (const app of apps) {
      const status = app.pm2_env?.status ?? 'unknown';
      const restarts = app.pm2_env?.restart_time ?? 0;
      const mem = Math.round((app.monit?.memory ?? 0) / 1024 / 1024);
      const cpu = app.monit?.cpu ?? 0;

      checks.push({
        name: `pm2:${app.name}:${app.pm_id}`,
        status: status === 'online' ? (restarts > 10 ? 'warn' : 'ok') : 'critical',
        value: `${status} — CPU ${cpu}%, Mem ${mem}MB, Restarts ${restarts}`,
      });
    }
  } catch {
    checks.push({ name: 'pm2', status: 'warn', value: 'Could not parse PM2 output' });
  }
}

// ── SSL Certificate Expiry ──

function checkSslCert() {
  const domain = process.env.API_DOMAIN || 'api.advanciapayledger.com';
  const isWindows = os.platform() === 'win32';

  if (isWindows) {
    // Use PowerShell on Windows
    try {
      const out = execSync(
        `powershell -Command "$r = Invoke-WebRequest -Uri 'https://${domain}/health' -UseBasicParsing -TimeoutSec 10; $cert = [Net.ServicePointManager]::FindServicePoint('https://${domain}').Certificate; if ($cert) { $cert.GetExpirationDateString() } else { 'no-cert' }"`,
        { encoding: 'utf-8', timeout: 15000 }
      );
      const dateStr = out.trim();
      if (dateStr && dateStr !== 'no-cert') {
        const expiry = new Date(dateStr);
        const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / 86400000);
        checks.push({
          name: 'ssl:cert',
          status: daysLeft < CERT_WARN_DAYS ? 'critical' : daysLeft < 30 ? 'warn' : 'ok',
          value: `Expires in ${daysLeft} days (${expiry.toISOString().slice(0, 10)})`,
        });
      } else {
        checks.push({ name: 'ssl:cert', status: 'warn', value: 'Could not read certificate' });
      }
    } catch {
      checks.push({
        name: 'ssl:cert',
        status: 'warn',
        value: `Could not check ${domain} cert`,
      });
    }
  } else {
    // Linux: use openssl
    try {
      const out = execSync(
        `echo | openssl s_client -connect ${domain}:443 -servername ${domain} 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null`,
        { encoding: 'utf-8', timeout: 10000 }
      );
      const match = out.match(/notAfter=(.+)/);
      if (match) {
        const expiry = new Date(match[1]);
        const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / 86400000);
        checks.push({
          name: 'ssl:cert',
          status: daysLeft < CERT_WARN_DAYS ? 'critical' : daysLeft < 30 ? 'warn' : 'ok',
          value: `Expires in ${daysLeft} days (${expiry.toISOString().slice(0, 10)})`,
        });
      }
    } catch {
      checks.push({
        name: 'ssl:cert',
        status: 'warn',
        value: `Could not check ${domain} cert (openssl not available)`,
      });
    }
  }
}

// ── Network Connectivity ──

async function checkNetwork(): Promise<void> {
  const apiUrl = process.env.UPTIME_API_URL || 'https://api.advanciapayledger.com/api/v1/health';

  try {
    const start = Date.now();
    const res = await fetch(apiUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'AdvanciaHealthMonitor/1.0' },
    });
    const elapsed = Date.now() - start;

    checks.push({
      name: 'api:health',
      status: res.ok ? 'ok' : 'critical',
      value: `HTTP ${res.status} in ${elapsed}ms`,
    });
  } catch (err) {
    checks.push({
      name: 'api:health',
      status: 'critical',
      value: `Unreachable — ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}

// ── Log File Sizes ──

function checkLogSizes() {
  const isWindows = os.platform() === 'win32';
  if (isWindows) {
    checks.push({ name: 'logs', status: 'ok', value: 'Skipped on Windows (no PM2 logs)' });
    return;
  }

  const logPaths = ['/var/log/pm2/advancia-out.log', '/var/log/pm2/advancia-error.log'];

  for (const logPath of logPaths) {
    try {
      const out = execSync(`stat -c '%s' ${logPath} 2>/dev/null || echo 0`, {
        encoding: 'utf-8',
        timeout: 3000,
      });
      const bytes = parseInt(out.trim(), 10);
      const mb = Math.round(bytes / 1024 / 1024);
      const name = logPath.split('/').pop() || logPath;

      checks.push({
        name: `log:${name}`,
        status: mb > 100 ? 'warn' : 'ok',
        value: `${mb}MB`,
        detail: mb > 100 ? 'Consider running: npm run logs:setup -- --pm2-rotate' : undefined,
      });
    } catch {
      // Log file doesn't exist — that's fine
    }
  }
}

// ── Main ──

async function main(): Promise<void> {
  getSystemInfo();
  checkDiskUsage();
  checkMemory();
  checkPm2();
  checkSslCert();
  await checkNetwork();
  checkLogSizes();

  // JSON output mode
  if (JSON_MODE) {
    const output = {
      timestamp: new Date().toISOString(),
      hostname: os.hostname(),
      checks,
      summary: {
        total: checks.length,
        ok: checks.filter((c) => c.status === 'ok').length,
        warn: checks.filter((c) => c.status === 'warn').length,
        critical: checks.filter((c) => c.status === 'critical').length,
      },
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    // Alert mode: only print if problems found
    const problems = checks.filter((c) => c.status === 'warn' || c.status === 'critical');

    if (ALERT_ONLY && problems.length === 0) {
      // Silent exit — all good
      process.exit(0);
    }

    console.log(`
╔══════════════════════════════════════════════════╗
║     Advancia PayLedger — Server Health Report     ║
╠══════════════════════════════════════════════════╣
║  Time: ${new Date().toISOString().padEnd(42)}║
║  Host: ${os.hostname().padEnd(42)}║
╚══════════════════════════════════════════════════╝
    `);

    for (const c of checks) {
      const icon = { ok: '✅', warn: '⚠️', critical: '❌' }[c.status];
      const line = `  ${icon}  ${c.name.padEnd(24)} ${c.value}`;
      console.log(line);
      if (c.detail) console.log(`      └─ ${c.detail}`);
    }

    const ok = checks.filter((c) => c.status === 'ok').length;
    const warn = checks.filter((c) => c.status === 'warn').length;
    const critical = checks.filter((c) => c.status === 'critical').length;

    console.log(`
╔══════════════════════════════════════════════════╗
║                    SUMMARY                        ║
╠══════════════════════════════════════════════════╣
  ✅ OK:       ${ok}
  ⚠️  Warning:  ${warn}
  ❌ Critical: ${critical}
╚══════════════════════════════════════════════════╝
    `);

    if (critical > 0) {
      console.log('  ⛔  CRITICAL issues detected — investigate immediately!\n');
    }
  }

  // Exit with error code if any critical issues
  const hasCritical = checks.some((c) => c.status === 'critical');
  process.exit(hasCritical ? 1 : 0);
}

main().catch((err) => {
  console.error('Health monitor failed:', err);
  process.exit(1);
});
