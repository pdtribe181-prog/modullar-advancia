/**
 * Crypto Payment Routes
 * Handles cryptocurrency payments via Coinbase Commerce
 */

import { Router, Request, Response, NextFunction } from 'express';
import { cryptoService, CryptoWebhookEvent } from '../services/crypto.service.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { paymentLimiter, webhookLimiter } from '../middleware/rateLimit.middleware.js';
import { createServiceClient } from '../lib/supabase.js';
import { z } from 'zod';

type AsyncRequestHandler = (
  req: Request | AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void>;

const router = Router();

// Validation schemas
const createChargeSchema = z.object({
  amount: z.number().int().positive().max(100000000), // Max $1M in cents
  currency: z.string().length(3).default('USD'),
  appointmentId: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

// Helper for async error handling
const asyncHandler =
  (fn: AsyncRequestHandler) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Validation middleware
const validateBody = (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.issues,
      });
      return;
    }
    next(error);
  }
};

/**
 * @route GET /crypto/status
 * @desc Check if crypto payments are enabled
 * @access Public
 */
router.get('/status', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      enabled: cryptoService.isEnabled(),
      supportedCurrencies: ['BTC', 'ETH', 'USDC', 'DAI'],
      features: {
        instantSettlement: true,
        noChargebacks: true,
        lowFees: true,
      },
    },
  });
});

/**
 * @route POST /crypto/charges
 * @desc Create a new crypto payment charge
 * @access Private (authenticated)
 */
router.post(
  '/charges',
  paymentLimiter,
  authenticate,
  validateBody(createChargeSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!cryptoService.isEnabled()) {
      res.status(503).json({
        success: false,
        error: 'Crypto payments are not configured',
      });
      return;
    }

    const { amount, currency, appointmentId, description, metadata } = req.body;
    const userId = req.user!.id;

    // Get patient profile
    const supabaseAdmin = createServiceClient();
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id, provider_id')
      .eq('user_id', userId)
      .single();

    if (!patient) {
      res.status(404).json({
        success: false,
        error: 'Patient profile not found',
      });
      return;
    }

    // If appointmentId provided, verify it belongs to the patient
    if (appointmentId) {
      const { data: appointment } = await supabaseAdmin
        .from('appointments')
        .select('id, provider_id')
        .eq('id', appointmentId)
        .eq('patient_id', patient.id)
        .single();

      if (!appointment) {
        res.status(404).json({
          success: false,
          error: 'Appointment not found',
        });
        return;
      }
    }

    const charge = await cryptoService.createCharge({
      amount,
      currency,
      patientId: patient.id,
      providerId: patient.provider_id,
      appointmentId,
      description,
      metadata,
    });

    res.status(201).json({
      success: true,
      data: {
        id: charge.id,
        code: charge.code,
        hostedUrl: charge.hosted_url,
        expiresAt: charge.expires_at,
        addresses: charge.addresses,
        pricing: charge.pricing,
      },
    });
  })
);

/**
 * @route GET /crypto/charges/:code
 * @desc Get charge details by code
 * @access Private (authenticated)
 */
router.get(
  '/charges/:code',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!cryptoService.isEnabled()) {
      res.status(503).json({
        success: false,
        error: 'Crypto payments are not configured',
      });
      return;
    }

    const code = req.params.code as string;
    const charge = await cryptoService.getChargeByCode(code);

    res.json({
      success: true,
      data: {
        id: charge.id,
        code: charge.code,
        status: charge.timeline?.[charge.timeline.length - 1]?.status || 'NEW',
        hostedUrl: charge.hosted_url,
        expiresAt: charge.expires_at,
        addresses: charge.addresses,
        pricing: charge.pricing,
        payments: charge.payments,
      },
    });
  })
);

/**
 * @route POST /crypto/charges/:code/cancel
 * @desc Cancel a pending charge
 * @access Private (authenticated)
 */
router.post(
  '/charges/:code/cancel',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!cryptoService.isEnabled()) {
      res.status(503).json({
        success: false,
        error: 'Crypto payments are not configured',
      });
      return;
    }

    const code = req.params.code as string;
    const charge = await cryptoService.cancelCharge(code);

    res.json({
      success: true,
      data: {
        id: charge.id,
        code: charge.code,
        status: 'CANCELED',
      },
    });
  })
);

/**
 * @route POST /crypto/webhook
 * @desc Handle Coinbase Commerce webhook events
 * @access Public (verified by signature)
 */
router.post(
  '/webhook',
  webhookLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers['x-cc-webhook-signature'] as string;

    if (!signature) {
      res.status(400).json({
        success: false,
        error: 'Missing webhook signature',
      });
      return;
    }

    // Get raw body for signature verification
    // NOTE: req.body should be the raw buffer if express.raw() is used for this route.
    // Using JSON.stringify(req.body) re-serializes and may alter byte sequence.
    const rawBody =
      typeof req.body === 'string'
        ? req.body
        : Buffer.isBuffer(req.body)
          ? req.body.toString('utf8')
          : JSON.stringify(req.body);

    // Verify signature
    const isValid = cryptoService.verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      console.error('[Crypto Webhook] Invalid signature');
      res.status(401).json({
        success: false,
        error: 'Invalid signature',
      });
      return;
    }

    const event = req.body as { event: CryptoWebhookEvent };

    // Process the event asynchronously
    cryptoService.processWebhookEvent(event.event).catch((error) => {
      console.error('[Crypto Webhook] Error processing event:', error);
    });

    // Return 200 immediately to acknowledge receipt
    res.json({ success: true });
  })
);

/**
 * @route GET /crypto/transactions
 * @desc Get user's crypto transaction history
 * @access Private (authenticated)
 */
router.get(
  '/transactions',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { limit = 20, offset = 0 } = req.query;

    const supabaseAdmin = createServiceClient();

    // Get patient ID
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!patient) {
      res.status(404).json({
        success: false,
        error: 'Patient profile not found',
      });
      return;
    }

    // Get crypto transactions
    const {
      data: transactions,
      error,
      count,
    } = await supabaseAdmin
      .from('crypto_transactions')
      .select('*', { count: 'exact' })
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: transactions,
      pagination: {
        total: count,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  })
);

export default router;
