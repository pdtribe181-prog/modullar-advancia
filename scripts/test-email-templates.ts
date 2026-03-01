#!/usr/bin/env npx tsx
/**
 * Email Template Test Script
 * ---
 * Renders every email template with sample data and optionally sends to a real address.
 *
 * Usage:
 *   npx tsx scripts/test-email-templates.ts                     # render-only (dry run)
 *   npx tsx scripts/test-email-templates.ts --send test@example.com  # actually send via Resend
 *   npx tsx scripts/test-email-templates.ts --template payment_succeeded  # single template
 *
 * Requires:
 *   RESEND_API_KEY in .env (for --send mode)
 */

import 'dotenv/config';
import { Resend } from 'resend';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// ── CLI args ──

const args = process.argv.slice(2);
function getArg(name: string, fallback: string): string {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}
const SEND_TO = getArg('send', '');
const ONLY_TEMPLATE = getArg('template', '');
const DRY_RUN = !SEND_TO;

// ── Email template definitions (mirrors src/services/email.service.ts) ──

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

const sampleData: Record<string, Record<string, unknown>> = {
  payment_succeeded: {
    customerName: 'Jane Doe',
    amount: '250.00',
    currency: 'USD',
    description: 'Office Visit — Dr. Smith',
    date: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    transactionId: 'txn_test_abc123def456',
    receiptUrl: 'https://dashboard.stripe.com/test/receipts/demo',
  },
  payment_failed: {
    customerName: 'John Smith',
    amount: '150.00',
    currency: 'USD',
    reason: 'Card was declined — insufficient funds.',
  },
  refund_processed: {
    customerName: 'Alice Johnson',
    amount: '75.50',
    currency: 'USD',
    originalPaymentId: 'pi_test_orig789',
    refundId: 're_test_refund456',
  },
  invoice_sent: {
    customerName: 'Bob Williams',
    amount: '320.00',
    currency: 'USD',
    invoiceNumber: 'INV-2026-0042',
    dueDate: '2026-04-15',
    hostedInvoiceUrl: 'https://invoice.stripe.com/i/demo',
  },
  appointment_confirmed: {
    patientName: 'Carol Davis',
    providerName: 'Dr. Emily Chen',
    specialty: 'Cardiology',
    date: '2026-04-01',
    time: '10:30 AM',
    duration: 30,
  },
  appointment_cancelled: {
    patientName: 'David Brown',
    providerName: 'Dr. Michael Lee',
    date: '2026-04-02',
    time: '2:00 PM',
    reason: 'Provider unavailable',
    refunded: true,
  },
  appointment_reminder: {
    patientName: 'Eva Martinez',
    providerName: 'Dr. Sarah Kim',
    date: '2026-04-03',
    time: '9:00 AM',
    portalUrl: 'https://advanciapayledger.com/portal',
  },
  security_password_changed: {
    name: 'Frank Wilson',
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString(),
    device: 'Chrome on Windows 11',
    location: 'New York, NY',
  },
  security_email_changed: {
    name: 'Grace Taylor',
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString(),
    oldEmail: 'grace@old-email.com',
    newEmail: 'grace@new-email.com',
  },
  security_new_login: {
    name: 'Henry Anderson',
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString(),
    device: 'Safari on macOS',
    location: 'San Francisco, CA',
    ipAddress: '203.0.113.42',
    securityUrl: 'https://advanciapayledger.com/security',
  },
  security_mfa_enabled: {
    name: 'Iris Thomas',
  },
};

