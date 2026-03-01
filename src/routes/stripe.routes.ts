import express, { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { stripeServices, stripe } from '../services/stripe.service.js';
import processWebhook from '../services/stripe-webhooks.service.js';
import { getEnv } from '../config/env.js';
import {
  authenticate,
  authenticateWithProfile,
  requireRole,
  AuthenticatedRequest,
} from '../middleware/auth.middleware.js';
import {
  paymentLimiter,
  sensitiveLimiter,
  webhookLimiter,
} from '../middleware/rateLimit.middleware.js';
import {
  validateBody,
  createPaymentIntentSchema,
  refundSchema,
  uuidSchema,
} from '../middleware/validation.middleware.js';
import { asyncHandler, AppError, getErrorMessage } from '../utils/errors.js';
import { logger } from '../middleware/logging.middleware.js';
import { isWebhookProcessed, markWebhookProcessed } from '../utils/webhook-idempotency.js';
import { z } from 'zod';

const router = Router();

// Additional validation schemas for Stripe routes
const createCustomerSchema = z.object({
  email: z.string().email(),
  name: z.string().max(200).optional(),
  userId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

const updateCustomerSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().max(200).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

// Debug middleware for stripe routes
router.use((req, res, next) => {
  logger.debug('Stripe request', { method: req.method, path: req.path });
  next();
});

// Webhook endpoint - raw body is handled by server middleware
router.post(
  '/webhook',
  webhookLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;
    const env = getEnv();
    const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw AppError.internal('Webhook secret not configured');
    }

    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    // Idempotency: skip already-processed events (Stripe retries)
    if (await isWebhookProcessed(event.id)) {
      logger.info('Duplicate webhook event skipped', { eventId: event.id, type: event.type });
      res.json({ success: true, received: true, duplicate: true });
      return;
    }

    await processWebhook(event);
    await markWebhookProcessed(event.id);
    res.json({ success: true, received: true });
  })
);

// ============================================================
// CUSTOMER ROUTES (Protected)
// ============================================================

router.post(
  '/customers',
  authenticate,
  validateBody(createCustomerSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { email, name, userId, metadata } = req.body;
    logger.debug('Creating Stripe customer', { email, userId: userId || req.user?.id });
    const customer = await stripeServices.customers.create({
      email,
      name,
      userId: userId || req.user?.id,
      metadata,
    });
    res.json({ success: true, data: customer });
  })
);

router.get(
  '/customers/:customerId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const customer = await stripeServices.customers.get(String(req.params.customerId));
    res.json({ success: true, data: customer });
  })
);

router.put(
  '/customers/:customerId',
  authenticate,
  validateBody(updateCustomerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const customer = await stripeServices.customers.update(String(req.params.customerId), req.body);
    res.json({ success: true, data: customer });
  })
);

// ============================================================
// PAYMENT INTENT ROUTES (Protected)
// ============================================================

router.post(
  '/payment-intents',
  paymentLimiter,
  authenticate,
  validateBody(createPaymentIntentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      amount,
      currency,
      customerId,
      patientId,
      providerId,
      appointmentId,
      description,
      metadata,
    } = req.body;
    // amount is already in cents (validated by amountSchema) — do NOT multiply by 100 again
    const paymentIntent = await stripeServices.paymentIntents.create({
      amount: Math.round(amount),
      currency: currency?.toLowerCase() || 'usd',
      customerId,
      patientId,
      providerId,
      appointmentId,
      description,
      metadata,
    });
    res.json({
      success: true,
      data: {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
      },
    });
  })
);

router.get(
  '/payment-intents/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const paymentIntent = await stripeServices.paymentIntents.get(String(req.params.id));
    res.json({ success: true, data: paymentIntent });
  })
);

router.post(
  '/payment-intents/:id/confirm',
  paymentLimiter,
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { paymentMethodId } = req.body;
    const paymentIntent = await stripeServices.paymentIntents.confirm(
      String(req.params.id),
      paymentMethodId
    );
    res.json({ success: true, data: paymentIntent });
  })
);

