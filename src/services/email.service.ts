/**
 * Email Notification Service
 * Handles sending transactional emails for payment events using Resend
 */

import { Resend } from 'resend';
import { getEnv, isEmailConfigured } from '../config/env.js';
import { logger } from '../middleware/logging.middleware.js';
import { resendBreaker, CircuitBreakerError } from '../utils/circuit-breaker.js';

// Lazy initialization for Resend client
let _resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (_resend !== null) {
    return _resend;
  }
  const env = getEnv();
  if (isEmailConfigured()) {
    _resend = new Resend(env.RESEND_API_KEY!);
  }
  return _resend;
}

function getFromEmail(): string {
  return getEnv().EMAIL_FROM;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface SendEmailParams {
  to: string;
  template: string;
  data: Record<string, any>;
}

// Email templates for different notification types
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
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Amount</td>
                <td style="padding: 8px 0; text-align: right;"><strong>$${data.amount} ${data.currency}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Description</td>
                <td style="padding: 8px 0; text-align: right;">${data.description || 'Payment'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Date</td>
                <td style="padding: 8px 0; text-align: right;">${data.date}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Transaction ID</td>
                <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px;">${data.transactionId}</td>
              </tr>
            </table>
          </div>

          ${data.receiptUrl ? `<p><a href="${data.receiptUrl}" style="color: #0d9488;">View Receipt</a></p>` : ''}

          <p>Thank you for your payment!</p>
          <p style="color: #6b7280; font-size: 14px;">Advancia PayLedger</p>
        </div>
      </div>
    `,
    text: `
Payment Confirmed

Hi ${data.customerName || 'there'},

Your payment of $${data.amount} ${data.currency} has been successfully processed.

Payment Details:
- Amount: $${data.amount} ${data.currency}
- Description: ${data.description || 'Payment'}
- Date: ${data.date}
- Transaction ID: ${data.transactionId}

${data.receiptUrl ? `View Receipt: ${data.receiptUrl}` : ''}

Thank you for your payment!
Advancia PayLedger
    `,
  }),

  payment_failed: (data) => ({
    subject: `Payment Failed - Action Required`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc2626; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Payment Failed</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <p>Hi ${data.customerName || 'there'},</p>
          <p>Unfortunately, your payment of <strong>$${data.amount} ${data.currency}</strong> could not be processed.</p>

          <div style="background-color: #fef2f2; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3 style="margin-top: 0; color: #dc2626;">Reason</h3>
            <p style="margin-bottom: 0;">${data.reason || 'Your payment method was declined.'}</p>
          </div>

          <p><strong>What you can do:</strong></p>
          <ul>
            <li>Check your payment details and try again</li>
            <li>Use a different payment method</li>
            <li>Contact your bank if the issue persists</li>
          </ul>

          <p style="color: #6b7280; font-size: 14px;">Advancia PayLedger</p>
        </div>
      </div>
    `,
    text: `
Payment Failed

Hi ${data.customerName || 'there'},

Unfortunately, your payment of $${data.amount} ${data.currency} could not be processed.

Reason: ${data.reason || 'Your payment method was declined.'}

What you can do:
- Check your payment details and try again
- Use a different payment method
- Contact your bank if the issue persists

Advancia PayLedger
    `,
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
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Amount Refunded</td>
                <td style="padding: 8px 0; text-align: right;"><strong>$${data.amount} ${data.currency}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Original Payment</td>
                <td style="padding: 8px 0; text-align: right;">${data.originalPaymentId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Refund ID</td>
                <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px;">${data.refundId}</td>
              </tr>
            </table>
          </div>

          <p>The refund should appear in your account within 5-10 business days, depending on your bank.</p>

          <p style="color: #6b7280; font-size: 14px;">Advancia PayLedger</p>
        </div>
      </div>
    `,
    text: `
Refund Processed

Hi ${data.customerName || 'there'},

Your refund of $${data.amount} ${data.currency} has been processed.

Refund Details:
- Amount Refunded: $${data.amount} ${data.currency}
- Original Payment: ${data.originalPaymentId}
- Refund ID: ${data.refundId}

The refund should appear in your account within 5-10 business days, depending on your bank.

Advancia PayLedger
    `,
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
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Invoice Number</td>
                <td style="padding: 8px 0; text-align: right;">#${data.invoiceNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Amount Due</td>
                <td style="padding: 8px 0; text-align: right;"><strong>$${data.amount} ${data.currency}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Due Date</td>
                <td style="padding: 8px 0; text-align: right;">${data.dueDate}</td>
              </tr>
            </table>
          </div>

          ${
            data.hostedInvoiceUrl
              ? `
          <div style="text-align: center; margin: 20px 0;">
            <a href="${data.hostedInvoiceUrl}" style="display: inline-block; background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Pay Invoice</a>
          </div>
          `
              : ''
          }

          <p style="color: #6b7280; font-size: 14px;">Advancia PayLedger</p>
        </div>
      </div>
    `,
    text: `
New Invoice

Hi ${data.customerName || 'there'},

You have a new invoice for $${data.amount} ${data.currency}.

Invoice Details:
- Invoice Number: #${data.invoiceNumber}
- Amount Due: $${data.amount} ${data.currency}
- Due Date: ${data.dueDate}

${data.hostedInvoiceUrl ? `Pay Invoice: ${data.hostedInvoiceUrl}` : ''}

Advancia PayLedger
    `,
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
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Provider</td>
                <td style="padding: 8px 0; text-align: right;"><strong>${data.providerName}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Specialty</td>
                <td style="padding: 8px 0; text-align: right;">${data.specialty || 'General'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Date</td>
                <td style="padding: 8px 0; text-align: right;">${data.date}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Time</td>
                <td style="padding: 8px 0; text-align: right;">${data.time}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Duration</td>
                <td style="padding: 8px 0; text-align: right;">${data.duration} minutes</td>
              </tr>
            </table>
          </div>

          <p>Please arrive 10 minutes early for your appointment.</p>
          <p style="color: #6b7280; font-size: 14px;">Advancia PayLedger</p>
        </div>
      </div>
    `,
    text: `
Appointment Confirmed

Hi ${data.patientName || 'there'},

Your appointment has been confirmed!

Appointment Details:
- Provider: ${data.providerName}
- Specialty: ${data.specialty || 'General'}
- Date: ${data.date}
- Time: ${data.time}
- Duration: ${data.duration} minutes

Please arrive 10 minutes early for your appointment.

Advancia PayLedger
    `,
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
            <h3 style="margin-top: 0;">Cancelled Appointment</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Provider</td>
                <td style="padding: 8px 0; text-align: right;">${data.providerName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Date</td>
                <td style="padding: 8px 0; text-align: right;">${data.date}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Time</td>
                <td style="padding: 8px 0; text-align: right;">${data.time}</td>
              </tr>
              ${
                data.reason
                  ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Reason</td>
                <td style="padding: 8px 0; text-align: right;">${data.reason}</td>
              </tr>
              `
                  : ''
              }
            </table>
          </div>

          ${data.refunded ? '<p>A refund has been processed and should appear in your account within 5-10 business days.</p>' : ''}
          <p>To reschedule, please visit our portal or contact us.</p>
          <p style="color: #6b7280; font-size: 14px;">Advancia PayLedger</p>
        </div>
      </div>
    `,
    text: `
Appointment Cancelled

Hi ${data.patientName || 'there'},

Your appointment has been cancelled.

Cancelled Appointment:
- Provider: ${data.providerName}
- Date: ${data.date}
- Time: ${data.time}
${data.reason ? `- Reason: ${data.reason}` : ''}

${data.refunded ? 'A refund has been processed and should appear in your account within 5-10 business days.' : ''}

To reschedule, please visit our portal or contact us.

Advancia PayLedger
    `,
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
          <p>This is a friendly reminder that you have an appointment <strong>tomorrow</strong>.</p>

          <div style="background-color: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Appointment Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Provider</td>
                <td style="padding: 8px 0; text-align: right;"><strong>${data.providerName}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Date</td>
                <td style="padding: 8px 0; text-align: right;">${data.date}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Time</td>
                <td style="padding: 8px 0; text-align: right;">${data.time}</td>
              </tr>
            </table>
          </div>

          <p>Please remember to:</p>
          <ul>
            <li>Arrive 10 minutes early</li>
            <li>Bring your ID and insurance card</li>
            <li>Bring a list of current medications</li>
          </ul>

          <p>Need to reschedule? <a href="${data.portalUrl || '#'}" style="color: #0d9488;">Visit our portal</a></p>
          <p style="color: #6b7280; font-size: 14px;">Advancia PayLedger</p>
        </div>
      </div>
    `,
    text: `
Appointment Reminder

Hi ${data.patientName || 'there'},

This is a friendly reminder that you have an appointment tomorrow.

Appointment Details:
- Provider: ${data.providerName}
- Date: ${data.date}
- Time: ${data.time}

Please remember to:
- Arrive 10 minutes early
- Bring your ID and insurance card
- Bring a list of current medications

Need to reschedule? Visit our portal: ${data.portalUrl || 'https://healthcare-portal.com'}

Advancia PayLedger
    `,
  }),

  // Security notification templates
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
            <ol style="margin: 10px 0;">
              <li>Reset your password immediately</li>
              <li>Review your account activity</li>
              <li>Enable two-factor authentication</li>
            </ol>
          </div>

          <p>Device info: ${data.device || 'Unknown device'}</p>
          <p>Location: ${data.location || 'Unknown location'}</p>

          <p style="color: #6b7280; font-size: 14px;">Advancia PayLedger Security Team</p>
        </div>
      </div>
    `,
    text: `
Security Alert: Password Changed

Hi ${data.name || 'there'},

Your account password was changed on ${data.date} at ${data.time}.

If this wasn't you:
1. Reset your password immediately
2. Review your account activity
3. Enable two-factor authentication

Device: ${data.device || 'Unknown'}
Location: ${data.location || 'Unknown'}

Advancia PayLedger Security Team
    `,
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
          <p>A request was made to change your account email from <strong>${data.oldEmail}</strong> to <strong>${data.newEmail}</strong>.</p>

          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>If this was you:</strong> Check your new email for a confirmation link.</p>
            <p style="margin: 10px 0 0;"><strong>If this wasn't you:</strong> Secure your account immediately by changing your password.</p>
          </div>

          <p>Request time: ${data.date} at ${data.time}</p>

          <p style="color: #6b7280; font-size: 14px;">Advancia PayLedger Security Team</p>
        </div>
      </div>
    `,
    text: `
Security Alert: Email Change Requested

Hi ${data.name || 'there'},

A request was made to change your account email from ${data.oldEmail} to ${data.newEmail}.

If this was you: Check your new email for a confirmation link.
If this wasn't you: Secure your account immediately by changing your password.

Request time: ${data.date} at ${data.time}

Advancia PayLedger Security Team
    `,
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
            <h3 style="margin-top: 0;">Login Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Time</td>
                <td style="padding: 8px 0; text-align: right;">${data.date} at ${data.time}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Device</td>
                <td style="padding: 8px 0; text-align: right;">${data.device || 'Unknown'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Location</td>
                <td style="padding: 8px 0; text-align: right;">${data.location || 'Unknown'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">IP Address</td>
                <td style="padding: 8px 0; text-align: right; font-family: monospace;">${data.ipAddress || 'Unknown'}</td>
              </tr>
            </table>
          </div>

          <p>If this wasn't you, please <a href="${data.securityUrl || '#'}" style="color: #dc2626;">secure your account</a> immediately.</p>

          <p style="color: #6b7280; font-size: 14px;">Advancia PayLedger Security Team</p>
        </div>
      </div>
    `,
    text: `
New Login Detected

Hi ${data.name || 'there'},

We detected a new login to your account.

Login Details:
- Time: ${data.date} at ${data.time}
- Device: ${data.device || 'Unknown'}
- Location: ${data.location || 'Unknown'}
- IP Address: ${data.ipAddress || 'Unknown'}

If this wasn't you, secure your account immediately.

Advancia PayLedger Security Team
    `,
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
            <p style="margin: 0;">Your account is now more secure! You'll need to enter a code from your authenticator app when logging in.</p>
          </div>

          <p><strong>Important:</strong> Keep your recovery codes in a safe place. You'll need them if you lose access to your authenticator app.</p>

          <p style="color: #6b7280; font-size: 14px;">Advancia PayLedger Security Team</p>
        </div>
      </div>
    `,
    text: `
Two-Factor Authentication Enabled

Hi ${data.name || 'there'},

Two-factor authentication has been enabled on your account.

Your account is now more secure! You'll need to enter a code from your authenticator app when logging in.

Important: Keep your recovery codes in a safe place.

Advancia PayLedger Security Team
    `,
  }),
};

