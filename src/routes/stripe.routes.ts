import express, { Router, Request, Response } from 'express';
import { stripeServices, stripe } from '../services/stripe.service.js';
import processWebhook from '../services/stripe-webhooks.service.js';
import { authenticate, authenticateWithProfile, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { paymentLimiter, sensitiveLimiter, webhookLimiter } from '../middleware/rateLimit.middleware.js';

const router = Router();

// Debug middleware for stripe routes
router.use((req, res, next) => {
  console.log(`[STRIPE] ${req.method} ${req.path}`);
  next();
});

// Webhook endpoint - raw body is handled by server middleware
router.post('/webhook', webhookLimiter, async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    await processWebhook(event);
    res.json({ received: true });
  } catch (err: any) {
    console.error('Webhook error:', err.message);
    res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }
});

// ============================================================
// CUSTOMER ROUTES (Protected)
// ============================================================

router.post('/customers', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, name, userId, metadata } = req.body;
    console.log('Creating customer with:', { email, name, userId });
    const customer = await stripeServices.customers.create({ email, name, userId: userId || req.user?.id, metadata });
    res.json(customer);
  } catch (error: any) {
    console.error('Customer create error:', error);
    res.status(400).json({ error: error.message });
  }
});

router.get('/customers/:customerId', authenticate, async (req: Request, res: Response) => {
  try {
    const customer = await stripeServices.customers.get(String(req.params.customerId));
    res.json(customer);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

router.put('/customers/:customerId', authenticate, async (req: Request, res: Response) => {
  try {
    const customer = await stripeServices.customers.update(String(req.params.customerId), req.body);
    res.json(customer);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// PAYMENT INTENT ROUTES (Protected)
// ============================================================

router.post('/payment-intents', paymentLimiter, authenticate, async (req: Request, res: Response) => {
  try {
    const { amount, currency, customerId, patientId, providerId, appointmentId, description, metadata } = req.body;
    const paymentIntent = await stripeServices.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency?.toLowerCase() || 'usd',
      customerId,
      patientId,
      providerId,
      appointmentId,
      description,
      metadata,
    });
    res.json({
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/payment-intents/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const paymentIntent = await stripeServices.paymentIntents.get(String(req.params.id));
    res.json(paymentIntent);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

router.post('/payment-intents/:id/confirm', paymentLimiter, authenticate, async (req: Request, res: Response) => {
  try {
    const { paymentMethodId } = req.body;
    const paymentIntent = await stripeServices.paymentIntents.confirm(String(req.params.id), paymentMethodId);
    res.json(paymentIntent);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/payment-intents/:id/cancel', authenticate, async (req: Request, res: Response) => {
  try {
    const paymentIntent = await stripeServices.paymentIntents.cancel(String(req.params.id));
    res.json(paymentIntent);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// REFUND ROUTES (Admin/Provider only)
// ============================================================

router.post('/refunds', sensitiveLimiter, authenticate, async (req: Request, res: Response) => {
  try {
    const { paymentIntentId, amount, reason } = req.body;
    const refund = amount
      ? await stripeServices.refunds.createPartial(paymentIntentId, Math.round(amount * 100), reason)
      : await stripeServices.refunds.createFull(paymentIntentId, reason);
    res.json({
      id: refund.id,
      amount: refund.amount / 100,
      currency: refund.currency,
      status: refund.status,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/refunds/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const refund = await stripeServices.refunds.get(String(req.params.id));
    res.json(refund);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// ============================================================
// CONNECT ROUTES (Provider Onboarding) - Protected
// ============================================================

router.post('/connect/accounts', authenticate, async (req: Request, res: Response) => {
  try {
    const { email, providerId, businessName, country } = req.body;
    const account = await stripeServices.connect.createExpressAccount({ email, providerId, businessName: businessName || 'Healthcare Provider', country });
    res.json({
      id: account.id,
      type: account.type,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/connect/accounts/:accountId', authenticate, async (req: Request, res: Response) => {
  try {
    const account = await stripeServices.connect.getAccount(String(req.params.accountId));
    res.json(account);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

router.post('/connect/accounts/:accountId/onboarding-link', authenticate, async (req: Request, res: Response) => {
  try {
    const { returnUrl, refreshUrl } = req.body;
    const accountLink = await stripeServices.connect.createAccountLink(
      String(req.params.accountId),
      refreshUrl || `${process.env.FRONTEND_URL}/provider/setup/refresh`,
      returnUrl || `${process.env.FRONTEND_URL}/provider/setup/complete`
    );
    res.json({ url: accountLink.url, expiresAt: new Date(accountLink.expires_at * 1000).toISOString() });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/connect/accounts/:accountId/dashboard-link', authenticate, async (req: Request, res: Response) => {
  try {
    const loginLink = await stripeServices.connect.createLoginLink(String(req.params.accountId));
    res.json({ url: loginLink.url });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/connect/accounts/:accountId/balance', authenticate, async (req: Request, res: Response) => {
  try {
    const balance = await stripeServices.connect.getBalance(String(req.params.accountId));
    res.json(balance);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// TRANSFER ROUTES (Platform to Provider) - Admin only
// ============================================================

router.post('/transfers', authenticate, async (req: Request, res: Response) => {
  try {
    const { amount, destinationAccountId, transactionId, description } = req.body;
    const transfer = await stripeServices.transfers.createTransfer({
      amount: Math.round(amount * 100),
      destinationAccountId,
      transactionId,
      description,
    });
    res.json({ id: transfer.id, amount: transfer.amount / 100, destination: transfer.destination });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// SUBSCRIPTION ROUTES (Protected)
// ============================================================

router.post('/subscriptions', authenticate, async (req: Request, res: Response) => {
  try {
    const { customerId, priceId, patientId, providerId } = req.body;
    const subscription = await stripeServices.subscriptions.create({ customerId, priceId, patientId, providerId });
    res.json({ id: subscription.id, status: subscription.status });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/subscriptions/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const subscription = await stripeServices.subscriptions.get(String(req.params.id));
    res.json(subscription);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

router.post('/subscriptions/:id/cancel', authenticate, async (req: Request, res: Response) => {
  try {
    const { cancelAtPeriodEnd } = req.body;
    const subscription = await stripeServices.subscriptions.cancel(String(req.params.id), cancelAtPeriodEnd);
    res.json(subscription);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/subscriptions/:id/pause', authenticate, async (req: Request, res: Response) => {
  try {
    const subscription = await stripeServices.subscriptions.pause(String(req.params.id));
    res.json(subscription);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/subscriptions/:id/resume', authenticate, async (req: Request, res: Response) => {
  try {
    const subscription = await stripeServices.subscriptions.resume(String(req.params.id));
    res.json(subscription);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// PRODUCT/PRICE ROUTES (Admin only for create, public for list)
// ============================================================

router.post('/products', authenticate, async (req: Request, res: Response) => {
  try {
    const product = await stripeServices.products.create(req.body);
    res.json(product);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/products', async (req: Request, res: Response) => {
  try {
    const products = await stripeServices.products.list(true);
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/prices', authenticate, async (req: Request, res: Response) => {
  try {
    const { productId, unitAmount, currency, interval } = req.body;
    const price = await stripeServices.products.createPrice(
      productId,
      Math.round(unitAmount * 100),
      currency || 'usd',
      interval ? { interval } : undefined
    );
    res.json({ id: price.id, unitAmount: price.unit_amount ? price.unit_amount / 100 : null, currency: price.currency });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// PAYMENT METHOD ROUTES (Protected)
// ============================================================

router.get('/customers/:customerId/payment-methods', authenticate, async (req: Request, res: Response) => {
  try {
    const paymentMethods = await stripeServices.customers.listPaymentMethods(String(req.params.customerId));
    res.json(paymentMethods);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/payment-methods/:id/attach', authenticate, async (req: Request, res: Response) => {
  try {
    const { customerId } = req.body;
    const paymentMethod = await stripeServices.paymentMethods.attach(String(req.params.id), customerId);
    res.json(paymentMethod);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/payment-methods/:id/detach', authenticate, async (req: Request, res: Response) => {
  try {
    const paymentMethod = await stripeServices.paymentMethods.detach(String(req.params.id));
    res.json(paymentMethod);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// SETUP INTENT ROUTES (Protected)
// ============================================================

router.post('/setup-intents', authenticate, async (req: Request, res: Response) => {
  try {
    const { customerId } = req.body;
    const setupIntent = await stripeServices.setupIntents.create(customerId);
    res.json({ id: setupIntent.id, clientSecret: setupIntent.client_secret });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// CHECKOUT SESSION ROUTES (Protected)
// ============================================================

router.post('/checkout/sessions', authenticate, async (req: Request, res: Response) => {
  try {
    const { customerId, amount, productName, successUrl, cancelUrl, metadata } = req.body;
    const session = await stripeServices.checkout.createPaymentSession({
      customerId,
      amount: Math.round(amount * 100),
      productName: productName || 'Healthcare Service',
      successUrl: successUrl || `${process.env.FRONTEND_URL}/payment/success`,
      cancelUrl: cancelUrl || `${process.env.FRONTEND_URL}/payment/cancelled`,
      metadata,
    });
    res.json({ id: session.id, url: session.url });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/checkout/sessions/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const session = await stripeServices.checkout.get(String(req.params.id));
    res.json(session);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// ============================================================
// INVOICE ROUTES (Protected)
// ============================================================

router.post('/invoices', authenticate, async (req: Request, res: Response) => {
  try {
    const { customerId, metadata, items } = req.body;
    const invoice = await stripeServices.invoices.create(customerId, metadata);
    
    // Add line items if provided
    if (items && items.length > 0) {
      for (const item of items) {
        await stripeServices.invoices.addLineItem(
          invoice.id,
          Math.round(item.amount * 100),
          item.description,
          item.currency || 'usd'
        );
      }
    }
    
    res.json({ id: invoice.id, status: invoice.status, amountDue: (invoice.amount_due || 0) / 100 });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/invoices/:id/finalize', authenticate, async (req: Request, res: Response) => {
  try {
    const invoice = await stripeServices.invoices.finalizeAndSend(String(req.params.id));
    res.json(invoice);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/invoices/:id/pay', authenticate, async (req: Request, res: Response) => {
  try {
    const invoice = await stripeServices.invoices.markPaid(String(req.params.id));
    res.json(invoice);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/invoices/:id/void', authenticate, async (req: Request, res: Response) => {
  try {
    const invoice = await stripeServices.invoices.void(String(req.params.id));
    res.json(invoice);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// DISPUTE ROUTES (Admin/Provider only)
// ============================================================

router.get('/disputes', authenticate, async (req: Request, res: Response) => {
  try {
    const disputes = await stripeServices.disputes.list(100);
    res.json(disputes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/disputes/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const dispute = await stripeServices.disputes.get(String(req.params.id));
    res.json(dispute);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

router.post('/disputes/:id/evidence', authenticate, async (req: Request, res: Response) => {
  try {
    const dispute = await stripeServices.disputes.submitEvidence(String(req.params.id), req.body);
    res.json(dispute);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/disputes/:id/close', authenticate, async (req: Request, res: Response) => {
  try {
    const dispute = await stripeServices.disputes.close(String(req.params.id));
    res.json(dispute);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// PAYMENT HISTORY ROUTES
// ============================================================

router.get('/payment-history', authenticateWithProfile, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = 20, starting_after, status } = req.query;
    const customerId = req.userProfile?.stripe_customer_id;
    
    if (!customerId) {
      return res.json({ payments: [], has_more: false });
    }

    const params: any = {
      customer: customerId,
      limit: Math.min(Number(limit), 100),
    };
    
    if (starting_after) params.starting_after = starting_after;

    const paymentIntents = await stripe.paymentIntents.list(params);
    
    // Filter by status if provided
    let payments = paymentIntents.data;
    if (status && typeof status === 'string') {
      payments = payments.filter(pi => pi.status === status);
    }

    res.json({
      payments: payments.map(pi => ({
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
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/payment-history/:id', authenticateWithProfile, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const paymentIntentId = req.params.id as string;
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge', 'invoice'],
    }) as any;
    
    // Verify ownership
    const customerId = req.userProfile?.stripe_customer_id;
    if (paymentIntent.customer !== customerId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const charge = paymentIntent.latest_charge;
    
    res.json({
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
    });
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

export default router;
