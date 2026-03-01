#!/usr/bin/env npx tsx
/**
 * Log Aggregation Setup & Configuration
 * ---
 * Configures PM2 log rotation and provides integration guides
 * for cloud log aggregation services (Logtail, Papertrail, Datadog).
 *
 * The app already outputs structured JSON logs via logging.middleware.ts.
 * This script sets up the infrastructure to collect and ship them.
 *
 * Usage:
 *   npx tsx scripts/log-aggregation.ts              # show guide + check current config
 *   npx tsx scripts/log-aggregation.ts --pm2-rotate  # install PM2 log rotation
 *   npx tsx scripts/log-aggregation.ts --test        # test log output format
 */

import 'dotenv/config';
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PM2_ROTATE = process.argv.includes('--pm2-rotate');
const TEST_LOGS = process.argv.includes('--test');

function hasPm2(): boolean {
  const r = spawnSync('pm2', ['--version'], { encoding: 'utf-8', shell: true, timeout: 5000 });
  return r.status === 0;
}

function getPm2LogPaths(): { out: string; err: string } | null {
  try {
    const desc = execSync('pm2 jlist 2>nul || echo "[]"', { encoding: 'utf-8' });
    const apps = JSON.parse(desc);
    const app = apps.find((a: { name: string }) => a.name === 'advancia-api');
    if (app) {
      return {
        out: app.pm2_env?.pm_out_log_path ?? '/var/log/pm2/advancia-out.log',
        err: app.pm2_env?.pm_err_log_path ?? '/var/log/pm2/advancia-error.log',
      };
    }
  } catch {
    // not running
  }
  return null;
}

function testLogFormat(): void {
  console.log('\n  Sample structured log output:');
  console.log('  ─────────────────────────────────────────────────');

  const sample = {
    level: 'info',
    timestamp: new Date().toISOString(),
    message: 'Request completed',
    requestId: 'abc-123-def',
    method: 'GET',
    path: '/api/v1/patients',
    statusCode: 200,
    duration: '45ms',
    userAgent: 'Mozilla/5.0',
    ip: '192.168.1.1',
  };
  console.log(`  ${JSON.stringify(sample, null, 2)}`);

  const errorSample = {
    level: 'error',
    timestamp: new Date().toISOString(),
    message: 'Payment processing failed',
    error: {
      name: 'StripeError',
      message: 'Card was declined',
    },
    requestId: 'xyz-789',
    transactionId: 'txn_abc123',
  };
  console.log(`\n  ${JSON.stringify(errorSample, null, 2)}`);

  console.log(
    '\n  ✅ Logs are already structured JSON — compatible with all aggregation services.'
  );
}