/**
 * Send email using Resend
 */
export async function sendEmail({ to, template, data }: SendEmailParams): Promise<boolean> {
  try {
    const templateFn = templates[template];
    if (!templateFn) {
      logger.error(`Email template not found`, undefined, { template });
      return false;
    }

    const email = templateFn(data);
    const resend = getResendClient();

    // If Resend is configured, send the email (via circuit breaker)
    if (resend) {
      try {
        const { data: result, error } = await resendBreaker.execute(() =>
          resend.emails.send({
            from: getFromEmail(),
            to: [to],
            subject: email.subject,
            html: email.html,
            text: email.text,
          })
        );

        if (error) {
          logger.error('Resend email error', error as Error, { template, to });
          return false;
        }

        logger.info('Email sent via Resend', { template, to, id: result?.id });
        return true;
      } catch (cbError) {
        if (cbError instanceof CircuitBreakerError) {
          logger.warn('Email circuit breaker OPEN — skipping send', { template, to });
          return false;
        }
        throw cbError;
      }
    }

    // Fallback: just log the email if Resend is not configured
    logger.debug('Email queued (no provider configured)', { template, to, subject: email.subject });

    return true;
  } catch (error) {
    logger.error('Failed to send email', error as Error, { template, to });
    return false;
  }
}