// Re-create the template functions (so this script is standalone, no server import)
const templates: Record<string, (data: any) => EmailTemplate> = {
  payment_succeeded: (data) => ({
    subject: `Payment Confirmation - $${data.amount}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #0d9488; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Payment Confirmed</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <p>Hi ${data.customerName || 'there'},</p>
          <p>Your payment of <strong>$${data.amount} ${data.currency}</strong> has been successfully processed.</p>
          <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Payment Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #6b7280;">Amount</td><td style="padding: 8px 0; text-align: right;"><strong>$${data.amount} ${data.currency}</strong></td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Description</td><td style="padding: 8px 0; text-align: right;">${data.description || 'Payment'}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Date</td><td style="padding: 8px 0; text-align: right;">${data.date}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Transaction ID</td><td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px;">${data.transactionId}</td></tr>
            </table>
          </div>
          ${data.receiptUrl ? `<p><a href="${data.receiptUrl}" style="color: #0d9488;">View Receipt</a></p>` : ''}
          <p>Thank you for your payment!</p>
          <p style="color: #6b7280; font-size: 14px;">Advancia PayLedger</p>
        </div>
      </div>`,
    text: `Payment Confirmed\n\nHi ${data.customerName || 'there'},\nYour payment of $${data.amount} ${data.currency} has been successfully processed.\nTransaction ID: ${data.transactionId}\n\nAdvancia PayLedger`,
  }),

  payment_failed: (data) => ({
    subject: 'Payment Failed - Action Required',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc2626; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Payment Failed</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <p>Hi ${data.customerName || 'there'},</p>
          <p>Your payment of <strong>$${data.amount} ${data.currency}</strong> could not be processed.</p>
          <div style="background-color: #fef2f2; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3 style="margin-top: 0; color: #dc2626;">Reason</h3>
            <p style="margin-bottom: 0;">${data.reason || 'Your payment method was declined.'}</p>
          </div>
          <p><strong>What you can do:</strong></p>
          <ul><li>Check your payment details and try again</li><li>Use a different payment method</li><li>Contact your bank if the issue persists</li></ul>
          <p style="color: #6b7280; font-size: 14px;">Advancia PayLedger</p>
        </div>
      </div>`,
    text: `Payment Failed\n\nHi ${data.customerName || 'there'},\nYour payment of $${data.amount} ${data.currency} could not be processed.\nReason: ${data.reason || 'Declined.'}\n\nAdvancia PayLedger`,
  }),

  refund_processed: (data) => ({
    subject: `Refund Processed - $${data.amount}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #2563eb; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Refund Processed</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <p>Hi ${data.customerName || 'there'},</p>
          <p>Your refund of <strong>$${data.amount} ${data.currency}</strong> has been processed.</p>
          <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Refund Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #6b7280;">Amount</td><td style="padding: 8px 0; text-align: right;"><strong>$${data.amount} ${data.currency}</strong></td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Original Payment</td><td style="padding: 8px 0; text-align: right;">${data.originalPaymentId}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Refund ID</td><td style="padding: 8px 0; text-align: right; font-family: monospace;">${data.refundId}</td></tr>
            </table>
          </div>
          <p>The refund should appear in your account within 5-10 business days.</p>
          <p style="color: #6b7280; font-size: 14px;">Advancia PayLedger</p>
        </div>
      </div>`,
    text: `Refund Processed\n\nHi ${data.customerName || 'there'},\nYour refund of $${data.amount} ${data.currency} has been processed.\nRefund ID: ${data.refundId}\n\nAdvancia PayLedger`,
  }),

  invoice_sent: (data) => ({
    subject: `Invoice #${data.invoiceNumber} - $${data.amount}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #0d9488; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">New Invoice</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <p>Hi ${data.customerName || 'there'},</p>
          <p>You have a new invoice for <strong>$${data.amount} ${data.currency}</strong>.</p>
          <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Invoice Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #6b7280;">Invoice Number</td><td style="padding: 8px 0; text-align: right;">#${data.invoiceNumber}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Amount Due</td><td style="padding: 8px 0; text-align: right;"><strong>$${data.amount} ${data.currency}</strong></td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Due Date</td><td style="padding: 8px 0; text-align: right;">${data.dueDate}</td></tr>
            </table>
          </div>
          ${data.hostedInvoiceUrl ? `<div style="text-align: center; margin: 20px 0;"><a href="${data.hostedInvoiceUrl}" style="display: inline-block; background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Pay Invoice</a></div>` : ''}
          <p style="color: #6b7280; font-size: 14px;">Advancia PayLedger</p>
        </div>
      </div>`,
    text: `Invoice #${data.invoiceNumber}\n\nHi ${data.customerName || 'there'},\nAmount Due: $${data.amount} ${data.currency}\nDue Date: ${data.dueDate}\n\nAdvancia PayLedger`,
  }),

  appointment_confirmed: (data) => ({
    subject: `Appointment Confirmed - ${data.date} at ${data.time}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #0d9488; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Appointment Confirmed</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <p>Hi ${data.patientName || 'there'},</p>
          <p>Your appointment has been confirmed!</p>
          <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Appointment Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #6b7280;">Provider</td><td style="padding: 8px 0; text-align: right;"><strong>${data.providerName}</strong></td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Specialty</td><td style="padding: 8px 0; text-align: right;">${data.specialty || 'General'}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Date</td><td style="padding: 8px 0; text-align: right;">${data.date}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Time</td><td style="padding: 8px 0; text-align: right;">${data.time}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Duration</td><td style="padding: 8px 0; text-align: right;">${data.duration} minutes</td></tr>
            </table>
          </div>
          <p>Please arrive 10 minutes early.</p>
          <p style="color: #6b7280; font-size: 14px;">Advancia PayLedger</p>
        </div>
      </div>`,
    text: `Appointment Confirmed\n\nProvider: ${data.providerName}\nDate: ${data.date}\nTime: ${data.time}\nDuration: ${data.duration} min\n\nAdvancia PayLedger`,
  }),

  appointment_cancelled: (data) => ({
    subject: `Appointment Cancelled - ${data.date}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc2626; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Appointment Cancelled</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <p>Hi ${data.patientName || 'there'},</p>
          <p>Your appointment has been cancelled.</p>
          <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #6b7280;">Provider</td><td style="padding: 8px 0; text-align: right;">${data.providerName}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Date</td><td style="padding: 8px 0; text-align: right;">${data.date}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Time</td><td style="padding: 8px 0; text-align: right;">${data.time}</td></tr>
              ${data.reason ? `<tr><td style="padding: 8px 0; color: #6b7280;">Reason</td><td style="padding: 8px 0; text-align: right;">${data.reason}</td></tr>` : ''}
            </table>
          </div>
          ${data.refunded ? '<p>A refund has been processed and should appear within 5-10 business days.</p>' : ''}
          <p>To reschedule, please visit our portal or contact us.</p>
          <p style="color: #6b7280; font-size: 14px;">Advancia PayLedger</p>
        </div>
      </div>`,
    text: `Appointment Cancelled\n\nProvider: ${data.providerName}\nDate: ${data.date}\nTime: ${data.time}\n${data.reason ? `Reason: ${data.reason}` : ''}\n\nAdvancia PayLedger`,
  }),

  appointment_reminder: (data) => ({
    subject: `Reminder: Appointment Tomorrow - ${data.time}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #2563eb; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Appointment Reminder</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <p>Hi ${data.patientName || 'there'},</p>
          <p>Reminder: you have an appointment <strong>tomorrow</strong>.</p>
          <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #6b7280;">Provider</td><td style="padding: 8px 0; text-align: right;"><strong>${data.providerName}</strong></td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Date</td><td style="padding: 8px 0; text-align: right;">${data.date}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Time</td><td style="padding: 8px 0; text-align: right;">${data.time}</td></tr>
            </table>
          </div>
          <p>Please remember to arrive 10 minutes early with your ID and insurance card.</p>
          ${data.portalUrl ? `<p><a href="${data.portalUrl}" style="color: #0d9488;">Reschedule</a></p>` : ''}
          <p style="color: #6b7280; font-size: 14px;">Advancia PayLedger</p>
        </div>
      </div>`,
    text: `Appointment Reminder\n\nProvider: ${data.providerName}\nDate: ${data.date}\nTime: ${data.time}\n\nPlease arrive 10 min early.\n\nAdvancia PayLedger`,
  }),

  security_password_changed: (data) => ({
    subject: 'Security Alert: Your password was changed',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc2626; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Security Alert</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <p>Hi ${data.name || 'there'},</p>
          <p>Your account password was changed on <strong>${data.date}</strong> at <strong>${data.time}</strong>.</p>
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>If this wasn't you:</strong></p>
            <ol><li>Reset your password immediately</li><li>Review your account activity</li><li>Enable two-factor authentication</li></ol>
          </div>
          <p>Device: ${data.device || 'Unknown'}</p>
          <p>Location: ${data.location || 'Unknown'}</p>
          <p style="color: #6b7280; font-size: 14px;">Advancia PayLedger Security Team</p>
        </div>
      </div>`,
    text: `Security Alert: Password Changed\n\nHi ${data.name || 'there'},\nPassword changed on ${data.date} at ${data.time}.\nDevice: ${data.device || 'Unknown'}\nLocation: ${data.location || 'Unknown'}\n\nAdvancia PayLedger Security Team`,
  }),

  security_email_changed: (data) => ({
    subject: 'Security Alert: Email change requested',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f59e0b; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Email Change Request</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <p>Hi ${data.name || 'there'},</p>
          <p>A request was made to change your email from <strong>${data.oldEmail}</strong> to <strong>${data.newEmail}</strong>.</p>
          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>If this was you:</strong> Check your new email for a confirmation link.</p>
            <p style="margin: 10px 0 0;"><strong>If not:</strong> Change your password immediately.</p>
          </div>
          <p>Request time: ${data.date} at ${data.time}</p>
          <p style="color: #6b7280; font-size: 14px;">Advancia PayLedger Security Team</p>
        </div>
      </div>`,
    text: `Email Change Requested\n\nFrom: ${data.oldEmail}\nTo: ${data.newEmail}\n\nAdvancia PayLedger Security Team`,
  }),

  security_new_login: (data) => ({
    subject: 'Security Alert: New login to your account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #0d9488; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">New Login Detected</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <p>Hi ${data.name || 'there'},</p>
          <p>We detected a new login to your account.</p>
          <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #6b7280;">Time</td><td style="padding: 8px 0; text-align: right;">${data.date} at ${data.time}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Device</td><td style="padding: 8px 0; text-align: right;">${data.device || 'Unknown'}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Location</td><td style="padding: 8px 0; text-align: right;">${data.location || 'Unknown'}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">IP</td><td style="padding: 8px 0; text-align: right; font-family: monospace;">${data.ipAddress || 'Unknown'}</td></tr>
            </table>
          </div>
          <p>If this wasn't you, <a href="${data.securityUrl || '#'}" style="color: #dc2626;">secure your account</a> immediately.</p>
          <p style="color: #6b7280; font-size: 14px;">Advancia PayLedger Security Team</p>
        </div>
      </div>`,
    text: `New Login Detected\n\nDevice: ${data.device || 'Unknown'}\nLocation: ${data.location || 'Unknown'}\nIP: ${data.ipAddress || 'Unknown'}\n\nAdvancia PayLedger Security Team`,
  }),

  security_mfa_enabled: (data) => ({
    subject: 'Two-factor authentication enabled',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #059669; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">2FA Enabled</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <p>Hi ${data.name || 'there'},</p>
          <p>Two-factor authentication has been <strong>enabled</strong> on your account.</p>
          <div style="background-color: #ecfdf5; border-left: 4px solid #059669; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;">Your account is now more secure!</p>
          </div>
          <p><strong>Important:</strong> Keep your recovery codes in a safe place.</p>
          <p style="color: #6b7280; font-size: 14px;">Advancia PayLedger Security Team</p>
        </div>
      </div>`,
    text: `2FA Enabled\n\nHi ${data.name || 'there'},\nTwo-factor authentication is now active.\nKeep your recovery codes safe.\n\nAdvancia PayLedger Security Team`,
  }),
};