router.post(
  '/payment-intents/:id/cancel',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const paymentIntent = await stripeServices.paymentIntents.cancel(String(req.params.id));
    res.json({ success: true, data: paymentIntent });
  })
);

// ============================================================
// REFUND ROUTES (Admin/Provider only)
// ============================================================

router.post(
  '/refunds',
  sensitiveLimiter,
  authenticate,
  validateBody(refundSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { paymentIntentId, amount, reason } = req.body;
    // amount is already in cents (validated by amountSchema) — do NOT multiply by 100
    const refund = amount
      ? await stripeServices.refunds.createPartial(paymentIntentId, Math.round(amount), reason)
      : await stripeServices.refunds.createFull(paymentIntentId, reason);
    res.json({
      success: true,
      data: {
        id: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency,
        status: refund.status,
      },
    });
  })
);

router.get(
  '/refunds/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const refund = await stripeServices.refunds.get(String(req.params.id));
    res.json({ success: true, data: refund });
  })
);

// ============================================================
// CONNECT ROUTES (Provider Onboarding) - Protected
// ============================================================

router.post(
  '/connect/accounts',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { email, providerId, businessName, country } = req.body;
    const account = await stripeServices.connect.createExpressAccount({
      email,
      providerId,
      businessName: businessName || 'Healthcare Provider',
      country,
    });
    res.json({
      success: true,
      data: {
        id: account.id,
        type: account.type,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      },
    });
  })
);

router.get(
  '/connect/accounts/:accountId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const account = await stripeServices.connect.getAccount(String(req.params.accountId));
    res.json({ success: true, data: account });
  })
);

router.post(
  '/connect/accounts/:accountId/onboarding-link',
  authenticate,
  sensitiveLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { returnUrl, refreshUrl } = req.body;
    const env = getEnv();
    const accountLink = await stripeServices.connect.createAccountLink(
      String(req.params.accountId),
      refreshUrl || `${env.FRONTEND_URL}/provider/setup/refresh`,
      returnUrl || `${env.FRONTEND_URL}/provider/setup/complete`
    );
    res.json({
      success: true,
      data: {
        url: accountLink.url,
        expiresAt: new Date(accountLink.expires_at * 1000).toISOString(),
      },
    });
  })
);

router.post(
  '/connect/accounts/:accountId/dashboard-link',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const loginLink = await stripeServices.connect.createLoginLink(String(req.params.accountId));
    res.json({ success: true, data: { url: loginLink.url } });
  })
);

router.get(
  '/connect/accounts/:accountId/balance',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const balance = await stripeServices.connect.getBalance(String(req.params.accountId));
    res.json({ success: true, data: balance });
  })
);

// ============================================================
// TRANSFER ROUTES (Platform to Provider) - Admin only
// ============================================================

router.post(
  '/transfers',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { amount, destinationAccountId, transactionId, description } = req.body;
    // amount is already in cents — do NOT multiply by 100
    const transfer = await stripeServices.transfers.createTransfer({
      amount: Math.round(amount),
      destinationAccountId,
      transactionId,
      description,
    });
    res.json({
      success: true,
      data: { id: transfer.id, amount: transfer.amount / 100, destination: transfer.destination },
    });
  })
);

// ============================================================
// SUBSCRIPTION ROUTES (Protected)
// ============================================================

router.post(
  '/subscriptions',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId, priceId, patientId, providerId } = req.body;
    const subscription = await stripeServices.subscriptions.create({
      customerId,
      priceId,
      patientId,
      providerId,
    });
    res.json({ success: true, data: { id: subscription.id, status: subscription.status } });
  })
);

router.get(
  '/subscriptions/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const subscription = await stripeServices.subscriptions.get(String(req.params.id));
    res.json({ success: true, data: subscription });
  })
);

router.post(
  '/subscriptions/:id/cancel',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { cancelAtPeriodEnd } = req.body;
    const subscription = await stripeServices.subscriptions.cancel(
      String(req.params.id),
      cancelAtPeriodEnd
    );
    res.json({ success: true, data: subscription });
  })
);

