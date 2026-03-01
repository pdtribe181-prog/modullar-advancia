#!/usr/bin/env npx tsx
/**
 * GitHub Actions Secrets Setup Script
 * ---
 * Reads your .env file and pushes secrets to GitHub Actions.
 * Uses the `gh` CLI (must be installed and authenticated).
 *
 * Usage:
 *   npx tsx scripts/setup-gh-secrets.ts                  # dry run (show commands)
 *   npx tsx scripts/setup-gh-secrets.ts --apply           # actually set secrets
 *   npx tsx scripts/setup-gh-secrets.ts --apply --env production  # set environment secrets
 *   npx tsx scripts/setup-gh-secrets.ts --env staging     # for staging
 */

import 'dotenv/config';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--apply');
const envIdx = args.indexOf('--env');
const GH_ENVIRONMENT = envIdx !== -1 ? args[envIdx + 1] : '';

// Secrets to sync from .env → GitHub
const SECRET_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'SENTRY_DSN',
  'FRONTEND_URL',
] as const;

function maskValue(val: string): string {
  if (val.length <= 8) return '***';
  return val.slice(0, 6) + '...' + val.slice(-4);
}

async function main() {
  console.log(`
╔══════════════════════════════════════════════════╗
║   Advancia PayLedger — GitHub Secrets Setup       ║
╠══════════════════════════════════════════════════╣
║  Mode:        ${(DRY_RUN ? 'Dry Run (preview)' : 'APPLY (writing secrets)').padEnd(35)}║
║  Environment: ${(GH_ENVIRONMENT || 'Repository-level (shared)').padEnd(35)}║
╚══════════════════════════════════════════════════╝
  `);

  // Check gh CLI
  if (!DRY_RUN) {
    try {
      execSync('gh auth status', { stdio: 'pipe' });
    } catch {
      console.error('ERROR: GitHub CLI not authenticated. Run: gh auth login');
      process.exit(1);
    }
  }

  let set = 0;
  let skipped = 0;
  let missing = 0;

  for (const key of SECRET_KEYS) {
    const value = process.env[key];

    if (!value) {
      console.log(`  ⏭  ${key.padEnd(32)} — not set in .env, skipping`);
      missing++;
      continue;
    }

    const envFlag = GH_ENVIRONMENT ? ` --env ${GH_ENVIRONMENT}` : '';
    const cmd = `gh secret set ${key}${envFlag} --body "${value.replace(/"/g, '\\"')}"`;

    if (DRY_RUN) {
      console.log(`  📋  ${key.padEnd(32)} → ${maskValue(value)}`);
      skipped++;
    } else {
      try {
        execSync(cmd, { stdio: 'pipe' });
        console.log(`  ✅  ${key.padEnd(32)} → set (${maskValue(value)})`);
        set++;
      } catch (err: any) {
        console.log(`  ❌  ${key.padEnd(32)} → failed: ${err.message.split('\n')[0]}`);
      }
    }
  }

  console.log(`
╔══════════════════════════════════════════════════╗
║                    SUMMARY                        ║
╠══════════════════════════════════════════════════╣
  Set:     ${set}
  Preview: ${skipped}
  Missing: ${missing}
╚══════════════════════════════════════════════════╝
  `);

  if (DRY_RUN) {
    console.log('  This was a DRY RUN. Add --apply to actually set the secrets.');
    console.log('  Add --env production to set environment-specific secrets.\n');
    console.log('  Example:');
    console.log('    npx tsx scripts/setup-gh-secrets.ts --apply');
    console.log('    npx tsx scripts/setup-gh-secrets.ts --apply --env production\n');
  } else {
    console.log(
      '  Verify with: gh secret list' + (GH_ENVIRONMENT ? ` --env ${GH_ENVIRONMENT}` : '') + '\n'
    );
  }
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
