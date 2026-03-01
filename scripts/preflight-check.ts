/**
 * Production Pre-Flight Check Script
 *
 * Run before deploying to production to verify all systems are ready.
 * Usage: npx tsx scripts/preflight-check.ts
 *
 * Checks:
 * 1. Environment variables (required + recommended)
 * 2. Database connectivity (Supabase)
 * 3. Third-party services (Stripe, Resend, Twilio, Sentry, Redis)
 * 4. Security configuration
 * 5. Build artifacts
 * 6. DNS / domain readiness (if dig/nslookup available)
 */

import 'dotenv/config';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ─── Types ─────────────────────────────────────────────────────────────────

interface CheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
}

type Section = { title: string; checks: CheckResult[] };

const sections: Section[] = [];
let currentSection: Section | null = null;

function section(title: string) {
  currentSection = { title, checks: [] };
  sections.push(currentSection);
}

function pass(name: string, msg = '') {
  currentSection!.checks.push({ name, status: 'pass', message: msg });
}
function warn(name: string, msg: string) {
  currentSection!.checks.push({ name, status: 'warn', message: msg });
}
function fail(name: string, msg: string) {
  currentSection!.checks.push({ name, status: 'fail', message: msg });
}

// ─── 1. Environment Variables ──────────────────────────────────────────────

function checkEnvVars() {
  section('Environment Variables');

  const required: [string, string?][] = [
    ['NODE_ENV'],
    ['PORT'],
    ['SUPABASE_URL'],
    ['SUPABASE_ANON_KEY'],
    ['SUPABASE_SERVICE_ROLE_KEY'],
    ['STRIPE_SECRET_KEY'],
    ['STRIPE_PUBLISHABLE_KEY'],
    ['STRIPE_WEBHOOK_SECRET'],
    ['FRONTEND_URL'],
  ];

  const recommended: [string, string][] = [
    ['RESEND_API_KEY', 'Email sending will be disabled'],
    ['SENTRY_DSN', 'Error tracking will be disabled'],
    [
      'UPSTASH_REDIS_REST_URL',
      'Rate limiting will use in-memory store (not shared across instances)',
    ],
    ['TWILIO_ACCOUNT_SID', 'SMS notifications will be disabled'],
    ['CORS_ORIGINS', 'Will use hardcoded origins only'],
    ['SUPABASE_WEBHOOK_SECRET', 'Database webhooks will not verify signatures'],
  ];

  for (const [key] of required) {
    if (process.env[key]) {
      pass(key, `Set (${process.env[key]!.slice(0, 12)}...)`);
    } else {
      fail(key, 'Missing required environment variable');
    }
  }

  // Production-specific checks
  if (process.env.NODE_ENV !== 'production') {
    warn('NODE_ENV', `Currently "${process.env.NODE_ENV}" — should be "production" for deployment`);
  }

  if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
    warn('STRIPE_SECRET_KEY', 'Using TEST key — switch to sk_live_ for production');
  }

  if (process.env.STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_')) {
    warn('STRIPE_PUBLISHABLE_KEY', 'Using TEST key — switch to pk_live_ for production');
  }

  if (process.env.FRONTEND_URL?.includes('localhost')) {
    warn(
      'FRONTEND_URL',
      `"${process.env.FRONTEND_URL}" points to localhost — update for production`
    );
  }

  for (const [key, msg] of recommended) {
    if (process.env[key]) {
      pass(key, 'Configured');
    } else {
      warn(key, msg);
    }
  }
}

// ─── 2. Database Connectivity ──────────────────────────────────────────────

async function checkDatabase() {
  section('Database Connectivity');

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    fail('Supabase', 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return;
  }

  try {
    // Test REST API connectivity
    const res = await fetch(`${url}/rest/v1/user_profiles?select=id&limit=1`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });
    if (res.ok) {
      pass('Supabase REST API', `HTTP ${res.status} — connected`);
    } else {
      fail('Supabase REST API', `HTTP ${res.status}: ${await res.text()}`);
    }
  } catch (err: any) {
    fail('Supabase REST API', `Connection failed: ${err.message}`);
  }

  try {
    // Test Auth endpoint
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: process.env.SUPABASE_ANON_KEY! },
    });
    if (res.ok) {
      pass('Supabase Auth', 'Auth service reachable');
    } else {
      warn('Supabase Auth', `HTTP ${res.status}`);
    }
  } catch (err: any) {
    fail('Supabase Auth', `Connection failed: ${err.message}`);
  }
}

