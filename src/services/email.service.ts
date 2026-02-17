/**
 * Email Notification Service
 * Handles sending transactional emails for payment events using Resend
 */

import { Resend } from 'resend';

// Initialize Resend client
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.EMAIL_FROM || 'Healthcare Portal <noreply@healthcare-portal.com>';

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
          
          ${data.hostedInvoiceUrl ? `
          <div style="text-align: center; margin: 20px 0;">
            <a href="${data.hostedInvoiceUrl}" style="display: inline-block; background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Pay Invoice</a>
          </div>
          ` : ''}
          
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
              ${data.reason ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Reason</td>
                <td style="padding: 8px 0; text-align: right;">${data.reason}</td>
              </tr>
              ` : ''}
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
};

/**
 * Send email using Resend
 */
export async function sendEmail({ to, template, data }: SendEmailParams): Promise<boolean> {
  try {
    const templateFn = templates[template];
    if (!templateFn) {
      console.error(`Email template not found: ${template}`);
      return false;
    }

    const email = templateFn(data);
    
    // If Resend is configured, send the email
    if (resend) {
      const { data: result, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject: email.subject,
        html: email.html,
        text: email.text,
      });

      if (error) {
        console.error('Resend error:', error);
        return false;
      }

      console.log(`📧 Email sent via Resend: ${template} to ${to} (ID: ${result?.id})`);
      return true;
    }

    // Fallback: just log the email if Resend is not configured
    console.log(`📧 Email queued (no provider): ${template} to ${to}`);
    console.log(`   Subject: ${email.subject}`);
    console.log('   ⚠️  Set RESEND_API_KEY to enable email delivery');
    
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
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

export default {
  sendEmail,
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendRefundEmail,
  sendInvoiceEmail,
  sendAppointmentConfirmedEmail,
  sendAppointmentCancelledEmail,
  sendAppointmentReminderEmail,
};
