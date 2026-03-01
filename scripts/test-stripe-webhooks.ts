#!/usr/bin/env npx tsx
/**
 * Stripe Webhook Delivery Tester
 * ---
 * Uses the Stripe CLI to send test webhook events to your local or
 * production endpoint and validates the response.
 *
 * Prerequisites:
 *   - Stripe CLI installed: https://stripe.com/docs/stripe-cli
 *   - Authenticated: `stripe login`
 *
 * Usage:
 *   npx tsx scripts/test-stripe-webhooks.ts                 # dry-run: list events, check CLI
 *   npx tsx scripts/test-stripe-webhooks.ts --trigger       # fire test events at local endpoint
 *   npx tsx scripts/test-stripe-webhooks.ts --trigger --url https://api.advanciapayledger.com/api/v1/stripe/webhook
 */

import 'dotenv/config';
import { execSync, spawnSync } from 'node:child_process';

const DRY_RUN = !process.argv.includes('--trigger');
const URL_FLAG_INDEX = process.argv.indexOf('--url');
const ENDPOINT_URL =
  URL_FLAG_INDEX !== -1
    ? process.argv[URL_FLAG_INDEX + 1]
    : 'http://localhost:3000/api/v1/stripe/webhook';

/**
 * Event types the app handles (from stripe-webhooks.service.ts)
 */
const HANDLED_EVENTS = [
  // Payment Intent Events
  'payment_intent.created',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
  // Charge Events
  'charge.succeeded',
  'charge.failed',
  'charge.refunded',
  'charge.dispute.created',
  // Customer Events
  'customer.created',
  'customer.updated',
  'customer.deleted',
  // Subscription Events
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  // Invoice Events
  'invoice.created',
  'invoice.paid',
  'invoice.payment_failed',
  'invoice.finalized',
  // Connect Events
  'account.updated',
  // Transfer Events
  'transfer.created',
  'transfer.failed',
  // Payout Events
  'payout.created',
  'payout.paid',
  'payout.failed',
  // Checkout Session Events
  'checkout.session.completed',
  'checkout.session.expired',
];

/**
 * Core events to test (most critical for healthcare payments)
 */
const CORE_EVENTS = [
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'charge.refunded',
  'charge.dispute.created',
  'invoice.paid',
  'invoice.payment_failed',
  'customer.subscription.created',
  'customer.subscription.deleted',
  'checkout.session.completed',
];

function hasStripeCli(): boolean {
  const result = spawnSync('stripe', ['--version'], {
    encoding: 'utf-8',
    shell: true,
    timeout: 10000,
  });
  return result.status === 0;
}

function isStripeLoggedIn(): boolean {
  const result = spawnSync('stripe', ['config', '--list'], {
    encoding: 'utf-8',
    shell: true,
    timeout: 10000,
  });
  return result.status === 0 && result.stdout.includes('test_mode_api_key');
}

function triggerEvent(eventType: string): { success: boolean; output: string } {
  try {
    const output = execSync(
      `stripe trigger ${eventType} --override event:created=${Math.floor(Date.now() / 1000)}`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    return { success: true, output: output.trim() };
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? (err as Error & { stderr?: string }).stderr || err.message
        : String(err);
    return { success: false, output: msg.trim() };
  }
}

function main() {
  console.log(`
╔══════════════════════════════════════════════════╗
║   Advancia PayLedger — Stripe Webhook Tester      ║
╠══════════════════════════════════════════════════╣
║  Endpoint: ${ENDPOINT_URL.slice(0, 39).padEnd(39)}║
║  Mode:     ${(DRY_RUN ? 'DRY RUN (add --trigger to fire events)' : '🔴  TRIGGERING EVENTS').padEnd(39)}║
╚══════════════════════════════════════════════════╝
  `);

  // ── Check prerequisites ──
  console.log('  Prerequisites:');
  console.log('  ─────────────────────────────────────────────────');

  const hasCli = hasStripeCli();
  console.log(`  ${hasCli ? '✅' : '❌'}  Stripe CLI installed`);

  if (!hasCli) {
    console.log(`
  Install Stripe CLI:
    Windows: scoop install stripe
    macOS:   brew install stripe/stripe-cli/stripe
    Linux:   see https://stripe.com/docs/stripe-cli#install
  Then run: stripe login
    `);
    process.exit(1);
  }

  const loggedIn = isStripeLoggedIn();
  console.log(`  ${loggedIn ? '✅' : '⚠️'}  Stripe CLI authenticated`);

  if (!loggedIn) {
    console.log('     Run: stripe login\n');
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  console.log(`  ${webhookSecret ? '✅' : '❌'}  STRIPE_WEBHOOK_SECRET set in .env`);

  // ── List handled events ──
  console.log(`
  Handled Webhook Events (${HANDLED_EVENTS.length} total):
  ─────────────────────────────────────────────────`);
  for (const evt of HANDLED_EVENTS) {
    const isCore = CORE_EVENTS.includes(evt);
    console.log(`    ${isCore ? '★' : '·'}  ${evt}`);
  }
  console.log(`\n  ★ = Core events (${CORE_EVENTS.length}) — tested first`);

  // ── Trigger events ──
  if (!DRY_RUN) {
    if (!loggedIn) {
      console.log('\n  ❌ Cannot trigger events — Stripe CLI not authenticated.');
      console.log('     Run: stripe login\n');
      process.exit(1);
    }

    console.log(`
  Triggering Core Events:
  ─────────────────────────────────────────────────`);

    let passed = 0;
    let failed = 0;

    for (const evt of CORE_EVENTS) {
      process.stdout.write(`    Triggering ${evt}... `);
      const result = triggerEvent(evt);
      if (result.success) {
        console.log('✅');
        passed++;
      } else {
        console.log('❌');
        console.log(`      ${result.output.split('\n')[0]}`);
        failed++;
      }
    }

    console.log(`
  ─────────────────────────────────────────────────
  Results: ${passed} passed, ${failed} failed out of ${CORE_EVENTS.length} core events
    `);

    if (failed === 0) {
      console.log('  ✅ All core webhook events triggered successfully!');
    } else {
      console.log('  ⚠️  Some events failed. Check server logs for details:');
      console.log('     pm2 logs advancia-api --lines 50');
    }
  }

  // ── Manual testing instructions ──
  console.log(`
  Manual Testing Steps:
  ─────────────────────────────────────────────────
  1. Forward events to local server:
     stripe listen --forward-to localhost:3000/api/v1/stripe/webhook

  2. In a separate terminal, trigger events:
     stripe trigger payment_intent.succeeded
     stripe trigger charge.dispute.created
     stripe trigger customer.subscription.created

  3. Check the server logs:
     pm2 logs advancia-api --lines 20

  4. Query webhook events in database:
     SELECT event_type, event_id, created_at
     FROM stripe_webhook_events
     ORDER BY created_at DESC
     LIMIT 20;

  5. For production testing:
     a) Go to https://dashboard.stripe.com/webhooks
     b) Select your endpoint: ${ENDPOINT_URL}
     c) Click "Send test webhook" for each event type
     d) Verify 200 responses in webhook delivery logs
  `);
}

main();