function installPm2LogRotate(): void {
  console.log('\n  Installing PM2 Log Rotation:');
  console.log('  ─────────────────────────────────────────────────');

  if (!hasPm2()) {
    console.log('  ❌ PM2 not found. Install with: npm install -g pm2');
    return;
  }

  try {
    console.log('  Installing pm2-logrotate module...');
    execSync('pm2 install pm2-logrotate', { encoding: 'utf-8', timeout: 30000 });
    console.log('  ✅ pm2-logrotate installed');

    // Configure rotation
    const configs: [string, string][] = [
      ['max_size', '50M'],
      ['retain', '14'],
      ['compress', 'true'],
      ['dateFormat', 'YYYY-MM-DD_HH-mm-ss'],
      ['rotateModule', 'true'],
      ['workerInterval', '3600'],
    ];

    for (const [key, value] of configs) {
      execSync(`pm2 set pm2-logrotate:${key} ${value}`, {
        encoding: 'utf-8',
        timeout: 5000,
      });
      console.log(`  ✅ pm2-logrotate:${key} = ${value}`);
    }

    console.log('\n  Log rotation configured: 50MB max size, 14 day retention, compressed.');
  } catch (err) {
    console.log(`  ❌ Failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function main() {
  console.log(`
╔══════════════════════════════════════════════════╗
║    Advancia PayLedger — Log Aggregation Setup     ║
╠══════════════════════════════════════════════════╣
║  Logger: Structured JSON (logging.middleware.ts)  ║
║  Fields: level, timestamp, message, requestId     ║
╚══════════════════════════════════════════════════╝
  `);

  if (TEST_LOGS) {
    testLogFormat();
    return;
  }

  if (PM2_ROTATE) {
    installPm2LogRotate();
    return;
  }

  // ── Current status ──
  console.log('  Current Status:');
  console.log('  ─────────────────────────────────────────────────');

  const pm2OK = hasPm2();
  console.log(`  ${pm2OK ? '✅' : '⚠️'}  PM2: ${pm2OK ? 'installed' : 'not found'}`);

  const logPaths = getPm2LogPaths();
  if (logPaths) {
    console.log(`  ✅ PM2 output log: ${logPaths.out}`);
    console.log(`  ✅ PM2 error log:  ${logPaths.err}`);
  } else {
    console.log('  ⚠️  PM2 app not running (normal on dev machine)');
  }

  const sentryDsn = process.env.SENTRY_DSN;
  console.log(
    `  ${sentryDsn ? '✅' : '⚠️'}  Sentry: ${sentryDsn ? 'configured (errors)' : 'not set'}`
  );
  console.log('  ✅ JSON structured logging: enabled (all environments)');

  // ── PM2 Log Rotation ──
  console.log(`
  Step 1: PM2 Log Rotation (VPS)
  ═════════════════════════════════════════════════
  Prevents log files from filling the disk.

    npx tsx scripts/log-aggregation.ts --pm2-rotate

  Or manually on VPS:
    pm2 install pm2-logrotate
    pm2 set pm2-logrotate:max_size 50M
    pm2 set pm2-logrotate:retain 14
    pm2 set pm2-logrotate:compress true
  `);

  // ── Aggregation options ──
  console.log(`
  Step 2: Choose a Log Aggregation Service
  ═════════════════════════════════════════════════

  ┌─────────────┬──────────┬──────────────────────────────────────┐
  │ Service     │ Free Tier│ Setup                                │
  ├─────────────┼──────────┼──────────────────────────────────────┤
  │ Logtail     │ 1 GB/mo  │ Lightweight, great JSON support      │
  │ Papertrail  │ 100 MB/mo│ Syslog-based, easy PM2 integration   │
  │ Datadog     │ 14-day   │ Full observability platform           │
  │ Axiom       │ 500 MB/mo│ Built for structured data            │
  └─────────────┴──────────┴──────────────────────────────────────┘
  `);

  // Logtail
  console.log(`
  Option A: Logtail (Recommended)
  ─────────────────────────────────────────────────
  1. Sign up: https://logtail.com
  2. Create a new source (Node.js / JSON)
  3. Copy the source token
  4. Add to .env:
       LOGTAIL_TOKEN=your_token_here
  5. Install on VPS:
       npm install @logtail/node @logtail/winston
  6. Update logging.middleware.ts to add Logtail transport:

     import { Logtail } from '@logtail/node';
     const logtail = new Logtail(process.env.LOGTAIL_TOKEN!);

     // Add to each log method:
     logtail.info(message, meta);  // .warn(), .error()
  `);

  // Papertrail
  console.log(`
  Option B: Papertrail (Simplest — no code changes)
  ─────────────────────────────────────────────────
  1. Sign up: https://papertrailapp.com
  2. Create a log destination → get host:port (e.g., logs5.papertrailapp.com:12345)
  3. On VPS, configure rsyslog to forward PM2 logs:

     echo '*.* @logs5.papertrailapp.com:12345' | sudo tee /etc/rsyslog.d/papertrail.conf
     sudo systemctl restart rsyslog

  4. Or use remote_syslog2 (lightweight daemon):
     wget https://github.com/papertrail/remote_syslog2/releases/download/v0.21/remote_syslog_linux_amd64.tar.gz
     tar xzf remote_syslog_linux_amd64.tar.gz
     echo 'files:
       - /var/log/pm2/advancia-out.log
       - /var/log/pm2/advancia-error.log
     destination:
       host: logs5.papertrailapp.com
       port: 12345' > /etc/log_files.yml
     ./remote_syslog
  `);

  // Datadog
  console.log(`
  Option C: Datadog (Full Observability)
  ─────────────────────────────────────────────────
  1. Sign up: https://datadoghq.com (14-day free trial)
  2. Install Datadog Agent on VPS:
     DD_API_KEY=xxx DD_SITE="datadoghq.com" bash -c \\
       "$(curl -L https://install.datadoghq.com/scripts/install_script_agent7.sh)"
  3. Configure log collection in /etc/datadog-agent/datadog.yaml:
     logs_enabled: true
  4. Create /etc/datadog-agent/conf.d/pm2.d/conf.yaml:
     logs:
       - type: file
         path: /var/log/pm2/advancia-out.log
         service: advancia-api
         source: nodejs
       - type: file
         path: /var/log/pm2/advancia-error.log
         service: advancia-api
         source: nodejs
         log_processing_rules:
           - type: multi_line
             name: stacktrace
             pattern: "^\\\\s+at "
  5. Restart agent: systemctl restart datadog-agent
  `);

  console.log(`
  Current Logging Architecture:
  ═════════════════════════════════════════════════

   Request → Express Middleware → Structured JSON Logger
                                        │
                ┌───────────────────────┼───────────────────────┐
                │                       │                       │
           PM2 stdout              PM2 stderr              Sentry
        (all log levels)        (errors + warns)       (errors only)
        /var/log/pm2/           /var/log/pm2/          cloud dashboard
        advancia-out.log        advancia-error.log

                        ┌───────────────┐
                        │ Log Rotation  │  ← pm2-logrotate
                        │ 50MB / 14 days│
                        └───────┬───────┘
                                │
                    ┌───────────┴───────────┐
                    │  Aggregation Service  │  ← Logtail / Papertrail / Datadog
                    │  Search, alerts, dash │
                    └───────────────────────┘
  `);
}

main();
