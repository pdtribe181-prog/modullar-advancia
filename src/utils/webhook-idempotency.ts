/**
 * Webhook Idempotency Guard
 *
 * Prevents duplicate processing of Stripe webhook events.
 * Uses Redis to track processed event IDs with a 24-hour TTL.
 *
 * Stripe retries webhooks up to ~72 hours after initial delivery failure.
 * This guard ensures each event.id is processed exactly once.
 *
 * Usage (in stripe.routes.ts webhook handler):
 *   import { isWebhookProcessed, markWebhookProcessed } from '../utils/webhook-idempotency.js';
 *
 *   if (await isWebhookProcessed(event.id)) {
 *     return res.status(200).json({ received: true, duplicate: true });
 *   }
 *   await processWebhook(event);
 *   await markWebhookProcessed(event.id);
 */

import { redisHelpers } from '../lib/redis.js';
import { logger } from '../middleware/logging.middleware.js';

const KEY_PREFIX = 'webhook:processed:';
const TTL_SECONDS = 86400; // 24 hours

/**
 * Check if a webhook event has already been processed.
 */
export async function isWebhookProcessed(eventId: string): Promise<boolean> {
  try {
    const val = await redisHelpers.getCache<string>(`${KEY_PREFIX}${eventId}`);
    return val !== null;
  } catch (err) {
    // If Redis is down, allow processing (at-least-once > at-most-once for payments)
    logger.warn('Webhook idempotency check failed (Redis)', {
      eventId,
      error: (err as Error).message,
    });
    return false;
  }
}

/**
 * Mark a webhook event as processed.
 */
export async function markWebhookProcessed(eventId: string): Promise<void> {
  try {
    await redisHelpers.setCache(`${KEY_PREFIX}${eventId}`, 'ok', TTL_SECONDS);
  } catch (err) {
    logger.warn('Webhook idempotency mark failed (Redis)', {
      eventId,
      error: (err as Error).message,
    });
  }
}