/**
 * Send payment success notification
 */
export async function sendPaymentSuccessEmail(
  email: string,
  data: {
    amount: number;
    currency: string;
    description?: string;
    transactionId: string;
    receiptUrl?: string;
    customerName?: string;
  }
): Promise<boolean> {
  return sendEmail({
    to: email,
    template: 'payment_succeeded',
    data: {
      ...data,
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    },
  });
}

/**
 * Send payment failure notification
 */
export async function sendPaymentFailedEmail(
  email: string,
  data: {
    amount: number;
    currency: string;
    reason?: string;
    customerName?: string;
  }
): Promise<boolean> {
  return sendEmail({
    to: email,
    template: 'payment_failed',
    data,
  });
}

/**
 * Send refund notification
 */
export async function sendRefundEmail(
  email: string,
  data: {
    amount: number;
    currency: string;
    originalPaymentId: string;
    refundId: string;
    customerName?: string;
  }
): Promise<boolean> {
  return sendEmail({
    to: email,
    template: 'refund_processed',
    data,
  });
}

/**
 * Send invoice notification
 */
export async function sendInvoiceEmail(
  email: string,
  data: {
    amount: number;
    currency: string;
    invoiceNumber: string;
    dueDate: string;
    hostedInvoiceUrl?: string;
    customerName?: string;
  }
): Promise<boolean> {
  return sendEmail({
    to: email,
    template: 'invoice_sent',
    data,
  });
}