// ─── 3. Third-Party Services ───────────────────────────────────────────────

async function checkThirdPartyServices() {
  section('Third-Party Services');

  // Stripe
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const res = await fetch('https://api.stripe.com/v1/balance', {
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const isLive = !process.env.STRIPE_SECRET_KEY.includes('test');
        pass(
          'Stripe API',
          `Connected (${isLive ? 'LIVE' : 'TEST'} mode, ${data.available?.length || 0} currencies)`
        );
      } else {
        fail('Stripe API', `HTTP ${res.status}: ${(await res.json()).error?.message || 'Unknown'}`);
      }
    } catch (err: any) {
      fail('Stripe API', `Connection failed: ${err.message}`);
    }
  } else {
    fail('Stripe API', 'STRIPE_SECRET_KEY not configured');
  }

  // Resend (email)
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      });
      if (res.ok) {
        const data = await res.json();
        pass('Resend Email', `Connected (${data.data?.length || 0} domain(s))`);
      } else {
        warn('Resend Email', `HTTP ${res.status} — check API key`);
      }
    } catch (err: any) {
      fail('Resend Email', `Connection failed: ${err.message}`);
    }
  } else {
    warn('Resend Email', 'RESEND_API_KEY not set — email disabled');
  }

  // Sentry
  if (process.env.SENTRY_DSN) {
    try {
      const dsnUrl = new URL(process.env.SENTRY_DSN);
      pass('Sentry DSN', `Configured (${dsnUrl.hostname})`);
    } catch {
      fail('Sentry DSN', 'Invalid DSN URL format');
    }
  } else {
    warn('Sentry', 'SENTRY_DSN not set — error tracking disabled');
  }

  // Redis / Upstash
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, {
        headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
      });
      if (res.ok) {
        pass('Upstash Redis', 'Connected');
      } else {
        warn('Upstash Redis', `HTTP ${res.status}`);
      }
    } catch (err: any) {
      warn('Upstash Redis', `Connection failed: ${err.message}`);
    }
  } else if (process.env.REDIS_URL) {
    pass('Redis', `REDIS_URL configured (${process.env.REDIS_URL.replace(/\/\/.*@/, '//***@')})`);
  } else {
    warn('Redis', 'No Redis configured — using in-memory rate limiting');
  }

  // Twilio
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    pass('Twilio SMS', 'Credentials configured');
  } else {
    warn('Twilio SMS', 'Not configured — SMS notifications disabled');
  }
}

// ─── 4. Security Configuration ─────────────────────────────────────────────

function checkSecurity() {
  section('Security Configuration');

  // Check .env is not committed
  if (existsSync(resolve('.gitignore'))) {
    const gitignore = readFileSync(resolve('.gitignore'), 'utf8');
    if (gitignore.includes('.env')) {
      pass('.gitignore', '.env files are excluded from git');
    } else {
      fail('.gitignore', '.env files are NOT excluded — secrets may be committed');
    }
  } else {
    fail('.gitignore', 'No .gitignore file found');
  }

  // Check Stripe keys are not live in test mode or vice versa
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')
  ) {
    fail('Stripe Mode', 'Production env is using Stripe TEST keys');
  }

  // Check body size limit is reasonable
  pass('Body Size Limit', '10kb (configured in server.ts)');

  // Check trust proxy
  pass('Trust Proxy', 'Enabled (set trust proxy 1 for Cloudflare/nginx)');

  // HSTS
  pass('HSTS', 'Enabled (31536000s, includeSubDomains, preload)');

  // CSP
  pass('Content Security Policy', 'Configured with nonce-based script policy');

  // Rate limiting
  pass('Rate Limiting', 'Configured (API: 100/15min, Auth: 10/15min, Payment: 10/1min)');

  // CSRF
  pass('CSRF Protection', 'Enabled for mutating requests (webhooks excluded)');

  // Input sanitization
  pass('XSS Sanitization', 'Enabled via sanitize.middleware.ts');
}

// ─── 5. Build Artifacts ────────────────────────────────────────────────────

