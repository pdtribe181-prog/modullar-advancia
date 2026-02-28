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

// Custom CircuitBreakerError class for the mock
class MockCircuitBreakerError extends Error {
  constructor(service: string) {
    super(`Circuit breaker OPEN for service "${service}" — request blocked`);
    this.name = 'CircuitBreakerError';
  }
}

const mockExecute = jest.fn<any>().mockImplementation((fn: any) => fn());

jest.unstable_mockModule('../utils/circuit-breaker.js', () => ({
  twilioBreaker: { execute: mockExecute },
  CircuitBreakerError: MockCircuitBreakerError,
  stripeBreaker: { execute: (fn: any) => fn() },
  resendBreaker: { execute: (fn: any) => fn() },
  getAllCircuitBreakerStats: () => ({}),
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

  // ────────────────────── normalizePhoneNumber (internal) ──────────────────────

  describe('normalizePhoneNumber – branches via sendSMS', () => {
    it('prepends +1 for a bare 10-digit US number', async () => {
      setTwilioEnv();
      mockCreate.mockResolvedValue({ sid: 'SM_10d', status: 'queued' });

      await sendSMS({ to: '5551234567', template: 'welcome', data: { name: 'T' } });

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ to: '+15551234567' }));
    });

    it('returns short +prefixed phone as-is when < 10 digits', async () => {
      setTwilioEnv();
      mockCreate.mockResolvedValue({ sid: 'SM_sp', status: 'queued' });

      await sendSMS({ to: '+12345', template: 'welcome', data: { name: 'T' } });

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ to: '+12345' }));
    });

    it('prepends + for short digits without + prefix', async () => {
      setTwilioEnv();
      mockCreate.mockResolvedValue({ sid: 'SM_sd', status: 'queued' });

      await sendSMS({ to: '12345', template: 'welcome', data: { name: 'T' } });

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ to: '+12345' }));
    });
  });

  // ────────────────────── maskPhoneNumber (internal) ──────────────────────

  describe('maskPhoneNumber – short-number branch', () => {
    it('handles phone with fewer than 4 digits gracefully', async () => {
      clearTwilioEnv();
      const result = await sendSMS({ to: '12', template: 'welcome', data: { name: 'T' } });
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('dev-mode');
    });

    it('masks very short phone via sendRawSMS', async () => {
      clearTwilioEnv();
      const result = await sendRawSMS('5', 'Hello');
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

  // ────────────────────── Circuit Breaker ──────────────────────

  describe('sendSMS – circuit breaker', () => {
    it('returns service unavailable when circuit breaker is open', async () => {
      setTwilioEnv();
      mockExecute.mockRejectedValueOnce(new MockCircuitBreakerError('twilio'));

      const result = await sendSMS({
        to: '+15559999999',
        template: 'welcome',
        data: { name: 'CBtest' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Service temporarily unavailable');
    });
  });

  describe('sendRawSMS – circuit breaker', () => {
    it('returns service unavailable when circuit breaker is open', async () => {
      setTwilioEnv();
      mockExecute.mockRejectedValueOnce(new MockCircuitBreakerError('twilio'));

      const result = await sendRawSMS('+15559999999', 'Test message');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Service temporarily unavailable');
    });
  });

  // ────────────────────── isValidPhoneNumber edge cases ──────────────────────

  describe('isValidPhoneNumber – additional edge cases', () => {
    it('returns true for number with country code prefix', () => {
      expect(isValidPhoneNumber('+12125551234')).toBe(true);
    });

    it('returns false for empty string', () => {
      expect(isValidPhoneNumber('')).toBe(false);
    });

    it('returns false for non-numeric string', () => {
      expect(isValidPhoneNumber('not-a-number')).toBe(false);
    });

    it('returns true for 11-digit number', () => {
      expect(isValidPhoneNumber('15551234567')).toBe(true);
    });
  });
});
