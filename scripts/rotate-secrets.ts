#!/usr/bin/env npx tsx
/**
 * Secrets Rotation Helper
 * ---
 * Generates new secrets and guides you through the rotation process.
 * Does NOT automatically rotate third-party keys (those must be regenerated
 * in each provider's dashboard), but generates and sets internal secrets.
 *
 * Usage:
 *   npx tsx scripts/rotate-secrets.ts            # audit current secrets
 *   npx tsx scripts/rotate-secrets.ts --generate  # generate new internal secrets
 */

import 'dotenv/config';
import crypto from 'node:crypto';

const GENERATE = process.argv.includes('--generate');

interface SecretInfo {
  name: string;
  category: 'internal' | 'external';
  provider: string;
  rotationUrl: string;
  currentPrefix?: string;
  isSet: boolean;
  value?: string;
}

const secrets: SecretInfo[] = [
  {
    name: 'STRIPE_SECRET_KEY',
    category: 'external',
    provider: 'Stripe',
    rotationUrl: 'https://dashboard.stripe.com/apikeys',
    currentPrefix: process.env.STRIPE_SECRET_KEY?.slice(0, 12),
    isSet: !!process.env.STRIPE_SECRET_KEY,
  },
  {
    name: 'STRIPE_PUBLISHABLE_KEY',
    category: 'external',
    provider: 'Stripe',
    rotationUrl: 'https://dashboard.stripe.com/apikeys',
    currentPrefix: process.env.STRIPE_PUBLISHABLE_KEY?.slice(0, 12),
    isSet: !!process.env.STRIPE_PUBLISHABLE_KEY,
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    category: 'external',
    provider: 'Stripe',
    rotationUrl: 'https://dashboard.stripe.com/webhooks',
    currentPrefix: process.env.STRIPE_WEBHOOK_SECRET?.slice(0, 10),
    isSet: !!process.env.STRIPE_WEBHOOK_SECRET,
  },
  {
    name: 'SUPABASE_ANON_KEY',
    category: 'external',
    provider: 'Supabase',
    rotationUrl: 'https://supabase.com/dashboard/project/_/settings/api',
    isSet: !!process.env.SUPABASE_ANON_KEY,
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    category: 'external',
    provider: 'Supabase',
    rotationUrl: 'https://supabase.com/dashboard/project/_/settings/api',
    isSet: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  {
    name: 'RESEND_API_KEY',
    category: 'external',
    provider: 'Resend',
    rotationUrl: 'https://resend.com/api-keys',
    currentPrefix: process.env.RESEND_API_KEY?.slice(0, 8),
    isSet: !!process.env.RESEND_API_KEY,
  },
  {
    name: 'TWILIO_AUTH_TOKEN',
    category: 'external',
    provider: 'Twilio',
    rotationUrl: 'https://console.twilio.com',
    isSet: !!process.env.TWILIO_AUTH_TOKEN,
  },
  {
    name: 'UPSTASH_REDIS_REST_TOKEN',
    category: 'external',
    provider: 'Upstash',
    rotationUrl: 'https://console.upstash.com',
    isSet: !!process.env.UPSTASH_REDIS_REST_TOKEN,
  },
  {
    name: 'SENTRY_DSN',
    category: 'external',
    provider: 'Sentry',
    rotationUrl: 'https://sentry.io/settings/projects/',
    isSet: !!process.env.SENTRY_DSN,
  },
];

function main() {
  console.log(`
╔══════════════════════════════════════════════════╗
║    Advancia PayLedger — Secrets Rotation Audit    ║
╠══════════════════════════════════════════════════╣
║  Mode: ${(GENERATE ? 'Generate + Audit' : 'Audit only').padEnd(42)}║
╚══════════════════════════════════════════════════╝
  `);

  // ── Internal secrets generation ──
  if (GENERATE) {
    console.log('  Generated Internal Secrets:');
    console.log('  ─────────────────────────────────────────────────');
    const jwtSecret = crypto.randomBytes(32).toString('hex');
    const csrfSecret = crypto.randomBytes(32).toString('hex');
    const cookieSecret = crypto.randomBytes(32).toString('hex');

    console.log(`  JWT_SECRET=${jwtSecret}`);
    console.log(`  CSRF_SECRET=${csrfSecret}`);
    console.log(`  COOKIE_SECRET=${cookieSecret}`);
    console.log('');
    console.log('  Copy these into your .env and VPS .env files.');
    console.log('  Then update GitHub Actions secrets:');
    console.log(`    gh secret set JWT_SECRET --env production --body "${jwtSecret}"`);
    console.log('');
  }

  // ── External secrets audit ──
  console.log('  External Secrets Status:');
  console.log('  ─────────────────────────────────────────────────');

  const byProvider: Record<string, SecretInfo[]> = {};
  for (const s of secrets) {
    if (!byProvider[s.provider]) byProvider[s.provider] = [];
    byProvider[s.provider].push(s);
  }

  for (const [provider, providerSecrets] of Object.entries(byProvider)) {
    const rotationUrl = providerSecrets[0].rotationUrl;
    console.log(`\n  ${provider} (${rotationUrl})`);
    for (const s of providerSecrets) {
      const icon = s.isSet ? '✅' : '❌';
      const prefix = s.currentPrefix ? ` (${s.currentPrefix}...)` : '';
      console.log(`    ${icon}  ${s.name}${prefix}`);
    }
  }

  // ── Rotation checklist ──
  console.log(`

  Rotation Checklist:
  ─────────────────────────────────────────────────
  For each provider, follow these steps:

  1. Stripe (https://dashboard.stripe.com/apikeys)
     □ Generate new Restricted API key (or roll the current key)
     □ Update .env locally
     □ Update VPS: ssh advancia@76.13.77.8 "nano /var/www/advancia/.env"
     □ Update GitHub: npx tsx scripts/setup-gh-secrets.ts --apply --env production
     □ Restart server: pm2 reload ecosystem.config.cjs
     □ Verify: npx tsx scripts/stripe-go-live.ts --remote

  2. Supabase (Dashboard → Settings → API)
     □ Note: Supabase keys cannot be rotated without project recreation
     □ Ensure service_role key is not exposed in frontend code

  3. Resend (https://resend.com/api-keys)
     □ Create new API key, revoke old one
     □ Update .env, VPS, GitHub secrets
     □ Test: npm run test:email -- --send your@email.com

  4. Twilio (https://console.twilio.com)
     □ Generate secondary auth token
     □ Update .env, VPS, GitHub secrets
     □ Test: npm run test:sms -- --send +1YOURPHONE
     □ Revoke old auth token

  5. Upstash (https://console.upstash.com)
     □ Rotate REST token in database settings
     □ Update .env, VPS, GitHub secrets
     □ Test: npm run preflight (checks Redis connectivity)

  6. Sentry (https://sentry.io/settings/)
     □ DSN rotation not typically needed unless compromised
     □ Revoke any leaked client keys

  After all rotations:
     □ Run: npm run preflight
     □ Run: npx tsx scripts/stripe-go-live.ts --remote
     □ Run: npm run uptime
     □ Commit updated GitHub secrets setup
  `);

  const setCount = secrets.filter((s) => s.isSet).length;
  const missingCount = secrets.filter((s) => !s.isSet).length;

  console.log(`
╔══════════════════════════════════════════════════╗
║                    SUMMARY                        ║
╠══════════════════════════════════════════════════╣
  Configured: ${setCount}/${secrets.length}
  Missing:    ${missingCount}
╚══════════════════════════════════════════════════╝
  `);
}

main();