/**
 * Send appointment confirmation notification
 */
export async function sendAppointmentConfirmedEmail(
  email: string,
  data: {
    patientName?: string;
    providerName: string;
    specialty?: string;
    date: string;
    time: string;
    duration: number;
  }
): Promise<boolean> {
  return sendEmail({
    to: email,
    template: 'appointment_confirmed',
    data,
  });
}

/**
 * Send appointment cancellation notification
 */
export async function sendAppointmentCancelledEmail(
  email: string,
  data: {
    patientName?: string;
    providerName: string;
    date: string;
    time: string;
    reason?: string;
    refunded?: boolean;
  }
): Promise<boolean> {
  return sendEmail({
    to: email,
    template: 'appointment_cancelled',
    data,
  });
}

/**
 * Send appointment reminder notification
 */
export async function sendAppointmentReminderEmail(
  email: string,
  data: {
    patientName?: string;
    providerName: string;
    date: string;
    time: string;
    portalUrl?: string;
  }
): Promise<boolean> {
  return sendEmail({
    to: email,
    template: 'appointment_reminder',
    data,
  });
}

// ============================================================
// SECURITY NOTIFICATION FUNCTIONS
// ============================================================

interface SecurityNotificationData {
  name?: string;
  date: string;
  time: string;
  device?: string;
  location?: string;
  ipAddress?: string;
}

