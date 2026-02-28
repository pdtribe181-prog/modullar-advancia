/**
 * Webhook Idempotency Tests
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockSetCache = jest.fn<any>();
const mockGetCache = jest.fn<any>();

jest.unstable_mockModule('../lib/redis.js', () => ({
  redisHelpers: {
    setCache: mockSetCache,
    getCache: mockGetCache,
  },
}));

jest.unstable_mockModule('../middleware/logging.middleware.js', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { isWebhookProcessed, markWebhookProcessed } =
  await import('../utils/webhook-idempotency.js');

describe('Webhook Idempotency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false for unprocessed events', async () => {
    mockGetCache.mockResolvedValue(null);
    const result = await isWebhookProcessed('evt_new');
    expect(result).toBe(false);
    expect(mockGetCache).toHaveBeenCalledWith('webhook:processed:evt_new');
  });

  it('returns true for already-processed events', async () => {
    mockGetCache.mockResolvedValue('ok');
    const result = await isWebhookProcessed('evt_old');
    expect(result).toBe(true);
  });

  it('marks event as processed with 24h TTL', async () => {
    mockSetCache.mockResolvedValue(undefined);
    await markWebhookProcessed('evt_123');
    expect(mockSetCache).toHaveBeenCalledWith('webhook:processed:evt_123', 'ok', 86400);
  });

  it('returns false when Redis is down (fail-open)', async () => {
    mockGetCache.mockRejectedValue(new Error('Connection refused'));
    const result = await isWebhookProcessed('evt_fail');
    expect(result).toBe(false);
  });

  it('silently handles mark failure (Redis down)', async () => {
    mockSetCache.mockRejectedValue(new Error('Connection refused'));
    await expect(markWebhookProcessed('evt_fail')).resolves.toBeUndefined();
  });
});