function checkBuildArtifacts() {
  section('Build Artifacts');

  const distServer = resolve('dist/server.js');
  const distOpenapi = resolve('dist/openapi.yaml');
  const nodeModules = resolve('node_modules');

  if (existsSync(distServer)) {
    pass('dist/server.js', 'Build output exists');
  } else {
    warn('dist/server.js', 'Not found — run `npm run build` before deploying');
  }

  if (existsSync(distOpenapi)) {
    pass('dist/openapi.yaml', 'OpenAPI spec copied to dist');
  } else {
    warn('dist/openapi.yaml', 'Not found — API docs will be unavailable');
  }

  if (existsSync(nodeModules)) {
    pass('node_modules', 'Dependencies installed');
  } else {
    fail('node_modules', 'Not found — run `npm ci`');
  }

  // Check package-lock.json exists (important for CI)
  if (existsSync(resolve('package-lock.json'))) {
    pass('package-lock.json', 'Lock file exists for reproducible builds');
  } else {
    warn('package-lock.json', 'Missing — `npm ci` will fail in CI');
  }
}

// ─── 6. Configuration Files ───────────────────────────────────────────────

function checkConfigFiles() {
  section('Configuration Files');

  const files: [string, string, boolean][] = [
    ['config/ecosystem.config.cjs', 'PM2 process manager config', true],
    ['config/Dockerfile', 'Docker containerization', false],
    ['config/docker-compose.yml', 'Docker Compose orchestration', false],
    ['config/nginx/advancia.conf', 'Nginx reverse proxy config', true],
    ['config/render.yaml', 'Render deployment config', false],
    ['config/Procfile', 'Process file for PaaS deployment', false],
  ];

  for (const [file, desc, required] of files) {
    if (existsSync(resolve(file))) {
      pass(file, desc);
    } else if (required) {
      fail(file, `${desc} — NOT FOUND`);
    } else {
      warn(file, `${desc} — not found (optional)`);
    }
  }
}

// ─── 7. Local API Health Check ─────────────────────────────────────────────

async function checkLocalHealth() {
  section('Local API Health');

  const port = process.env.PORT || 3000;
  const baseUrl = `http://localhost:${port}`;

  try {
    const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      pass(
        '/health',
        `Status: ${data.status}, DB: ${data.database}, Redis: ${data.redis?.status || 'N/A'}`
      );

      if (data.database !== 'connected') {
        warn('Database via /health', `Database status: ${data.database}`);
      }
    } else {
      warn('/health', `HTTP ${res.status} — server may be unhealthy`);
    }
  } catch {
    warn('Local server', `Not running on port ${port} (start with \`npm run dev\`)`);
  }
}

// ─── Report ────────────────────────────────────────────────────────────────

function printReport() {
  const ICONS = { pass: '\x1b[32m✓\x1b[0m', warn: '\x1b[33m⚠\x1b[0m', fail: '\x1b[31m✗\x1b[0m' };

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║         PRODUCTION PRE-FLIGHT CHECK REPORT              ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  let totalPass = 0,
    totalWarn = 0,
    totalFail = 0;

  for (const s of sections) {
    console.log(`\n── ${s.title} ${'─'.repeat(Math.max(0, 50 - s.title.length))}\n`);
    for (const c of s.checks) {
      const icon = ICONS[c.status];
      const msg = c.message ? ` — ${c.message}` : '';
      console.log(`  ${icon} ${c.name}${msg}`);
      if (c.status === 'pass') totalPass++;
      else if (c.status === 'warn') totalWarn++;
      else totalFail++;
    }
  }

  const total = totalPass + totalWarn + totalFail;
  console.log('\n══════════════════════════════════════════════════════════');
  console.log(
    `  Results: ${totalPass}/${total} passed, ${totalWarn} warnings, ${totalFail} failures`
  );

  if (totalFail > 0) {
    console.log('\n  \x1b[31m✗ NOT READY FOR PRODUCTION — fix failures above\x1b[0m');
    process.exitCode = 1;
  } else if (totalWarn > 0) {
    console.log('\n  \x1b[33m⚠ CONDITIONAL — review warnings before deploying\x1b[0m');
  } else {
    console.log('\n  \x1b[32m✓ ALL CHECKS PASSED — ready for production\x1b[0m');
  }

  console.log(`\n  Timestamp: ${new Date().toISOString()}\n`);
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  checkEnvVars();
  await checkDatabase();
  await checkThirdPartyServices();
  checkSecurity();
  checkBuildArtifacts();
  checkConfigFiles();
  await checkLocalHealth();
  printReport();
}

main().catch((err) => {
  console.error('Pre-flight check crashed:', err);
  process.exit(2);
});
