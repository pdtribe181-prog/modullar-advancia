/**
 * Security Service Tests
 * Tests for security event logging, suspicious activity detection, and notifications
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ── mocks ──

const mockInsert = jest.fn<any>();
const mockSelect = jest.fn<any>();
const mockEq = jest.fn<any>();
const mockIn = jest.fn<any>();
const mockOrder = jest.fn<any>();
const mockLimit = jest.fn<any>();
const mockGte = jest.fn<any>();
const mockSingle = jest.fn<any>();

// Build a chainable query builder
function createChain(terminalValue?: any) {
  const chain: any = {};
  chain.insert = mockInsert.mockReturnValue(chain);
  chain.select = mockSelect.mockReturnValue(chain);
  chain.eq = mockEq.mockReturnValue(chain);
  chain.in = mockIn.mockReturnValue(chain);
  chain.order = mockOrder.mockReturnValue(chain);
  chain.limit = mockLimit.mockReturnValue(chain);
  chain.gte = mockGte.mockReturnValue(chain);
  chain.single = mockSingle.mockReturnValue(terminalValue ?? { data: null, error: null });
  return chain;
}

const mockFrom = jest.fn<any>();

jest.unstable_mockModule('../lib/supabase.js', () => ({
  supabase: { from: mockFrom },
}));

jest.unstable_mockModule('../middleware/logging.middleware.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock email.service sendSecurityNotification
const mockSendSecurityNotification = jest.fn<any>();
jest.unstable_mockModule('../services/email.service.js', () => ({
  sendSecurityNotification: mockSendSecurityNotification,
}));

// ── import after mocks ──

const {
  logSecurityEvent,
  logAndNotify,
  checkSuspiciousActivity,
  getUserSecurityEvents,
  getSecuritySummary,
  extractIPAddress,
} = await import('../services/security.service.js');

// ── tests ──

describe('security.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ────────────── extractIPAddress ──────────────

  describe('extractIPAddress', () => {
    it('extracts x-forwarded-for (first IP)', () => {
      const req = { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } };
      expect(extractIPAddress(req)).toBe('1.2.3.4');
    });

    it('extracts x-real-ip', () => {
      const req = { headers: { 'x-real-ip': '10.0.0.1' } };
      expect(extractIPAddress(req)).toBe('10.0.0.1');
    });

    it('falls back to req.ip', () => {
      const req = { headers: {}, ip: '192.168.1.1' };
      expect(extractIPAddress(req)).toBe('192.168.1.1');
    });

    it('falls back to socket.remoteAddress', () => {
      const req = { headers: {}, socket: { remoteAddress: '127.0.0.1' } };
      expect(extractIPAddress(req)).toBe('127.0.0.1');
    });

    it('prefers x-forwarded-for over x-real-ip', () => {
      const req = {
        headers: { 'x-forwarded-for': '1.1.1.1', 'x-real-ip': '2.2.2.2' },
        ip: '3.3.3.3',
      };
      expect(extractIPAddress(req)).toBe('1.1.1.1');
    });

    it('returns undefined when nothing available', () => {
      const req = { headers: {} };
      expect(extractIPAddress(req)).toBeUndefined();
    });
  });

  // ────────────── logSecurityEvent ──────────────

  describe('logSecurityEvent', () => {
    it('inserts event and returns id on success', async () => {
      const chain = createChain();
      mockFrom.mockReturnValue(chain);
      mockSingle.mockResolvedValue({ data: { id: 'evt_123' }, error: null });

      const result = await logSecurityEvent({
        userId: 'user-abc',
        eventType: 'login',
        ipAddress: '1.2.3.4',
      });

      expect(result).toBe('evt_123');
      expect(mockFrom).toHaveBeenCalledWith('security_events');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-abc',
          event_type: 'login',
          ip_address: '1.2.3.4',
        })
      );
    });

    it('returns null on Supabase error', async () => {
      const chain = createChain();
      mockFrom.mockReturnValue(chain);
      mockSingle.mockResolvedValue({ data: null, error: new Error('DB error') });

      const result = await logSecurityEvent({
        userId: 'user-abc',
        eventType: 'login',
      });

      expect(result).toBeNull();
    });

    it('returns null on exception', async () => {
      mockFrom.mockImplementation(() => {
        throw new Error('fatal');
      });

      const result = await logSecurityEvent({
        userId: 'user-abc',
        eventType: 'login',
      });

      expect(result).toBeNull();
    });
  });

  // ────────────── checkSuspiciousActivity ──────────────

  describe('checkSuspiciousActivity', () => {
    it('returns not suspicious when no events', async () => {
      const chain = createChain();
      mockFrom.mockReturnValue(chain);
      mockLimit.mockResolvedValue({ data: [], error: null });

      const result = await checkSuspiciousActivity('user-abc', '1.2.3.4');
      expect(result.suspicious).toBe(false);
    });

    it('returns not suspicious on DB error', async () => {
      const chain = createChain();
      mockFrom.mockReturnValue(chain);
      mockLimit.mockResolvedValue({ data: null, error: new Error('DB error') });

      const result = await checkSuspiciousActivity('user-abc');
      expect(result.suspicious).toBe(false);
    });

    it('detects multiple failed logins as suspicious', async () => {
      const recentTime = new Date().toISOString();
      const failedEvents = Array(5)
        .fill(null)
        .map(() => ({
          event_type: 'failed_login',
          created_at: recentTime,
          ip_address: '1.2.3.4',
        }));

      const chain = createChain();
      mockFrom.mockReturnValue(chain);
      mockLimit.mockResolvedValue({ data: failedEvents, error: null });

      const result = await checkSuspiciousActivity('user-abc');
      expect(result.suspicious).toBe(true);
      expect(result.reason).toContain('failed login');
    });

    it('detects new IP as suspicious', async () => {
      const recentEvents = [
        { event_type: 'login', created_at: new Date().toISOString(), ip_address: '10.0.0.1' },
        { event_type: 'login', created_at: new Date().toISOString(), ip_address: '10.0.0.1' },
      ];

      const chain = createChain();
      mockFrom.mockReturnValue(chain);
      mockLimit.mockResolvedValue({ data: recentEvents, error: null });

      const result = await checkSuspiciousActivity('user-abc', '99.99.99.99');
      expect(result.suspicious).toBe(true);
      expect(result.reason).toContain('new IP');
    });

    it('returns not suspicious when IP is known', async () => {
      const recentEvents = [
        { event_type: 'login', created_at: new Date().toISOString(), ip_address: '1.2.3.4' },
      ];

      const chain = createChain();
      mockFrom.mockReturnValue(chain);
      mockLimit.mockResolvedValue({ data: recentEvents, error: null });

      const result = await checkSuspiciousActivity('user-abc', '1.2.3.4');
      expect(result.suspicious).toBe(false);
    });

    it('returns not suspicious on exception', async () => {
      mockFrom.mockImplementation(() => {
        throw new Error('crash');
      });

      const result = await checkSuspiciousActivity('user-abc');
      expect(result.suspicious).toBe(false);
    });
  });

  // ────────────── getUserSecurityEvents ──────────────

  describe('getUserSecurityEvents', () => {
    it('returns events for user', async () => {
      const events = [
        { id: '1', event_type: 'login', created_at: '2025-01-15T10:00:00Z' },
        { id: '2', event_type: 'password_changed', created_at: '2025-01-14T10:00:00Z' },
      ];

      const chain = createChain();
      mockFrom.mockReturnValue(chain);
      mockLimit.mockResolvedValue({ data: events, error: null });

      const result = await getUserSecurityEvents('user-abc');
      expect(result).toEqual(events);
    });

    it('returns empty array on error', async () => {
      const chain = createChain();
      mockFrom.mockReturnValue(chain);
      mockLimit.mockResolvedValue({ data: null, error: new Error('DB error') });

      const result = await getUserSecurityEvents('user-abc');
      expect(result).toEqual([]);
    });

    it('filters by event types when provided', async () => {
      // Build a fully chainable mock where .limit() returns the chain, not the terminal
      const innerChain: any = {};
      innerChain.select = jest.fn<any>().mockReturnValue(innerChain);
      innerChain.eq = jest.fn<any>().mockReturnValue(innerChain);
      innerChain.order = jest.fn<any>().mockReturnValue(innerChain);
      innerChain.limit = jest.fn<any>().mockReturnValue(innerChain);
      innerChain.in = jest.fn<any>().mockReturnValue(Promise.resolve({ data: [], error: null }));
      mockFrom.mockReturnValue(innerChain);

      await getUserSecurityEvents('user-abc', {
        types: ['login', 'password_changed'],
        limit: 5,
      });

      expect(innerChain.in).toHaveBeenCalledWith('event_type', ['login', 'password_changed']);
    });
  });

  // ────────────── getSecuritySummary ──────────────

  describe('getSecuritySummary', () => {
    it('returns summary with counts', async () => {
      const events = [
        { event_type: 'login', created_at: new Date().toISOString() },
        { event_type: 'login', created_at: new Date().toISOString() },
        { event_type: 'failed_login', created_at: new Date().toISOString() },
        { event_type: 'mfa_enabled', created_at: new Date().toISOString() },
        {
          event_type: 'password_changed',
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ];

      // First query: events
      const chain1 = createChain();
      // Second query: checkSuspiciousActivity
      const chain2 = createChain();

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return chain1;
        return chain2;
      });

      // First call returns events, second returns empty for suspicious check
      mockOrder.mockImplementation(function (this: any) {
        return this;
      });

      // Use different mock behavior for first vs second query
      let limitCallCount = 0;
      mockLimit.mockImplementation(() => {
        limitCallCount++;
        if (limitCallCount === 1) {
          // getSecuritySummary main query - no limit on this one actually
          return { data: [], error: null };
        }
        return { data: [], error: null };
      });

      // The first query uses .order() as terminal
      mockOrder.mockReturnValueOnce({ data: events, error: null }).mockReturnValue(chain2);

      mockLimit.mockResolvedValue({ data: [], error: null });

      const result = await getSecuritySummary('user-abc');

      expect(result).toHaveProperty('recentLogins');
      expect(result).toHaveProperty('failedLogins');
      expect(result).toHaveProperty('mfaEnabled');
      expect(result).toHaveProperty('lastPasswordChange');
      expect(result).toHaveProperty('suspiciousActivity');
    });
  });

  // ────────────── logAndNotify ──────────────

  describe('logAndNotify', () => {
    it('logs event and sends notification for password_changed', async () => {
      // Mock logSecurityEvent chain
      const chain = createChain();
      mockFrom.mockReturnValue(chain);
      mockSingle.mockResolvedValue({ data: { id: 'evt_1' }, error: null });
      mockSendSecurityNotification.mockResolvedValue({ email: true, sms: false });

      await logAndNotify(
        {
          userId: 'user-abc',
          eventType: 'password_changed',
          ipAddress: '1.2.3.4',
        },
        {
          email: 'user@test.com',
          name: 'Alice',
          preferences: { emailNotifications: true },
        }
      );

      expect(mockFrom).toHaveBeenCalledWith('security_events');
      expect(mockSendSecurityNotification).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'user@test.com' }),
        'password_changed',
        expect.any(Object)
      );
    });

    it('skips notification for non-mapped event types', async () => {
      const chain = createChain();
      mockFrom.mockReturnValue(chain);
      mockSingle.mockResolvedValue({ data: { id: 'evt_2' }, error: null });

      await logAndNotify(
        {
          userId: 'user-abc',
          eventType: 'logout',
        },
        {
          email: 'user@test.com',
          preferences: { emailNotifications: true },
        }
      );

      // logSecurityEvent should be called, but not sendSecurityNotification
      expect(mockFrom).toHaveBeenCalled();
      expect(mockSendSecurityNotification).not.toHaveBeenCalled();
    });

    it('respects user preference to skip notification', async () => {
      const chain = createChain();
      mockFrom.mockReturnValue(chain);
      mockSingle.mockResolvedValue({ data: { id: 'evt_3' }, error: null });

      await logAndNotify(
        {
          userId: 'user-abc',
          eventType: 'login',
        },
        {
          email: 'user@test.com',
          preferences: {
            notifyOnLogin: false,
            notifyOnNewDevice: false,
          },
        }
      );

      // Even though login is a mapped event, the preference says no
      // Actually the shouldSendNotification function checks
      // notifyOnLogin !== false || notifyOnNewDevice !== false
      // Both false => shouldNotify = false
      expect(mockSendSecurityNotification).not.toHaveBeenCalled();
    });

    it('sends notification for email_changed event', async () => {
      const chain = createChain();
      mockFrom.mockReturnValue(chain);
      mockSingle.mockResolvedValue({ data: { id: 'evt_4' }, error: null });
      mockSendSecurityNotification.mockResolvedValue({ email: true, sms: false });

      await logAndNotify(
        {
          userId: 'user-abc',
          eventType: 'email_changed',
          ipAddress: '1.2.3.4',
        },
        {
          email: 'user@test.com',
          name: 'Alice',
          preferences: { notifyOnEmailChange: true },
        }
      );

      expect(mockSendSecurityNotification).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'user@test.com' }),
        'email_changed',
        expect.any(Object)
      );
    });

    it('always sends notification for mfa_enabled event', async () => {
      const chain = createChain();
      mockFrom.mockReturnValue(chain);
      mockSingle.mockResolvedValue({ data: { id: 'evt_5' }, error: null });
      mockSendSecurityNotification.mockResolvedValue({ email: true, sms: false });

      await logAndNotify(
        {
          userId: 'user-abc',
          eventType: 'mfa_enabled',
        },
        {
          email: 'user@test.com',
          preferences: {},
        }
      );

      expect(mockSendSecurityNotification).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'user@test.com' }),
        'mfa_enabled',
        expect.any(Object)
      );
    });

    it('always sends notification for mfa_disabled event', async () => {
      const chain = createChain();
      mockFrom.mockReturnValue(chain);
      mockSingle.mockResolvedValue({ data: { id: 'evt_6' }, error: null });
      mockSendSecurityNotification.mockResolvedValue({ email: true, sms: false });

      await logAndNotify(
        {
          userId: 'user-abc',
          eventType: 'mfa_disabled',
        },
        {
          email: 'user@test.com',
          preferences: {},
        }
      );

      expect(mockSendSecurityNotification).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'user@test.com' }),
        'mfa_disabled',
        expect.any(Object)
      );
    });

    it('parses iPhone user agent in notification data', async () => {
      const chain = createChain();
      mockFrom.mockReturnValue(chain);
      mockSingle.mockResolvedValue({ data: { id: 'evt_7' }, error: null });
      mockSendSecurityNotification.mockResolvedValue({ email: true, sms: false });

      await logAndNotify(
        {
          userId: 'user-abc',
          eventType: 'login',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) Mobile/15E148',
          ipAddress: '5.5.5.5',
        },
        {
          email: 'user@test.com',
          preferences: { notifyOnLogin: true },
        }
      );

      expect(mockSendSecurityNotification).toHaveBeenCalledWith(
        expect.any(Object),
        'new_login',
        expect.objectContaining({ device: 'iPhone' })
      );
    });

    it('parses Android user agent in notification data', async () => {
      const chain = createChain();
      mockFrom.mockReturnValue(chain);
      mockSingle.mockResolvedValue({ data: { id: 'evt_8' }, error: null });
      mockSendSecurityNotification.mockResolvedValue({ email: true, sms: false });

      await logAndNotify(
        {
          userId: 'user-abc',
          eventType: 'login',
          userAgent: 'Mozilla/5.0 (Linux; Android 12; Pixel 6) Mobile Safari/537.36',
          ipAddress: '5.5.5.5',
        },
        {
          email: 'user@test.com',
          preferences: { notifyOnLogin: true },
        }
      );

      expect(mockSendSecurityNotification).toHaveBeenCalledWith(
        expect.any(Object),
        'new_login',
        expect.objectContaining({ device: 'Android Device' })
      );
    });

    it('parses Windows user agent in notification data', async () => {
      const chain = createChain();
      mockFrom.mockReturnValue(chain);
      mockSingle.mockResolvedValue({ data: { id: 'evt_9' }, error: null });
      mockSendSecurityNotification.mockResolvedValue({ email: true, sms: false });

      await logAndNotify(
        {
          userId: 'user-abc',
          eventType: 'password_changed',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        {
          email: 'user@test.com',
          preferences: { notifyOnPasswordChange: true },
        }
      );

      expect(mockSendSecurityNotification).toHaveBeenCalledWith(
        expect.any(Object),
        'password_changed',
        expect.objectContaining({ device: 'Windows PC' })
      );
    });

    it('parses Mac user agent in notification data', async () => {
      const chain = createChain();
      mockFrom.mockReturnValue(chain);
      mockSingle.mockResolvedValue({ data: { id: 'evt_10' }, error: null });
      mockSendSecurityNotification.mockResolvedValue({ email: true, sms: false });

      await logAndNotify(
        {
          userId: 'user-abc',
          eventType: 'password_changed',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        {
          email: 'user@test.com',
          preferences: { notifyOnPasswordChange: true },
        }
      );

      expect(mockSendSecurityNotification).toHaveBeenCalledWith(
        expect.any(Object),
        'password_changed',
        expect.objectContaining({ device: 'Mac' })
      );
    });

    it('parses Linux user agent in notification data', async () => {
      const chain = createChain();
      mockFrom.mockReturnValue(chain);
      mockSingle.mockResolvedValue({ data: { id: 'evt_11' }, error: null });
      mockSendSecurityNotification.mockResolvedValue({ email: true, sms: false });

      await logAndNotify(
        {
          userId: 'user-abc',
          eventType: 'password_changed',
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        },
        {
          email: 'user@test.com',
          preferences: { notifyOnPasswordChange: true },
        }
      );

      expect(mockSendSecurityNotification).toHaveBeenCalledWith(
        expect.any(Object),
        'password_changed',
        expect.objectContaining({ device: 'Linux PC' })
      );
    });

    it('formats location data in notification', async () => {
      const chain = createChain();
      mockFrom.mockReturnValue(chain);
      mockSingle.mockResolvedValue({ data: { id: 'evt_12' }, error: null });
      mockSendSecurityNotification.mockResolvedValue({ email: true, sms: false });

      await logAndNotify(
        {
          userId: 'user-abc',
          eventType: 'login',
          ipAddress: '1.2.3.4',
          location: { city: 'New York', region: 'NY', country: 'US' },
        },
        {
          email: 'user@test.com',
          preferences: { notifyOnLogin: true },
        }
      );

      expect(mockSendSecurityNotification).toHaveBeenCalledWith(
        expect.any(Object),
        'new_login',
        expect.objectContaining({ location: 'New York, NY, US' })
      );
    });

    it('formats location with partial data', async () => {
      const chain = createChain();
      mockFrom.mockReturnValue(chain);
      mockSingle.mockResolvedValue({ data: { id: 'evt_13' }, error: null });
      mockSendSecurityNotification.mockResolvedValue({ email: true, sms: false });

      await logAndNotify(
        {
          userId: 'user-abc',
          eventType: 'login',
          ipAddress: '1.2.3.4',
          location: { country: 'US' },
        },
        {
          email: 'user@test.com',
          preferences: { notifyOnLogin: true },
        }
      );

      expect(mockSendSecurityNotification).toHaveBeenCalledWith(
        expect.any(Object),
        'new_login',
        expect.objectContaining({ location: 'US' })
      );
    });

    it('returns Unknown Location when location is empty', async () => {
      const chain = createChain();
      mockFrom.mockReturnValue(chain);
      mockSingle.mockResolvedValue({ data: { id: 'evt_14' }, error: null });
      mockSendSecurityNotification.mockResolvedValue({ email: true, sms: false });

      await logAndNotify(
        {
          userId: 'user-abc',
          eventType: 'login',
          ipAddress: '1.2.3.4',
          location: {},
        },
        {
          email: 'user@test.com',
          preferences: { notifyOnLogin: true },
        }
      );

      expect(mockSendSecurityNotification).toHaveBeenCalledWith(
        expect.any(Object),
        'new_login',
        expect.objectContaining({ location: 'Unknown Location' })
      );
    });

    it('parses generic Mobile user agent', async () => {
      const chain = createChain();
      mockFrom.mockReturnValue(chain);
      mockSingle.mockResolvedValue({ data: { id: 'evt_15' }, error: null });
      mockSendSecurityNotification.mockResolvedValue({ email: true, sms: false });

      await logAndNotify(
        {
          userId: 'user-abc',
          eventType: 'login',
          userAgent: 'Mozilla/5.0 Mobile Safari/604.1',
        },
        {
          email: 'user@test.com',
          preferences: { notifyOnLogin: true },
        }
      );

      expect(mockSendSecurityNotification).toHaveBeenCalledWith(
        expect.any(Object),
        'new_login',
        expect.objectContaining({ device: 'Mobile Device' })
      );
    });

    it('falls back to Unknown Device for unrecognized user agent', async () => {
      const chain = createChain();
      mockFrom.mockReturnValue(chain);
      mockSingle.mockResolvedValue({ data: { id: 'evt_16' }, error: null });
      mockSendSecurityNotification.mockResolvedValue({ email: true, sms: false });

      await logAndNotify(
        {
          userId: 'user-abc',
          eventType: 'login',
          userAgent: 'SomeRandomBot/1.0',
        },
        {
          email: 'user@test.com',
          preferences: { notifyOnLogin: true },
        }
      );

      expect(mockSendSecurityNotification).toHaveBeenCalledWith(
        expect.any(Object),
        'new_login',
        expect.objectContaining({ device: 'Unknown Device' })
      );
    });

    it('uses default notification rule for unmapped event types with emailNotifications', async () => {
      const chain = createChain();
      mockFrom.mockReturnValue(chain);
      mockSingle.mockResolvedValue({ data: { id: 'evt_17' }, error: null });

      await logAndNotify(
        {
          userId: 'user-abc',
          eventType: 'failed_login',
        },
        {
          email: 'user@test.com',
          preferences: { emailNotifications: true },
        }
      );

      // failed_login is not in the notificationMap, so sendSecurityNotification should NOT be called
      // (even though shouldSendNotification returns true, findNotificationType is null)
      expect(mockSendSecurityNotification).not.toHaveBeenCalled();
    });
  });
});