router.post(
  '/subscriptions/:id/pause',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const subscription = await stripeServices.subscriptions.pause(String(req.params.id));
    res.json({ success: true, data: subscription });
  })
);

router.post(
  '/subscriptions/:id/resume',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const subscription = await stripeServices.subscriptions.resume(String(req.params.id));
    res.json({ success: true, data: subscription });
  })
);

// ============================================================
// PRODUCT/PRICE ROUTES - DEPRECATED
// ============================================================
// ⚠️ DEPRECATED: These routes query external Stripe Product Catalog.
//
// The platform now uses the local 'services' table as the single source of truth.
// All medical services/products are defined in the database, eliminating:
//   - External API dependencies
//   - Synchronization issues between Stripe and local data
//   - Unnecessary API calls and latency
//   - Additional costs
//
// USE INSTEAD: GET /api/v1/services
//
// These routes remain for backward compatibility only and may be removed in future versions.
// ============================================================

router.post(
  '/products',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    // DEPRECATED: Use POST /api/v1/services instead
    res.status(410).json({
      success: false,
      error: 'This endpoint is deprecated',
      message: 'Use POST /api/v1/services to create medical services in the local catalog',
      migrationGuide: 'https://docs.advanciapayledger.com/migration/services',
    });
  })
);

router.get(
  '/products',
  asyncHandler(async (req: Request, res: Response) => {
    // DEPRECATED: Use GET /api/v1/services instead
    res.status(410).json({
      success: false,
      error: 'This endpoint is deprecated',
      message: 'Use GET /api/v1/services to list medical services from the local catalog',
      migrationGuide: 'https://docs.advanciapayledger.com/migration/services',
    });
  })
);

router.post(
  '/prices',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    // DEPRECATED: Prices are now part of the service definition
    res.status(410).json({
      success: false,
      error: 'This endpoint is deprecated',
      message:
        'Service pricing is managed in the services table. Use PUT /api/v1/services/:id to update default_price',
      migrationGuide: 'https://docs.advanciapayledger.com/migration/services',
    });
  })
);

// ============================================================
// PAYMENT METHOD ROUTES (Protected)
// ============================================================

router.get(
  '/customers/:customerId/payment-methods',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const paymentMethods = await stripeServices.customers.listPaymentMethods(
      String(req.params.customerId)
    );
    res.json({ success: true, data: paymentMethods });
  })
);

router.post(
  '/payment-methods/:id/attach',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.body;
    const paymentMethod = await stripeServices.paymentMethods.attach(
      String(req.params.id),
      customerId
    );
    res.json({ success: true, data: paymentMethod });
  })
);

router.post(
  '/payment-methods/:id/detach',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const paymentMethod = await stripeServices.paymentMethods.detach(String(req.params.id));
    res.json({ success: true, data: paymentMethod });
  })
);

// ============================================================
// SETUP INTENT ROUTES (Protected)
// ============================================================

router.post(
  '/setup-intents',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.body;
    const setupIntent = await stripeServices.setupIntents.create(customerId);
    res.json({
      success: true,
      data: { id: setupIntent.id, clientSecret: setupIntent.client_secret },
    });
  })
);

// ============================================================
// CHECKOUT SESSION ROUTES (Protected)
// ============================================================

router.post(
  '/checkout/sessions',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId, amount, productName, successUrl, cancelUrl, metadata } = req.body;
    // amount is already in cents — do NOT multiply by 100
    const session = await stripeServices.checkout.createPaymentSession({
      customerId,
      amount: Math.round(amount),
      productName: productName || 'Healthcare Service',
      successUrl: successUrl || `${process.env.FRONTEND_URL}/payment/success`,
      cancelUrl: cancelUrl || `${process.env.FRONTEND_URL}/payment/cancelled`,
      metadata,
    });
    res.json({ success: true, data: { id: session.id, url: session.url } });
  })
);

router.get(
  '/checkout/sessions/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const session = await stripeServices.checkout.get(String(req.params.id));
    res.json({ success: true, data: session });
  })
);

// ============================================================
// INVOICE ROUTES (Protected)
// ============================================================

