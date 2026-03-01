#!/usr/bin/env npx tsx
/**
 * Stripe Production Switch Validator
 * ---
 * Validates that Stripe is correctly configured for live mode.
 * Run this AFTER switching to live keys.
 *
 * Usage:
 *   npx tsx scripts/stripe-go-live.ts              # validate local .env
 *   npx tsx scripts/stripe-go-live.ts --remote      # also test the Stripe API
 */

import 'dotenv/config';
import Stripe from 'stripe';

const REMOTE = process.argv.includes('--remote');

interface Check {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP';
  detail: string;
}

const checks: Check[] = [];

function pass(name: string, detail: string) {
  checks.push({ name, status: 'PASS', detail });
}
function fail(name: string, detail: string) {
  checks.push({ name, status: 'FAIL', detail });
}
function warn(name: string, detail: string) {
  checks.push({ name, status: 'WARN', detail });
}
function skip(name: string, detail: string) {
  checks.push({ name, status: 'SKIP', detail });
}

async function main() {
  console.log(`
╔══════════════════════════════════════════════════╗
║    Advancia PayLedger — Stripe Go-Live Check      ║
╠══════════════════════════════════════════════════╣
║  Mode: ${(REMOTE ? 'Local .env + Remote API' : 'Local .env only').padEnd(42)}║
╚══════════════════════════════════════════════════╝
  `);

  // ── 1. Secret key check ──
  const sk = process.env.STRIPE_SECRET_KEY || '';
  if (sk.startsWith('sk_live_')) {
    pass('STRIPE_SECRET_KEY', 'Live key detected');
  } else if (sk.startsWith('sk_test_')) {
    fail('STRIPE_SECRET_KEY', `Still using TEST key: ${sk.slice(0, 18)}...`);
  } else {
    fail('STRIPE_SECRET_KEY', 'Not set or unrecognized format');
  }

  // ── 2. Publishable key check ──
  const pk = process.env.STRIPE_PUBLISHABLE_KEY || '';
  if (pk.startsWith('pk_live_')) {
    pass('STRIPE_PUBLISHABLE_KEY', 'Live key detected');
  } else if (pk.startsWith('pk_test_')) {
    fail('STRIPE_PUBLISHABLE_KEY', `Still using TEST key: ${pk.slice(0, 18)}...`);
  } else {
    fail('STRIPE_PUBLISHABLE_KEY', 'Not set or unrecognized format');
  }

  // ── 3. Webhook secret check ──
  const whs = process.env.STRIPE_WEBHOOK_SECRET || '';
  if (whs.startsWith('whsec_')) {
    pass('STRIPE_WEBHOOK_SECRET', 'Webhook secret configured');
  } else {
    fail('STRIPE_WEBHOOK_SECRET', 'Not set or invalid format');
  }

  // ── 4. NODE_ENV check ──
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production') {
    pass('NODE_ENV', 'production');
  } else {
    warn('NODE_ENV', `Currently "${env}" — should be "production" on the VPS`);
  }

  // ── 5. FRONTEND_URL check ──
  const frontendUrl = process.env.FRONTEND_URL || '';
  if (frontendUrl.includes('localhost') || frontendUrl.includes('127.0.0.1')) {
    warn('FRONTEND_URL', `Still pointing to localhost: ${frontendUrl}`);
  } else if (frontendUrl.includes('advanciapayledger.com')) {
    pass('FRONTEND_URL', frontendUrl);
  } else {
    warn('FRONTEND_URL', `Unusual value: ${frontendUrl}`);
  }

  // ── 6. Key pair consistency ──
  const skMode = sk.startsWith('sk_live_')
    ? 'live'
    : sk.startsWith('sk_test_')
      ? 'test'
      : 'unknown';
  const pkMode = pk.startsWith('pk_live_')
    ? 'live'
    : pk.startsWith('pk_test_')
      ? 'test'
      : 'unknown';
  if (skMode === pkMode) {
    pass('Key pair consistency', `Both keys are ${skMode} mode`);
  } else {
    fail('Key pair consistency', `SECRET is ${skMode} but PUBLISHABLE is ${pkMode} — must match!`);
  }

  // ── 7. Remote Stripe API checks ──
  if (REMOTE && sk.startsWith('sk_')) {
    try {
      const stripe = new Stripe(sk);

      // Check account details
      const account = await stripe.accounts.retrieve();
      if (account.charges_enabled) {
        pass('Stripe charges enabled', `Account: ${account.business_profile?.name || account.id}`);
      } else {
        fail(
          'Stripe charges enabled',
          'Charges are NOT enabled — complete business verification on Stripe Dashboard'
        );
      }

      if (account.payouts_enabled) {
        pass('Stripe payouts enabled', 'Bank account verified');
      } else {
        warn('Stripe payouts enabled', 'Payouts not enabled — may need bank verification');
      }

      // Check webhook endpoints
      const webhookEndpoints = await stripe.webhookEndpoints.list({ limit: 10 });
      if (webhookEndpoints.data.length > 0) {
        const activeEndpoints = webhookEndpoints.data.filter((w) => w.status === 'enabled');
        pass('Webhook endpoints', `${activeEndpoints.length} active endpoint(s)`);
        for (const ep of webhookEndpoints.data) {
          console.log(`    → ${ep.url} (${ep.status}, ${ep.enabled_events.length} events)`);
        }
      } else {
        fail('Webhook endpoints', 'No webhook endpoints configured — add one in Stripe Dashboard');
      }

      // Check for products
      const products = await stripe.products.list({ limit: 1, active: true });
      if (products.data.length > 0) {
        pass('Stripe products', 'At least 1 active product exists');
      } else {
        warn('Stripe products', 'No active products — create products/prices on Stripe Dashboard');
      }

      // Check balance (can we read it?)
      const balance = await stripe.balance.retrieve();
      pass(
        'Stripe API access',
        `Available balance: ${balance.available.map((b) => `${(b.amount / 100).toFixed(2)} ${b.currency.toUpperCase()}`).join(', ') || '0.00'}`
      );
    } catch (err: any) {
      if (err.type === 'StripeAuthenticationError') {
        fail('Stripe API access', 'Authentication failed — invalid API key');
      } else {
        fail('Stripe API access', err.message);
      }
    }
  } else if (REMOTE) {
    skip('Stripe remote checks', 'No valid secret key to test with');
  } else {
    skip('Stripe remote checks', 'Run with --remote to test Stripe API connectivity');
  }

  // ── Report ──
  const icons: Record<string, string> = { PASS: '✅', FAIL: '❌', WARN: '⚠ ', SKIP: '⏭ ' };
  console.log('  Results:');
  console.log('  ─────────────────────────────────────────────────');
  for (const c of checks) {
    console.log(`  ${icons[c.status]}  ${c.name}`);
    console.log(`      ${c.detail}`);
  }

  const passed = checks.filter((c) => c.status === 'PASS').length;
  const failed = checks.filter((c) => c.status === 'FAIL').length;
  const warned = checks.filter((c) => c.status === 'WARN').length;
  const skipped = checks.filter((c) => c.status === 'SKIP').length;

  console.log(`
╔══════════════════════════════════════════════════╗
║                    SUMMARY                        ║
╠══════════════════════════════════════════════════╣
  ✅ Passed:  ${passed}
  ❌ Failed:  ${failed}
  ⚠  Warned:  ${warned}
  ⏭  Skipped: ${skipped}
╚══════════════════════════════════════════════════╝
  `);

  if (failed > 0) {
    console.log('  ❌ NOT READY for production. Fix the failures above.\n');
    console.log('  Quick fixes:');
    if (checks.find((c) => c.name.includes('SECRET_KEY') && c.status === 'FAIL')) {
      console.log('    1. Go to https://dashboard.stripe.com/apikeys');
      console.log('    2. Copy your live secret key (sk_live_...)');
      console.log('    3. Update STRIPE_SECRET_KEY in your .env');
    }
    if (checks.find((c) => c.name.includes('PUBLISHABLE') && c.status === 'FAIL')) {
      console.log('    4. Copy your live publishable key (pk_live_...)');
      console.log('    5. Update STRIPE_PUBLISHABLE_KEY in your .env');
    }
    if (checks.find((c) => c.name.includes('charges') && c.status === 'FAIL')) {
      console.log(
        '    6. Complete business verification: https://dashboard.stripe.com/account/onboarding'
      );
    }
    console.log('');
  } else if (warned > 0) {
    console.log('  ⚠  Mostly ready — review warnings above.\n');
  } else {
    console.log('  ✅ READY for production Stripe payments!\n');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Stripe go-live check failed:', err);
  process.exit(1);
});