// ── Main ──

async function main() {
  const templateNames = ONLY_TEMPLATE ? [ONLY_TEMPLATE] : Object.keys(templates);

  console.log(`
╔══════════════════════════════════════════════════╗
║     Advancia PayLedger - Email Template Test      ║
╠══════════════════════════════════════════════════╣
║  Mode:       ${(DRY_RUN ? 'Dry Run (render only)' : `Send to ${SEND_TO}`).padEnd(35)}║
║  Templates:  ${String(templateNames.length).padEnd(35)}║
╚══════════════════════════════════════════════════╝
  `);

  // Output directory for rendered HTML previews
  const outDir = join(process.cwd(), 'temp_email_previews');
  mkdirSync(outDir, { recursive: true });

  let resend: Resend | null = null;
  if (!DRY_RUN) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('ERROR: RESEND_API_KEY not set in .env');
      process.exit(1);
    }
    resend = new Resend(apiKey);
  }

  const fromEmail = process.env.EMAIL_FROM || 'Advancia PayLedger <noreply@advanciapayledger.com>';
  let passed = 0;
  let failed = 0;

  for (const name of templateNames) {
    const templateFn = templates[name];
    const data = sampleData[name];

    if (!templateFn || !data) {
      console.log(`  SKIP  ${name} — no template or sample data`);
      continue;
    }

    try {
      const rendered = templateFn(data);

      // Write HTML preview
      const htmlPath = join(outDir, `${name}.html`);
      writeFileSync(htmlPath, rendered.html);

      if (DRY_RUN) {
        console.log(`  ✅  ${name.padEnd(30)} → ${htmlPath}`);
        console.log(`      Subject: ${rendered.subject}`);
        passed++;
      } else {
        // Actually send via Resend
        const { data: result, error } = await resend!.emails.send({
          from: fromEmail,
          to: [SEND_TO],
          subject: `[TEST] ${rendered.subject}`,
          html: rendered.html,
          text: rendered.text,
        });

        if (error) {
          console.log(`  ❌  ${name.padEnd(30)} — ${error.message}`);
          failed++;
        } else {
          console.log(`  ✅  ${name.padEnd(30)} → sent (id: ${result?.id})`);
          passed++;
        }

        // Small delay to avoid rate limits
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (err: any) {
      console.log(`  ❌  ${name.padEnd(30)} — ${err.message}`);
      failed++;
    }
  }

  console.log(`
╔══════════════════════════════════════════════════╗
║                    SUMMARY                        ║
╠══════════════════════════════════════════════════╣
  Passed: ${passed}
  Failed: ${failed}
  Total:  ${templateNames.length}
${DRY_RUN ? `\n  HTML previews saved to: ${outDir}` : ''}
╚══════════════════════════════════════════════════╝
  `);

  // Clean exit
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Email template test failed:', err);
  process.exit(1);
});
