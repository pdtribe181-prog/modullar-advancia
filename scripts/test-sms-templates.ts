#!/usr/bin/env npx tsx
/**
 * SMS Template Test Script
 * ---
 * Renders every SMS template with sample data and optionally sends to a real number.
 *
 * Usage:
 *   npx tsx scripts/test-sms-templates.ts                         # dry run (show messages)
 *   npx tsx scripts/test-sms-templates.ts --send +15551234567     # actually send via Twilio
 *   npx tsx scripts/test-sms-templates.ts --template otp_verification  # single template
 *
 * Requires:
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in .env (for --send mode)
 */

import 'dotenv/config';

// ── CLI args ──

const args = process.argv.slice(2);
function getArg(name: string, fallback: string): string {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}
const SEND_TO = getArg('send', '');
const ONLY_TEMPLATE = getArg('template', '');
const DRY_RUN = !SEND_TO;

// ── SMS template definitions (mirrors src/services/sms.service.ts) ──

const smsTemplates: Record<string, (data: Record<string, unknown>) => string> = {
  security_password_changed: (data) =>
    `SECURITY ALERT: Your Advancia password was changed on ${data.date}. If this wasn't you, reset your password immediately.`,

  security_email_changed: (data) =>
    `SECURITY ALERT: Email change requested from ${data.oldEmail} to ${data.newEmail}. If this wasn't you, secure your account.`,

  security_new_login: (data) =>
    `New login to your Advancia account from ${data.device || 'unknown device'} at ${data.location || 'unknown location'}. Not you? Secure your account.`,

  security_mfa_enabled: () =>
    `Two-factor authentication has been enabled on your Advancia account. Your account is now more secure.`,

  security_mfa_disabled: () =>
    `ALERT: Two-factor authentication was disabled on your Advancia account. If this wasn't you, re-enable it immediately.`,

  otp_verification: (data) =>
    `Your Advancia verification code is: ${data.code}. Expires in ${data.expiresIn || '10'} minutes. Don't share this code.`,

  payment_received: (data) =>
    `Payment of $${data.amount} ${data.currency || 'USD'} received. Transaction ID: ${String(data.transactionId || '').slice(0, 8)}...`,

  payment_failed: (data) =>
    `Payment of $${data.amount} ${data.currency || 'USD'} failed. ${data.reason || 'Please try again or use a different payment method.'}`,

  appointment_reminder: (data) =>
    `Reminder: Appointment with ${data.providerName} tomorrow at ${data.time}. Reply HELP for assistance.`,

  appointment_confirmed: (data) =>
    `Appointment confirmed with ${data.providerName} on ${data.date} at ${data.time}. See you then!`,

  appointment_cancelled: (data) =>
    `Your appointment with ${data.providerName} on ${data.date} has been cancelled. ${data.reason ? `Reason: ${data.reason}` : ''}`,

  account_recovery: (data) =>
    `Advancia account recovery code: ${data.code}. If you didn't request this, ignore this message.`,

  welcome: (data) =>
    `Welcome to Advancia, ${data.name || 'there'}! Your account is ready. Visit our portal to get started.`,
};

// Sample data for each template
const sampleData: Record<string, Record<string, unknown>> = {
  security_password_changed: {
    date: new Date().toLocaleDateString(),
  },
  security_email_changed: {
    oldEmail: 'user@old-email.com',
    newEmail: 'user@new-email.com',
  },
  security_new_login: {
    device: 'Chrome on Windows 11',
    location: 'New York, NY',
  },
  security_mfa_enabled: {},
  security_mfa_disabled: {},
  otp_verification: {
    code: '847291',
    expiresIn: '10',
  },
  payment_received: {
    amount: '250.00',
    currency: 'USD',
    transactionId: 'txn_test_abc123def456',
  },
  payment_failed: {
    amount: '150.00',
    currency: 'USD',
    reason: 'Card declined — insufficient funds.',
  },
  appointment_reminder: {
    providerName: 'Dr. Sarah Kim',
    time: '9:00 AM',
  },
  appointment_confirmed: {
    providerName: 'Dr. Emily Chen',
    date: '2026-04-01',
    time: '10:30 AM',
  },
  appointment_cancelled: {
    providerName: 'Dr. Michael Lee',
    date: '2026-04-02',
    reason: 'Provider unavailable',
  },
  account_recovery: {
    code: '639481',
  },
  welcome: {
    name: 'Jane Doe',
  },
};