router.post(
  '/invoices',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId, metadata, items } = req.body;
    const invoice = await stripeServices.invoices.create(customerId, metadata);

    // Add line items if provided
    if (items && items.length > 0) {
      for (const item of items) {
        // item.amount is already in cents — do NOT multiply by 100
        await stripeServices.invoices.addLineItem(
          invoice.id,
          Math.round(item.amount),
          item.description,
          item.currency || 'usd'
        );
      }
    }

    res.json({
      success: true,
      data: { id: invoice.id, status: invoice.status, amountDue: (invoice.amount_due || 0) / 100 },
    });
  })
);

router.post(
  '/invoices/:id/finalize',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const invoice = await stripeServices.invoices.finalizeAndSend(String(req.params.id));
    res.json({ success: true, data: invoice });
  })
);

router.post(
  '/invoices/:id/pay',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const invoice = await stripeServices.invoices.markPaid(String(req.params.id));
    res.json({ success: true, data: invoice });
  })
);

router.post(
  '/invoices/:id/void',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const invoice = await stripeServices.invoices.void(String(req.params.id));
    res.json({ success: true, data: invoice });
  })
);

// ============================================================
// DISPUTE ROUTES (Admin/Provider only)
// ============================================================

router.get(
  '/disputes',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const disputes = await stripeServices.disputes.list(100);
    res.json({ success: true, data: disputes });
  })
);

router.get(
  '/disputes/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const dispute = await stripeServices.disputes.get(String(req.params.id));
    res.json({ success: true, data: dispute });
  })
);

router.post(
  '/disputes/:id/evidence',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const dispute = await stripeServices.disputes.submitEvidence(String(req.params.id), req.body);
    res.json({ success: true, data: dispute });
  })
);

router.post(
  '/disputes/:id/close',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const dispute = await stripeServices.disputes.close(String(req.params.id));
    res.json({ success: true, data: dispute });
  })
);

// ============================================================
// PAYMENT HISTORY ROUTES
// ============================================================

router.get(
  '/payment-history',
  authenticateWithProfile,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { limit = 20, starting_after, status } = req.query;
    const customerId = req.userProfile?.stripe_customer_id;

    if (!customerId) {
      res.json({ success: true, data: { payments: [], has_more: false } });
      return;
    }

    const params: Stripe.PaymentIntentListParams = {
      customer: customerId,
      limit: Math.min(Number(limit), 100),
    };

    if (starting_after && typeof starting_after === 'string')
      params.starting_after = starting_after;

    const paymentIntents = await stripe.paymentIntents.list(params);

    // Filter by status if provided
    let payments = paymentIntents.data;
    if (status && typeof status === 'string') {
      payments = payments.filter((pi) => pi.status === status);
    }

    res.json({
      success: true,
      data: {
        payments: payments.map((pi) => ({
          id: pi.id,
          amount: pi.amount / 100,
          currency: pi.currency.toUpperCase(),
          status: pi.status,
          description: pi.description,
          created: new Date(pi.created * 1000).toISOString(),
          receipt_url: pi.latest_charge ? null : undefined, // Will fetch if needed
          metadata: pi.metadata,
        })),
        has_more: paymentIntents.has_more,
      },
    });
  })
);

router.get(
  '/payment-history/:id',
  authenticateWithProfile,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const paymentIntentId = req.params.id as string;
    const paymentIntent = (await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge', 'invoice'],
    })) as any;

    // Verify ownership
    const customerId = req.userProfile?.stripe_customer_id;
    if (paymentIntent.customer !== customerId) {
      throw AppError.forbidden('Access denied');
    }

    const charge = paymentIntent.latest_charge;

    res.json({
      success: true,
      data: {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        status: paymentIntent.status,
        description: paymentIntent.description,
        created: new Date(paymentIntent.created * 1000).toISOString(),
        receipt_url: charge?.receipt_url || null,
        receipt_email: charge?.receipt_email || null,
        payment_method: paymentIntent.payment_method,
        metadata: paymentIntent.metadata,
        invoice: paymentIntent.invoice,
      },
    });
  })
);

export default router;
