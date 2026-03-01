#!/usr/bin/env npx tsx
/**
 * Staging Environment Setup
 * ---
 * Automates creation and validation of a staging Supabase project.
 * Generates a .env.staging file and applies migrations.
 *
 * Usage:
 *   npx tsx scripts/staging-setup.ts                # interactive setup guide
 *   npx tsx scripts/staging-setup.ts --migrate      # apply migrations to staging DB
 *   npx tsx scripts/staging-setup.ts --validate     # validate staging env connectivity
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const MIGRATE = process.argv.includes('--migrate');
const VALIDATE = process.argv.includes('--validate');
const ROOT = path.resolve(import.meta.dirname ?? '.', '..');
const STAGING_ENV_PATH = path.join(ROOT, '.env.staging');
const MIGRATIONS_DIR = path.join(ROOT, 'migrations');

interface StagingConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
}

function readStagingEnv(): Partial<StagingConfig> {
  if (!fs.existsSync(STAGING_ENV_PATH)) return {};
  const content = fs.readFileSync(STAGING_ENV_PATH, 'utf-8');
  const get = (key: string) => {
    const match = content.match(new RegExp(`^${key}=(.+)$`, 'm'));
    return match?.[1]?.trim();
  };
  return {
    supabaseUrl: get('SUPABASE_URL'),
    supabaseAnonKey: get('SUPABASE_ANON_KEY'),
    supabaseServiceRoleKey: get('SUPABASE_SERVICE_ROLE_KEY'),
  };
}

function getMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

async function validateConnectivity(config: Partial<StagingConfig>): Promise<boolean> {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    console.log('  ❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.staging');
    return false;
  }

  try {
    const res = await fetch(`${config.supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: config.supabaseAnonKey || config.supabaseServiceRoleKey,
        Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
      },
    });
    if (res.ok) {
      console.log(`  ✅ Staging Supabase reachable (${config.supabaseUrl})`);
      return true;
    }
    console.log(`  ❌ Staging Supabase returned HTTP ${res.status}`);
    return false;
  } catch (err) {
    console.log(
      `  ❌ Cannot reach staging Supabase: ${err instanceof Error ? err.message : String(err)}`
    );
    return false;
  }
}

function runMigrations(config: Partial<StagingConfig>) {
  const migrations = getMigrationFiles();
  if (migrations.length === 0) {
    console.log('  ❌ No migration files found in migrations/');
    return;
  }

  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    console.log('  ❌ Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.staging first');
    return;
  }

  console.log(`\n  Applying ${migrations.length} migrations to staging...`);
  console.log('  ─────────────────────────────────────────────────');

  let applied = 0;
  let failed = 0;

  for (const file of migrations) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    try {
      const res = execSync(
        `curl -sf -X POST "${config.supabaseUrl}/rest/v1/rpc" ` +
          `-H "apikey: ${config.supabaseServiceRoleKey}" ` +
          `-H "Authorization: Bearer ${config.supabaseServiceRoleKey}" ` +
          `-H "Content-Type: application/json" ` +
          `-d ${JSON.stringify(JSON.stringify({ query: sql }))}`,
        { encoding: 'utf-8', timeout: 30000 }
      );
      console.log(`  ✅ ${file}`);
      applied++;
    } catch {
      // If REST RPC fails, try the SQL editor endpoint
      console.log(`  ⚠️  ${file} — manual apply may be needed`);
      failed++;
    }
  }

  console.log(`\n  Applied: ${applied}, Issues: ${failed}/${migrations.length}`);
  if (failed > 0) {
    console.log('  Note: Some migrations may need manual execution in Supabase SQL Editor.');
    console.log(`  Dashboard: ${config.supabaseUrl?.replace('.supabase.co', '')}/sql`);
  }
}

function main() {
  console.log(`
╔══════════════════════════════════════════════════╗
║    Advancia PayLedger — Staging Setup             ║
╠══════════════════════════════════════════════════╣
║  Config:  .env.staging                            ║
║  Migrations: ${String(getMigrationFiles().length).padEnd(36)}║
╚══════════════════════════════════════════════════╝
  `);

  const config = readStagingEnv();

  if (VALIDATE) {
    console.log('  Validating staging connectivity...');
    console.log('  ─────────────────────────────────────────────────');
    validateConnectivity(config).then((ok) => {
      process.exit(ok ? 0 : 1);
    });
    return;
  }

  if (MIGRATE) {
    validateConnectivity(config).then((ok) => {
      if (ok) runMigrations(config);
      else {
        console.log('  Fix connectivity before applying migrations.');
        process.exit(1);
      }
    });
    return;
  }

  // ── Interactive setup guide ──
  const hasEnv = fs.existsSync(STAGING_ENV_PATH);
  console.log(`  Current Status:`);
  console.log(`  ─────────────────────────────────────────────────`);
  console.log(`  ${hasEnv ? '✅' : '❌'}  .env.staging file ${hasEnv ? 'exists' : 'missing'}`);
  console.log(
    `  ${config.supabaseUrl ? '✅' : '❌'}  SUPABASE_URL: ${config.supabaseUrl || 'not set'}`
  );
  console.log(
    `  ${config.supabaseAnonKey ? '✅' : '❌'}  SUPABASE_ANON_KEY: ${config.supabaseAnonKey ? 'set' : 'not set'}`
  );
  console.log(
    `  ${config.supabaseServiceRoleKey ? '✅' : '❌'}  SUPABASE_SERVICE_ROLE_KEY: ${config.supabaseServiceRoleKey ? 'set' : 'not set'}`
  );

  if (!hasEnv) {
    generateStagingEnv();
  }

  console.log(`
  Setup Steps:
  ═════════════════════════════════════════════════

  1. Create Staging Supabase Project
     ┌──────────────────────────────────────────┐
     │  https://supabase.com/dashboard          │
     │  → New Project                           │
     │  → Name: advancia-staging                │
     │  → Region: same as production            │
     │  → Generate a strong DB password         │
     └──────────────────────────────────────────┘

  2. Get Staging Credentials
     Go to: Project Settings → API
     Copy:
     - Project URL → SUPABASE_URL
     - anon/public key → SUPABASE_ANON_KEY
     - service_role key → SUPABASE_SERVICE_ROLE_KEY

  3. Update .env.staging
     Edit the generated .env.staging file with staging credentials.

  4. Apply Migrations
     npx tsx scripts/staging-setup.ts --migrate

     Or manually in Supabase SQL Editor, run migrations 001-054 in order.

  5. Validate Connectivity
     npx tsx scripts/staging-setup.ts --validate

  6. Set GitHub Actions Staging Secrets
     npx tsx scripts/setup-gh-secrets.ts --apply --env staging

  7. Configure Stripe Test Webhooks
     In Stripe Dashboard (test mode):
     - Add endpoint: https://api-staging.advanciapayledger.com/api/v1/stripe/webhook
     - Select all events listed in npm run stripe:webhooks

  8. Verify End-to-End
     npm run preflight  (with .env.staging loaded)
     npm run test:e2e   (against staging URL)
  `);
}

function generateStagingEnv() {
  const prodEnv = path.join(ROOT, '.env.example');
  if (!fs.existsSync(prodEnv)) {
    console.log('  ⚠️  No .env.example found — creating minimal .env.staging');
  }

  const template = `# Advancia PayLedger — Staging Environment
# Generated by scripts/staging-setup.ts
# ⚠️ Use STAGING credentials only — never production keys!

NODE_ENV=staging
PORT=3000

# Supabase (staging project)
SUPABASE_URL=https://YOUR_STAGING_PROJECT.supabase.co
SUPABASE_ANON_KEY=eyJ...YOUR_STAGING_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=eyJ...YOUR_STAGING_SERVICE_ROLE_KEY

# Stripe (TEST mode keys only)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...staging_webhook_secret

# Frontend
FRONTEND_URL=https://staging.advanciapayledger.com
CORS_ORIGINS=https://staging.advanciapayledger.com,http://localhost:5173

# Email (Resend — staging)
RESEND_API_KEY=re_...staging
FROM_EMAIL=staging@advanciapayledger.com

# SMS (Twilio — test credentials)
TWILIO_ACCOUNT_SID=AC...staging
TWILIO_AUTH_TOKEN=...staging
TWILIO_PHONE_NUMBER=+15005550006

# Redis (Upstash — staging)
UPSTASH_REDIS_REST_URL=https://...staging.upstash.io
UPSTASH_REDIS_REST_TOKEN=...staging

# Monitoring
SENTRY_DSN=https://...@sentry.io/staging
SENTRY_ENVIRONMENT=staging
LOG_LEVEL=debug
`;

  fs.writeFileSync(STAGING_ENV_PATH, template, 'utf-8');
  console.log('  📄 Generated .env.staging — fill in staging credentials.');
}

main();
