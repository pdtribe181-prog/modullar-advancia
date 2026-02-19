/**
 * SMS Service Tests
 * Tests for Twilio-based SMS notification service
 */

import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals';

// ── mocks (must be before any imports from the module under test) ──

const mockCreate = jest.fn<any>();
const mockFetch = jest.fn<any>();

jest.unstable_mockModule('twilio', () => {
  const clientFactory: any = () => ({
    messages: Object.assign(() => ({ fetch: mockFetch }), {
      create: mockCreate,
    }),
  });
  clientFactory.default = clientFactory;
  clientFactory.Twilio = class {};
  return { default: clientFactory, __esModule: true };
});

jest.unstable_mockModule('../middleware/logging.middleware.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// ── import after mocks ──

const {
  sendSMS,
  sendRawSMS,
  sendSecuritySMS,
  sendOTPSMS,
  sendPaymentSMS,
  sendAppointmentSMS,
  isValidPhoneNumber,
  isSMSConfigured,
  getSMSStatus,
} = await import('../services/sms.service.js');

// ── tests ──

describe('sms.service', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  // Helper to configure twilio env vars
  function setTwilioEnv() {
    process.env.TWILIO_ACCOUNT_SID = 'AC_test_sid';
    process.env.TWILIO_AUTH_TOKEN = 'test_auth_token';
    process.env.TWILIO_PHONE_NUMBER = '+15551234567';
  }

  function clearTwilioEnv() {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_PHONE_NUMBER;
  }

  // ────────────────────── isSMSConfigured ──────────────────────

  describe('isSMSConfigured', () => {
    it('returns false when env vars are missing', () => {
      clearTwilioEnv();
      expect(isSMSConfigured()).toBe(false);
    });

    it('returns true when all env vars are present', () => {
      setTwilioEnv();
      expect(isSMSConfigured()).toBe(true);
    });
  });

  // ────────────────────── sendSMS ──────────────────────

  describe('sendSMS', () => {
    it('returns error for unknown template', async () => {
      const result = await sendSMS({
        to: '+15559999999',
        template: 'nonexistent_template',
        data: {},
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Template not found');
    });

    it('sends via Twilio when configured', async () => {
      setTwilioEnv();
      mockCreate.mockResolvedValue({ sid: 'SM_test_sid', status: 'queued' });

      const result = await sendSMS({
        to: '+15559999999',
        template: 'welcome',
        data: { name: 'Alice' },
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('SM_test_sid');
    });

    it('returns success with dev-mode when Twilio not configured', async () => {
      clearTwilioEnv();
      const result = await sendSMS({
        to: '+15559999999',
        template: 'welcome',
        data: { name: 'Bob' },
      });
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('dev-mode');
    });

    it('returns error when Twilio call throws', async () => {
      setTwilioEnv();
      mockCreate.mockRejectedValue(new Error('Twilio error'));

      const result = await sendSMS({
        to: '+15559999999',
        template: 'welcome',
        data: {},
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Twilio error');
    });
  });

  // ────────────────────── sendRawSMS ──────────────────────

  describe('sendRawSMS', () => {
    it('sends a raw message with Twilio', async () => {
      setTwilioEnv();
      mockCreate.mockResolvedValue({ sid: 'SM_raw_sid' });

      const result = await sendRawSMS('+15559999999', 'Test message');
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('SM_raw_sid');
    });

    it('falls back to dev-mode without Twilio', async () => {
      clearTwilioEnv();
      const result = await sendRawSMS('+15559999999', 'Test message');
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('dev-mode');
    });

    it('returns error on exception', async () => {
      setTwilioEnv();
      mockCreate.mockRejectedValue(new Error('network down'));

      const result = await sendRawSMS('+15559999999', 'Test message');
      expect(result.success).toBe(false);
      expect(result.error).toBe('network down');
    });
  });

  // ────────────────────── sendSecuritySMS ──────────────────────

  describe('sendSecuritySMS', () => {
    it('delegates to sendSMS with security_password_changed template', async () => {
      clearTwilioEnv();
      const result = await sendSecuritySMS('+15559999999', 'password_changed', {});
      expect(result.success).toBe(true);
    });

    it('delegates to sendSMS with security_new_login template', async () => {
      clearTwilioEnv();
      const result = await sendSecuritySMS('+15559999999', 'new_login', {
        device: 'Chrome',
        location: 'New York',
      });
      expect(result.success).toBe(true);
    });
  });

  // ────────────────────── sendOTPSMS ──────────────────────

  describe('sendOTPSMS', () => {
    it('sends OTP with default expiry', async () => {
      clearTwilioEnv();
      const result = await sendOTPSMS('+15559999999', '123456');
      expect(result.success).toBe(true);
    });

    it('sends OTP with custom expiry', async () => {
      clearTwilioEnv();
      const result = await sendOTPSMS('+15559999999', '654321', 5);
      expect(result.success).toBe(true);
    });
  });

  // ────────────────────── sendPaymentSMS ──────────────────────

  describe('sendPaymentSMS', () => {
    it('sends payment received notification', async () => {
      clearTwilioEnv();
      const result = await sendPaymentSMS('+15559999999', 'received', {
        amount: 100,
        currency: 'USD',
        transactionId: 'txn_123',
      });
      expect(result.success).toBe(true);
    });

    it('sends payment failed notification', async () => {
      clearTwilioEnv();
      const result = await sendPaymentSMS('+15559999999', 'failed', {
        amount: 50,
        reason: 'Insufficient funds',
      });
      expect(result.success).toBe(true);
    });
  });

  // ────────────────────── sendAppointmentSMS ──────────────────────

  describe('sendAppointmentSMS', () => {
    it('sends appointment reminder', async () => {
      clearTwilioEnv();
      const result = await sendAppointmentSMS('+15559999999', 'reminder', {
        providerName: 'Dr. Smith',
        time: '10:00 AM',
      });
      expect(result.success).toBe(true);
    });

    it('sends appointment confirmed', async () => {
      clearTwilioEnv();
      const result = await sendAppointmentSMS('+15559999999', 'confirmed', {
        providerName: 'Dr. Jones',
        date: '2025-01-15',
        time: '2:00 PM',
      });
      expect(result.success).toBe(true);
    });

    it('sends appointment cancelled', async () => {
      clearTwilioEnv();
      const result = await sendAppointmentSMS('+15559999999', 'cancelled', {
        providerName: 'Dr. Jones',
        date: '2025-01-15',
        reason: 'Provider unavailable',
      });
      expect(result.success).toBe(true);
    });
  });

  // ────────────────────── isValidPhoneNumber ──────────────────────

  describe('isValidPhoneNumber', () => {
    it('returns true for 10-digit US number', () => {
      expect(isValidPhoneNumber('5551234567')).toBe(true);
    });

    it('returns true for E.164 formatted number', () => {
      expect(isValidPhoneNumber('+15551234567')).toBe(true);
    });

    it('returns true for international number', () => {
      expect(isValidPhoneNumber('+447911123456')).toBe(true);
    });

    it('returns false for too short number', () => {
      expect(isValidPhoneNumber('12345')).toBe(false);
    });

    it('returns false for too long number', () => {
      expect(isValidPhoneNumber('1234567890123456')).toBe(false);
    });
  });

  // ────────────────────── getSMSStatus ──────────────────────

  describe('getSMSStatus', () => {
    // Note: getTwilioClient() caches the client at module scope. Once a prior
    // test (e.g. sendSMS with setTwilioEnv) creates a client it stays cached,
    // so we can't test the "Twilio not configured" branch after that.

    it('returns message status from Twilio', async () => {
      setTwilioEnv();
      mockFetch.mockResolvedValue({ status: 'delivered' });

      const result = await getSMSStatus('SM_test_sid');
      expect(result.status).toBe('delivered');
    });

    it('returns error on exception', async () => {
      setTwilioEnv();
      mockFetch.mockRejectedValue(new Error('not found'));

      const result = await getSMSStatus('SM_test_sid');
      expect(result.status).toBe('error');
      expect(result.error).toBe('not found');
    });
  });
});