// ── Twilio setup (lazy) ──

let twilioClient: any = null;

async function getTwilioClient() {
  if (twilioClient) return twilioClient;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;

  const twilio = (await import('twilio')).default;
  twilioClient = twilio(accountSid, authToken);
  return twilioClient;
}

// ── Main ──

async function main() {
  const templateNames = ONLY_TEMPLATE ? [ONLY_TEMPLATE] : Object.keys(smsTemplates);

  console.log(`
╔══════════════════════════════════════════════════╗
║      Advancia PayLedger - SMS Template Test       ║
╠══════════════════════════════════════════════════╣
║  Mode:       ${(DRY_RUN ? 'Dry Run (render only)' : `Send to ${SEND_TO}`).padEnd(35)}║
║  Templates:  ${String(templateNames.length).padEnd(35)}║
╚══════════════════════════════════════════════════╝
  `);

  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  let client: any = null;

  if (!DRY_RUN) {
    client = await getTwilioClient();
    if (!client) {
      console.error('ERROR: TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set in .env');
      process.exit(1);
    }
    if (!fromNumber) {
      console.error('ERROR: TWILIO_PHONE_NUMBER not set in .env');
      process.exit(1);
    }
  }

  let passed = 0;
  let failed = 0;

  for (const name of templateNames) {
    const templateFn = smsTemplates[name];
    const data = sampleData[name];

    if (!templateFn || !data) {
      console.log(`  SKIP  ${name} — no template or sample data`);
      continue;
    }

    try {
      const message = templateFn(data);
      const charCount = message.length;
      const segments = Math.ceil(charCount / 160);

      if (DRY_RUN) {
        console.log(`  ✅  ${name}`);
        console.log(`      ${charCount} chars (${segments} segment${segments > 1 ? 's' : ''})`);
        console.log(`      "${message}"`);
        console.log('');

        // Validate length (SMS best practice: keep under 160 chars)
        if (charCount > 160) {
          console.log(
            `      ⚠  Warning: message exceeds 160 chars (will be sent as ${segments} segments)`
          );
        }
        passed++;
      } else {
        // Actually send via Twilio
        const result = await client.messages.create({
          body: `[TEST] ${message}`,
          to: SEND_TO,
          from: fromNumber,
        });

        console.log(
          `  ✅  ${name.padEnd(30)} → sent (SID: ${result.sid}, status: ${result.status})`
        );
        passed++;

        // Small delay to avoid rate limits
        await new Promise((r) => setTimeout(r, 1000));
      }
    } catch (err: any) {
      console.log(`  ❌  ${name.padEnd(30)} — ${err.message}`);
      failed++;
    }
  }

  // Summary
  const maxChar = Object.entries(smsTemplates)
    .map(([name, fn]) => ({ name, len: fn(sampleData[name] || {}).length }))
    .sort((a, b) => b.len - a.len);

  console.log(`
╔══════════════════════════════════════════════════╗
║                    SUMMARY                        ║
╠══════════════════════════════════════════════════╣
  Passed: ${passed}
  Failed: ${failed}
  Total:  ${templateNames.length}

  Character length ranking:
${maxChar
  .slice(0, 5)
  .map((t, i) => `    ${i + 1}. ${t.name.padEnd(28)} ${t.len} chars`)
  .join('\n')}
╚══════════════════════════════════════════════════╝
  `);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('SMS template test failed:', err);
  process.exit(1);
});