/**
 * Send password changed security alert
 */
export async function sendPasswordChangedAlert(
  email: string,
  data: SecurityNotificationData
): Promise<boolean> {
  return sendEmail({
    to: email,
    template: 'security_password_changed',
    data,
  });
}

/**
 * Send email change security alert (to old email)
 */
export async function sendEmailChangeAlert(
  email: string,
  data: SecurityNotificationData & { oldEmail: string; newEmail: string }
): Promise<boolean> {
  return sendEmail({
    to: email,
    template: 'security_email_changed',
    data,
  });
}

/**
 * Send new login security alert
 */
export async function sendNewLoginAlert(
  email: string,
  data: SecurityNotificationData & { securityUrl?: string }
): Promise<boolean> {
  return sendEmail({
    to: email,
    template: 'security_new_login',
    data,
  });
}

/**
 * Send MFA enabled notification
 */
export async function sendMFAEnabledAlert(
  email: string,
  data: { name?: string }
): Promise<boolean> {
  return sendEmail({
    to: email,
    template: 'security_mfa_enabled',
    data,
  });
}

// ============================================================
// SMS NOTIFICATION FUNCTIONS
// Delegated to the dedicated sms.service.ts (Twilio integration)
// ============================================================

import { sendSMS, sendSecuritySMS } from './sms.service.js';

/**
 * Send combined email + SMS security notification
 * Respects user's notification preferences
 */
export async function sendSecurityNotification(
  user: {
    email?: string;
    phone?: string;
    name?: string;
    preferences?: {
      emailNotifications?: boolean;
      smsNotifications?: boolean;
    };
  },
  type: 'password_changed' | 'email_changed' | 'new_login' | 'mfa_enabled' | 'mfa_disabled',
  data: Record<string, any> = {}
): Promise<{ email: boolean; sms: boolean }> {
  const results = { email: false, sms: false };
  const notificationData = {
    ...data,
    name: user.name,
    date: data.date || new Date().toLocaleDateString(),
    time: data.time || new Date().toLocaleTimeString(),
  };

  // Send email if enabled
  if (user.email && user.preferences?.emailNotifications !== false) {
    const emailTemplate = `security_${type}`;
    results.email = await sendEmail({
      to: user.email,
      template: emailTemplate,
      data: notificationData,
    });
  }

  // Send SMS if enabled and phone available (delegates to sms.service)
  if (user.phone && user.preferences?.smsNotifications === true) {
    const smsResult = await sendSecuritySMS(user.phone, type, notificationData);
    results.sms = smsResult.success;
  }

  return results;
}

export { sendSMS, sendSecuritySMS };

export default {
  sendEmail,
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendRefundEmail,
  sendInvoiceEmail,
  sendAppointmentConfirmedEmail,
  sendAppointmentCancelledEmail,
  sendAppointmentReminderEmail,
  sendPasswordChangedAlert,
  sendEmailChangeAlert,
  sendNewLoginAlert,
  sendMFAEnabledAlert,
  sendSMS,
  sendSecuritySMS,
  sendSecurityNotification,
};
