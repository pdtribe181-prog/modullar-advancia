/**
 * Database Webhook Routes
 * Receives webhook events from Supabase database triggers
 */

import { Router, Request, Response } from 'express';
import {
  databaseWebhookService,
  WebhookPayload,
  TransactionRecord,
  DisputeRecord,
  AppointmentRecord,
  WalletTransactionRecord,
} from '../services/database-webhook.service.js';
import { asyncHandler, AppError } from '../utils/errors.js';
import { logger } from '../middleware/logging.middleware.js';
import { webhookLimiter } from '../middleware/rateLimit.middleware.js';
import { getEnv } from '../config/env.js';
import crypto from 'crypto';

const router = Router();

// Webhook secret for verification (set in Supabase Dashboard)
function getWebhookSecret(): string | undefined {
  return getEnv().SUPABASE_WEBHOOK_SECRET;
}

/**
 * Verify webhook signature from Supabase
 * Supabase signs webhooks with HMAC-SHA256
 */
function verifyWebhookSignature(
  payload: string,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature) return false;

  const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

/**
 * Middleware to verify webhook authenticity
 */
function verifyWebhook(req: Request, _res: Response, next: () => void) {
  const secret = getWebhookSecret();

  // Skip verification in development if no secret configured
  if (!secret) {
    logger.warn('Webhook secret not configured - skipping signature verification');
    return next();
  }

  const signature = req.headers['x-supabase-signature'] as string | undefined;
  const rawBody = JSON.stringify(req.body);

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    logger.warn('Invalid webhook signature', {
      table: req.body?.table,
      type: req.body?.type,
    });
    throw AppError.unauthorized('Invalid webhook signature');
  }

  next();
}

/**
 * Generic webhook handler
 * POST /webhooks/supabase
 *
 * Configure in Supabase Dashboard:
 * - URL: https://your-api.com/webhooks/supabase
 * - Method: POST
 * - Headers: x-supabase-signature: <webhook-secret>
 */
router.post(
  '/',
  webhookLimiter,
  verifyWebhook,
  asyncHandler(async (req: Request, res: Response) => {
    const payload = req.body as WebhookPayload;

    if (!payload.table || !payload.type) {
      throw AppError.badRequest('Invalid webhook payload');
    }

    logger.info('Received database webhook', {
      table: payload.table,
      type: payload.type,
      schema: payload.schema,
      recordId: payload.record?.id,
    });

    // Route to appropriate handler based on table
    switch (payload.table) {
      case 'transactions':
        await databaseWebhookService.handleTransaction(
          payload as unknown as WebhookPayload<TransactionRecord>
        );
        break;

      case 'disputes':
        await databaseWebhookService.handleDispute(
          payload as unknown as WebhookPayload<DisputeRecord>
        );
        break;

      case 'appointments':
        await databaseWebhookService.handleAppointment(
          payload as unknown as WebhookPayload<AppointmentRecord>
        );
        break;

      case 'wallet_transactions':
        await databaseWebhookService.handleWalletTransaction(
          payload as unknown as WebhookPayload<WalletTransactionRecord>
        );
        break;

      default:
        logger.info('Unhandled webhook table', { table: payload.table });
    }

    res.json({ success: true, received: true });
  })
);

/**
 * Transaction webhooks
 * POST /webhooks/supabase/transactions
 */
router.post(
  '/transactions',
  webhookLimiter,
  verifyWebhook,
  asyncHandler(async (req: Request, res: Response) => {
    const payload = req.body as WebhookPayload<TransactionRecord>;

    logger.info('Received transaction webhook', {
      type: payload.type,
      transactionId: payload.record?.id,
    });

    await databaseWebhookService.handleTransaction(payload);

    res.json({ success: true, received: true });
  })
);

/**
 * Dispute webhooks
 * POST /webhooks/supabase/disputes
 */
router.post(
  '/disputes',
  webhookLimiter,
  verifyWebhook,
  asyncHandler(async (req: Request, res: Response) => {
    const payload = req.body as WebhookPayload<DisputeRecord>;

    logger.info('Received dispute webhook', {
      type: payload.type,
      disputeId: payload.record?.id,
    });

    await databaseWebhookService.handleDispute(payload);

    res.json({ success: true, received: true });
  })
);

/**
 * Appointment webhooks
 * POST /webhooks/supabase/appointments
 */
router.post(
  '/appointments',
  webhookLimiter,
  verifyWebhook,
  asyncHandler(async (req: Request, res: Response) => {
    const payload = req.body as WebhookPayload<AppointmentRecord>;

    logger.info('Received appointment webhook', {
      type: payload.type,
      appointmentId: payload.record?.id,
    });

    await databaseWebhookService.handleAppointment(payload);

    res.json({ success: true, received: true });
  })
);

/**
 * Wallet transaction webhooks (crypto payouts)
 * POST /webhooks/supabase/wallet-transactions
 */
router.post(
  '/wallet-transactions',
  webhookLimiter,
  verifyWebhook,
  asyncHandler(async (req: Request, res: Response) => {
    const payload = req.body as WebhookPayload<WalletTransactionRecord>;

    logger.info('Received wallet transaction webhook', {
      type: payload.type,
      walletTxId: payload.record?.id,
    });

    await databaseWebhookService.handleWalletTransaction(payload);

    res.json({ success: true, received: true });
  })
);

/**
 * Health check for webhook endpoint
 * GET /webhooks/supabase/health
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'database-webhooks',
    timestamp: new Date().toISOString(),
  });
});

export default router;
