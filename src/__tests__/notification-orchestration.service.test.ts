/**
 * Notification Orchestration Service Tests
 * Tests: sendNotification, getUserPreferences, getNotificationStatus,
 * getDeliveryAnalytics, Zod schema validation
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ── Mocks ──

const mockSetCache = jest.fn<any>();
const mockGetCache = jest.fn<any>();
const mockFrom = jest.fn<any>();
const mockServiceFrom = jest.fn<any>();
const mockSendEmail = jest.fn<any>();
const mockSendRawSMS = jest.fn<any>();

jest.unstable_mockModule('../lib/supabase.js', () => ({
  supabase: { from: mockFrom },
  createServiceClient: () => ({ from: mockServiceFrom }),
}));

jest.unstable_mockModule('../lib/redis.js', () => ({
  redisHelpers: {
    setCache: mockSetCache,
    getCache: mockGetCache,
    deleteCache: jest.fn(),
    incrementCounter: jest.fn<any>().mockResolvedValue(1),
  },
}));

jest.unstable_mockModule('../middleware/logging.middleware.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.unstable_mockModule('../services/email.service.js', () => ({
  sendEmail: mockSendEmail,
}));

jest.unstable_mockModule('../services/sms.service.js', () => ({
  sendRawSMS: mockSendRawSMS,
}));

const {
  NotificationOrchestrationService,
  NotificationRequest,
  UserPreferences,
  notificationOrchestrationService,
} = await import('../services/notification-orchestration.service.js');

// ── Helpers ──

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

function validNotificationRequest(overrides: Record<string, any> = {}) {
  return {
    userId: TEST_USER_ID,
    templateId: 'appointment_reminder',
    channel: 'email' as const,
    priority: 'normal' as const,
    enableFallback: true,
    enableTracking: true,
    data: { appointmentDate: '2026-03-15' },
    ...overrides,
  };
}

function dbChain(data: any = null, error: any = null) {
  const chain: any = {};
  chain.select = jest.fn<any>().mockReturnValue(chain);
  chain.eq = jest.fn<any>().mockReturnValue(chain);
  chain.single = jest.fn<any>().mockResolvedValue({ data, error });
  chain.order = jest.fn<any>().mockReturnValue(chain);
  chain.limit = jest.fn<any>().mockResolvedValue({ data: data ? [data] : [], error });
  chain.insert = jest.fn<any>().mockResolvedValue({ data, error });
  chain.upsert = jest.fn<any>().mockResolvedValue({ data, error });
  return chain;
}

// ── Tests ──

describe('NotificationOrchestrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(dbChain());
    mockServiceFrom.mockReturnValue(dbChain());
    mockSetCache.mockResolvedValue(undefined);
    mockGetCache.mockResolvedValue(null);
    mockSendEmail.mockResolvedValue({ success: true, messageId: 'msg_email_1' });
    mockSendRawSMS.mockResolvedValue({ success: true, messageId: 'msg_sms_1' });
  });

  describe('Zod schemas', () => {
    it('NotificationRequest validates a correct request', () => {
      const result = NotificationRequest.safeParse(validNotificationRequest());
      expect(result.success).toBe(true);
    });

    it('NotificationRequest rejects non-UUID userId', () => {
      const result = NotificationRequest.safeParse(
        validNotificationRequest({ userId: 'not-uuid' })
      );
      expect(result.success).toBe(false);
    });

    it('NotificationRequest defaults channel to auto', () => {
      const input = { userId: TEST_USER_ID, templateId: 'test' };
      const result = NotificationRequest.parse(input);
      expect(result.channel).toBe('auto');
    });

    it('NotificationRequest defaults priority to normal', () => {
      const input = { userId: TEST_USER_ID, templateId: 'test' };
      const result = NotificationRequest.parse(input);
      expect(result.priority).toBe('normal');
    });

    it('NotificationRequest rejects invalid channel', () => {
      const result = NotificationRequest.safeParse(
        validNotificationRequest({ channel: 'carrier_pigeon' })
      );
      expect(result.success).toBe(false);
    });

    it('UserPreferences validates correct preferences', () => {
      const result = UserPreferences.safeParse({
        email: { enabled: true, frequency: 'daily' },
        sms: { enabled: false },
        timezone: 'America/Chicago',
      });
      expect(result.success).toBe(true);
    });

    it('UserPreferences accepts HH:MM format for quiet hours', () => {
      // The regex ^\d{2}:\d{2}$ validates format only, not valid hours
      const result = UserPreferences.safeParse({
        email: { quietHoursStart: '22:00', quietHoursEnd: '07:00' },
      });
      expect(result.success).toBe(true);
    });

    it('UserPreferences rejects non-HH:MM quiet hours format', () => {
      const result = UserPreferences.safeParse({
        email: { quietHoursStart: 'midnight' },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('sendNotification', () => {
    it('returns a NotificationResult with expected shape', async () => {
      const result = await notificationOrchestrationService.sendNotification(
        validNotificationRequest()
      );

      expect(result).toEqual(
        expect.objectContaining({
          success: expect.any(Boolean),
          notificationId: expect.any(String),
          channel: expect.any(String),
        })
      );
    });

    it('notificationId starts with expected prefix', async () => {
      const result = await notificationOrchestrationService.sendNotification(
        validNotificationRequest()
      );

      expect(result.notificationId).toMatch(/^notif_/);
    });

    it('returns failure on invalid request', async () => {
      const result = await notificationOrchestrationService.sendNotification({
        userId: 'bad',
        templateId: '',
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('caches notification state in Redis', async () => {
      await notificationOrchestrationService.sendNotification(validNotificationRequest());

      expect(mockSetCache).toHaveBeenCalled();
    });
  });

  describe('getUserPreferences', () => {
    it('returns cached preferences from Redis', async () => {
      const cachedPrefs = { email: { enabled: true }, timezone: 'UTC' };
      mockGetCache.mockResolvedValue(cachedPrefs);

      const result = await notificationOrchestrationService.getUserPreferences(TEST_USER_ID);

      // Zod schema may add defaults (e.g., frequency), so check subset
      expect(result.email?.enabled).toBe(true);
      expect(result.timezone).toBe('UTC');
    });

    it('falls back to database when cache misses', async () => {
      mockGetCache.mockResolvedValue(null);
      const dbPrefs = { email: { enabled: false }, timezone: 'US/Eastern' };
      mockFrom.mockReturnValue(dbChain({ preferences: dbPrefs }));

      const result = await notificationOrchestrationService.getUserPreferences(TEST_USER_ID);

      // Should have attempted DB fetch
      expect(mockFrom).toHaveBeenCalledWith('user_notification_preferences');
    });

    it('returns defaults when not found anywhere', async () => {
      mockGetCache.mockResolvedValue(null);
      mockFrom.mockReturnValue(dbChain(null));

      const result = await notificationOrchestrationService.getUserPreferences(TEST_USER_ID);

      expect(result).toBeDefined();
      expect(result.timezone).toBeDefined();
    });

    it('handles errors gracefully', async () => {
      mockGetCache.mockRejectedValue(new Error('Redis down'));

      const result = await notificationOrchestrationService.getUserPreferences(TEST_USER_ID);

      // Should return defaults
      expect(result).toBeDefined();
    });
  });

  describe('getNotificationStatus', () => {
    it('returns cached status from Redis', async () => {
      const state = { id: 'notif_123', status: 'delivered', channel: 'email' };
      mockGetCache.mockResolvedValue(state);

      const result = await notificationOrchestrationService.getNotificationStatus('notif_123');

      expect(result).toEqual(state);
    });

    it('falls back to database when cache misses', async () => {
      mockGetCache.mockResolvedValue(null);
      const dbState = { id: 'notif_456', status: 'processing' };
      mockServiceFrom.mockReturnValue(dbChain(dbState));

      const result = await notificationOrchestrationService.getNotificationStatus('notif_456');

      // Uses createServiceClient(), so check mockServiceFrom
      expect(mockServiceFrom).toHaveBeenCalledWith('notification_delivery_log');
    });

    it('returns null when not found', async () => {
      mockGetCache.mockResolvedValue(null);
      mockFrom.mockReturnValue(dbChain(null));

      const result = await notificationOrchestrationService.getNotificationStatus('notif_missing');

      expect(result).toBeNull();
    });

    it('returns null on error', async () => {
      mockGetCache.mockRejectedValue(new Error('fail'));

      const result = await notificationOrchestrationService.getNotificationStatus('notif_err');

      expect(result).toBeNull();
    });
  });

  describe('getDeliveryAnalytics', () => {
    it('returns analytics from database', async () => {
      const analyticsData = [
        { channel: 'email', status: 'delivered', count: 100 },
        { channel: 'sms', status: 'failed', count: 5 },
      ];
      mockServiceFrom.mockReturnValue({
        select: jest.fn<any>().mockReturnValue({
          order: jest.fn<any>().mockReturnValue({
            limit: jest.fn<any>().mockResolvedValue({ data: analyticsData, error: null }),
          }),
        }),
      });

      const result = await notificationOrchestrationService.getDeliveryAnalytics();

      expect(result).toBeDefined();
    });

    it('handles errors gracefully', async () => {
      mockServiceFrom.mockReturnValue({
        select: jest.fn<any>().mockReturnValue({
          order: jest.fn<any>().mockReturnValue({
            limit: jest.fn<any>().mockRejectedValue(new Error('boom')),
          }),
        }),
      });

      const result = await notificationOrchestrationService.getDeliveryAnalytics();

      expect(result).toBeDefined();
    });
  });

  describe('singleton', () => {
    it('exports a NotificationOrchestrationService instance', () => {
      expect(notificationOrchestrationService).toBeInstanceOf(NotificationOrchestrationService);
    });
  });
});
