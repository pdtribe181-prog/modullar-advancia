/**
 * SMS Notification Service
 * Handles sending SMS messages via Twilio
 */

import twilio from 'twilio';
import { logger } from '../middleware/logging.middleware.js';
import { twilioBreaker, CircuitBreakerError } from '../utils/circuit-breaker.js';

// Lazy initialization for Twilio client
let _twilioClient: twilio.Twilio | null = null;

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

function getTwilioConfig(): TwilioConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (accountSid && authToken && fromNumber) {
    return { accountSid, authToken, fromNumber };
  }
  return null;
}

function getTwilioClient(): twilio.Twilio | null {
  if (_twilioClient !== null) {
    return _twilioClient;
  }

  const config = getTwilioConfig();
  if (config) {
    _twilioClient = twilio(config.accountSid, config.authToken);
  }
  return _twilioClient;
}

export function isSMSConfigured(): boolean {
  return getTwilioConfig() !== null;
}

// SMS templates for different notification types
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

interface SendSMSParams {
  to: string;
  template: string;
  data?: Record<string, unknown>;
}

interface SendSMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send SMS using Twilio
 */
export async function sendSMS({ to, template, data = {} }: SendSMSParams): Promise<SendSMSResult> {
  try {
    const templateFn = smsTemplates[template];
    if (!templateFn) {
      logger.error('SMS template not found', undefined, { template });
      return { success: false, error: `Template not found: ${template}` };
    }

    const message = templateFn(data);
    const client = getTwilioClient();
    const config = getTwilioConfig();

    if (client && config) {
      try {
        const result = await twilioBreaker.execute(() =>
          client.messages.create({
            body: message,
            to: normalizePhoneNumber(to),
            from: config.fromNumber,
          })
        );

        logger.info('SMS sent via Twilio', {
          template,
          to: maskPhoneNumber(to),
          sid: result.sid,
          status: result.status,
        });

        return { success: true, messageId: result.sid };
      } catch (cbError) {
        if (cbError instanceof CircuitBreakerError) {
          logger.warn('SMS circuit breaker OPEN — skipping send', { template, to: maskPhoneNumber(to) });
          return { success: false, error: 'Service temporarily unavailable' };
        }
        throw cbError;
      }
    }

    // Fallback: log SMS for development
    logger.debug('SMS queued (Twilio not configured)', {
      template,
      to: maskPhoneNumber(to),
      message: message.slice(0, 50) + '...',
    });

    return { success: true, messageId: 'dev-mode' };
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to send SMS', err, { template, to: maskPhoneNumber(to) });
    return { success: false, error: err.message };
  }
}

/**
 * Send raw SMS message (not using template)
 */
export async function sendRawSMS(to: string, message: string): Promise<SendSMSResult> {
  try {
    const client = getTwilioClient();
    const config = getTwilioConfig();

    if (client && config) {
      try {
        const result = await twilioBreaker.execute(() =>
          client.messages.create({
            body: message,
            to: normalizePhoneNumber(to),
            from: config.fromNumber,
          })
        );

        logger.info('Raw SMS sent', { to: maskPhoneNumber(to), sid: result.sid });
        return { success: true, messageId: result.sid };
      } catch (cbError) {
        if (cbError instanceof CircuitBreakerError) {
          logger.warn('Raw SMS circuit breaker OPEN — skipping send', { to: maskPhoneNumber(to) });
          return { success: false, error: 'Service temporarily unavailable' };
        }
        throw cbError;
      }
    }

    logger.debug('Raw SMS queued (Twilio not configured)', {
      to: maskPhoneNumber(to),
      message: message.slice(0, 50) + '...',
    });
    return { success: true, messageId: 'dev-mode' };
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to send raw SMS', err, { to: maskPhoneNumber(to) });
    return { success: false, error: err.message };
  }
}

/**
 * Send security alert via SMS
 */
export async function sendSecuritySMS(
  phone: string,
  type: 'password_changed' | 'email_changed' | 'new_login' | 'mfa_enabled' | 'mfa_disabled',
  data: Record<string, unknown> = {}
): Promise<SendSMSResult> {
  return sendSMS({
    to: phone,
    template: `security_${type}`,
    data: {
      ...data,
      date: data.date || new Date().toLocaleDateString(),
      time: data.time || new Date().toLocaleTimeString(),
    },
  });
}

/**
 * Send OTP verification code
 */
export async function sendOTPSMS(
  phone: string,
  code: string,
  expiresIn = 10
): Promise<SendSMSResult> {
  return sendSMS({
    to: phone,
    template: 'otp_verification',
    data: { code, expiresIn: String(expiresIn) },
  });
}

/**
 * Send payment notification
 */
export async function sendPaymentSMS(
  phone: string,
  type: 'received' | 'failed',
  data: { amount: number; currency?: string; transactionId?: string; reason?: string }
): Promise<SendSMSResult> {
  return sendSMS({
    to: phone,
    template: type === 'received' ? 'payment_received' : 'payment_failed',
    data,
  });
}

/**
 * Send appointment notification
 */
export async function sendAppointmentSMS(
  phone: string,
  type: 'reminder' | 'confirmed' | 'cancelled',
  data: { providerName: string; date?: string; time?: string; reason?: string }
): Promise<SendSMSResult> {
  return sendSMS({
    to: phone,
    template: `appointment_${type}`,
    data,
  });
}

// Helper functions

/**
 * Normalize phone number to E.164 format
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If it's a US number without country code, add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If it already has country code
  if (digits.length > 10) {
    return `+${digits}`;
  }

  // Return as-is if already formatted
  if (phone.startsWith('+')) {
    return phone;
  }

  return `+${digits}`;
}

/**
 * Mask phone number for logging (show last 4 digits)
 */
function maskPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 4) {
    return `***${digits.slice(-4)}`;
  }
  return '***';
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

/**
 * Get SMS delivery status from Twilio
 */
export async function getSMSStatus(
  messageSid: string
): Promise<{ status: string; error?: string }> {
  try {
    const client = getTwilioClient();
    if (!client) {
      return { status: 'unknown', error: 'Twilio not configured' };
    }

    const message = await client.messages(messageSid).fetch();
    return { status: message.status };
  } catch (error) {
    const err = error as Error;
    return { status: 'error', error: err.message };
  }
}

export default {
  sendSMS,
  sendRawSMS,
  sendSecuritySMS,
  sendOTPSMS,
  sendPaymentSMS,
  sendAppointmentSMS,
  isValidPhoneNumber,
  isSMSConfigured,
  getSMSStatus,
};
