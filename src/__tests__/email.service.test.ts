/**
 * Email Service Tests
 * Tests for Resend-based email notification service
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ── mocks ──

const mockResendSend = jest.fn<any>();

jest.unstable_mockModule('resend', () => ({
  Resend: class {
    emails = { send: mockResendSend };
  },
}));

jest.unstable_mockModule('../config/env.js', () => ({
  getEnv: () => ({
    RESEND_API_KEY: 'test-key',
    EMAIL_FROM: 'noreply@advancia.test',
  }),
  isEmailConfigured: () => true,
}));

jest.unstable_mockModule('../middleware/logging.middleware.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// SMS mock for sendSecurityNotification which imports sms.service
const mockSendSMS = jest.fn<any>();
const mockSendSecuritySMS = jest.fn<any>();

jest.unstable_mockModule('../services/sms.service.js', () => ({
  sendSMS: mockSendSMS,
  sendSecuritySMS: mockSendSecuritySMS,
  default: {
    sendSMS: mockSendSMS,
    sendSecuritySMS: mockSendSecuritySMS,
  },
}));

// ── import after mocks ──

const {
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
  sendSecurityNotification,
} = await import('../services/email.service.js');

const { resendBreaker } = await import('../utils/circuit-breaker.js');

// ── tests ──

describe('email.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResendSend.mockResolvedValue({ data: { id: 'email_123' }, error: null });
    mockSendSecuritySMS.mockResolvedValue({ success: true });
  });

  // ────────────── sendEmail ──────────────

  describe('sendEmail', () => {
    it('sends email via Resend when configured', async () => {
      const result = await sendEmail({
        to: 'user@test.com',
        template: 'payment_succeeded',
        data: {
          amount: 100,
          currency: 'USD',
          transactionId: 'txn_abc',
          date: '2025-01-15',
        },
      });

      expect(result).toBe(true);
      expect(mockResendSend).toHaveBeenCalledTimes(1);
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@advancia.test',
          to: ['user@test.com'],
          subject: expect.stringContaining('Payment Confirmation'),
        })
      );
    });

    it('returns false for unknown template', async () => {
      const result = await sendEmail({
        to: 'user@test.com',
        template: 'nonexistent_template',
        data: {},
      });
      expect(result).toBe(false);
      expect(mockResendSend).not.toHaveBeenCalled();
    });

    it('returns false when Resend returns an error', async () => {
      mockResendSend.mockResolvedValue({ data: null, error: new Error('send failed') });
      const result = await sendEmail({
        to: 'user@test.com',
        template: 'payment_succeeded',
        data: { amount: 50, currency: 'USD', transactionId: 'txn_x', date: '2025-01-01' },
      });
      expect(result).toBe(false);
    });

    it('returns false when Resend throws an exception', async () => {
      mockResendSend.mockRejectedValue(new Error('network error'));
      const result = await sendEmail({
        to: 'user@test.com',
        template: 'payment_succeeded',
        data: { amount: 50, currency: 'USD', transactionId: 'txn_x', date: '2025-01-01' },
      });
      expect(result).toBe(false);
    });
  });

  // ────────────── Payment emails ──────────────

  describe('sendPaymentSuccessEmail', () => {
    it('sends payment success email', async () => {
      const result = await sendPaymentSuccessEmail('user@test.com', {
        amount: 99.99,
        currency: 'USD',
        transactionId: 'txn_123',
        customerName: 'Alice',
      });
      expect(result).toBe(true);
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('99.99'),
        })
      );
    });
  });

  describe('sendPaymentFailedEmail', () => {
    it('sends payment failed email', async () => {
      const result = await sendPaymentFailedEmail('user@test.com', {
        amount: 50,
        currency: 'USD',
        reason: 'Card declined',
      });
      expect(result).toBe(true);
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Failed'),
        })
      );
    });
  });

  describe('sendRefundEmail', () => {
    it('sends refund processed email', async () => {
      const result = await sendRefundEmail('user@test.com', {
        amount: 25,
        currency: 'USD',
        originalPaymentId: 'pi_orig',
        refundId: 're_123',
      });
      expect(result).toBe(true);
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Refund'),
        })
      );
    });
  });

  describe('sendInvoiceEmail', () => {
    it('sends invoice email', async () => {
      const result = await sendInvoiceEmail('user@test.com', {
        amount: 200,
        currency: 'USD',
        invoiceNumber: 'INV-001',
        dueDate: '2025-02-01',
      });
      expect(result).toBe(true);
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Invoice'),
        })
      );
    });

    it('includes hostedInvoiceUrl link when provided', async () => {
      const result = await sendInvoiceEmail('user@test.com', {
        amount: 200,
        currency: 'USD',
        invoiceNumber: 'INV-002',
        dueDate: '2025-02-01',
        hostedInvoiceUrl: 'https://pay.stripe.com/inv_abc',
      });
      expect(result).toBe(true);
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('https://pay.stripe.com/inv_abc'),
        })
      );
    });
  });

  // ────────────── Appointment emails ──────────────

  describe('sendAppointmentConfirmedEmail', () => {
    it('sends appointment confirmation', async () => {
      const result = await sendAppointmentConfirmedEmail('user@test.com', {
        providerName: 'Dr. Smith',
        date: '2025-01-20',
        time: '10:00 AM',
        duration: 30,
      });
      expect(result).toBe(true);
    });
  });

  describe('sendAppointmentCancelledEmail', () => {
    it('sends appointment cancellation', async () => {
      const result = await sendAppointmentCancelledEmail('user@test.com', {
        providerName: 'Dr. Jones',
        date: '2025-01-20',
        time: '2:00 PM',
        reason: 'Provider unavailable',
      });
      expect(result).toBe(true);
    });
  });

  describe('sendAppointmentReminderEmail', () => {
    it('sends appointment reminder', async () => {
      const result = await sendAppointmentReminderEmail('user@test.com', {
        providerName: 'Dr. Smith',
        date: '2025-01-21',
        time: '10:00 AM',
      });
      expect(result).toBe(true);
    });
  });

  // ────────────── Security alert emails ──────────────

  describe('sendPasswordChangedAlert', () => {
    it('sends password changed alert', async () => {
      const result = await sendPasswordChangedAlert('user@test.com', {
        name: 'Alice',
        date: '2025-01-15',
        time: '3:00 PM',
        device: 'Chrome on Windows',
        ipAddress: '1.2.3.4',
      });
      expect(result).toBe(true);
    });
  });

  describe('sendEmailChangeAlert', () => {
    it('sends email change alert', async () => {
      const result = await sendEmailChangeAlert('old@test.com', {
        name: 'Bob',
        date: '2025-01-15',
        time: '4:00 PM',
        oldEmail: 'old@test.com',
        newEmail: 'new@test.com',
      });
      expect(result).toBe(true);
    });
  });

  describe('sendNewLoginAlert', () => {
    it('sends new login alert', async () => {
      const result = await sendNewLoginAlert('user@test.com', {
        name: 'Charlie',
        date: '2025-01-15',
        time: '5:00 PM',
        device: 'iPhone',
        location: 'New York, US',
      });
      expect(result).toBe(true);
    });
  });

  describe('sendMFAEnabledAlert', () => {
    it('sends MFA enabled alert', async () => {
      const result = await sendMFAEnabledAlert('user@test.com', { name: 'Dana' });
      expect(result).toBe(true);
    });
  });

  // ────────────── sendSecurityNotification (combined) ──────────────

  describe('sendSecurityNotification', () => {
    it('sends both email and SMS when user has both and SMS enabled', async () => {
      const result = await sendSecurityNotification(
        {
          email: 'user@test.com',
          phone: '+15551234567',
          name: 'Alice',
          preferences: { emailNotifications: true, smsNotifications: true },
        },
        'password_changed',
        { date: '2025-01-15', time: '3:00 PM' }
      );

      expect(result.email).toBe(true);
      expect(result.sms).toBe(true);
      expect(mockResendSend).toHaveBeenCalledTimes(1);
      expect(mockSendSecuritySMS).toHaveBeenCalledTimes(1);
    });

    it('sends only email when SMS not enabled', async () => {
      const result = await sendSecurityNotification(
        {
          email: 'user@test.com',
          phone: '+15551234567',
          name: 'Bob',
          preferences: { emailNotifications: true, smsNotifications: false },
        },
        'new_login'
      );

      expect(result.email).toBe(true);
      expect(result.sms).toBe(false);
      expect(mockSendSecuritySMS).not.toHaveBeenCalled();
    });

    it('sends nothing when email notifications disabled and no phone', async () => {
      const result = await sendSecurityNotification(
        {
          email: 'user@test.com',
          preferences: { emailNotifications: false },
        },
        'mfa_enabled'
      );

      expect(result.email).toBe(false);
      expect(result.sms).toBe(false);
    });

    it('sends email only when no phone provided', async () => {
      const result = await sendSecurityNotification(
        { email: 'user@test.com', name: 'Charlie' },
        'password_changed'
      );

      expect(result.email).toBe(true);
      expect(result.sms).toBe(false);
    });
  });

  // ────────────── Circuit breaker integration ──────────────

  describe('circuit breaker integration', () => {
    afterAll(() => {
      resendBreaker.reset();
    });

    it('returns false when circuit breaker is open (CircuitBreakerError)', async () => {
      resendBreaker.reset();
      mockResendSend.mockRejectedValue(new Error('service down'));

      // Trip the breaker (failureThreshold = 3)
      await sendEmail({
        to: 'x@test.com',
        template: 'payment_succeeded',
        data: { amount: 1, currency: 'USD', transactionId: 'tx_1', date: '2025-01-01' },
      });
      await sendEmail({
        to: 'x@test.com',
        template: 'payment_succeeded',
        data: { amount: 1, currency: 'USD', transactionId: 'tx_1', date: '2025-01-01' },
      });
      await sendEmail({
        to: 'x@test.com',
        template: 'payment_succeeded',
        data: { amount: 1, currency: 'USD', transactionId: 'tx_1', date: '2025-01-01' },
      });

      // 4th call: breaker is OPEN → CircuitBreakerError caught → returns false
      const result = await sendEmail({
        to: 'x@test.com',
        template: 'payment_succeeded',
        data: { amount: 1, currency: 'USD', transactionId: 'tx_1', date: '2025-01-01' },
      });
      expect(result).toBe(false);
    });
  });
});
