import Stripe from 'stripe';
import { getEnv } from '../config/env.js';
import { stripeBreaker } from '../utils/circuit-breaker.js';

// Lazy initialization to ensure env is validated first
let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    const env = getEnv();
    _stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover',
      typescript: true,
    });
  }
  return _stripe;
}

// Export stripe instance as proxy for backwards compatibility.
// All method calls on Stripe resource objects are routed through the
// circuit breaker so the platform fast-fails when Stripe is degraded.
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    const resource = (getStripe() as any)[prop];
    // Wrap resource objects (e.g. stripe.customers, stripe.paymentIntents)
    // so that their async methods run inside the circuit breaker.
    // Skip the webhooks namespace — constructEvent is synchronous.
    if (resource && typeof resource === 'object' && prop !== 'webhooks') {
      return new Proxy(resource, {
        get(target: any, method: string | symbol) {
          const value = target[method];
          if (typeof value !== 'function') return value;
          return (...args: unknown[]) =>
            stripeBreaker.execute(() => value.apply(target, args));
        },
      });
    }
    return resource;
  },
});

// Type definitions
export interface CreatePaymentIntentParams {
  amount: number; // in cents
  currency?: string;
  customerId?: string;
  patientId: string;
  providerId: string;
  appointmentId?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface CreateCustomerParams {
  email: string;
  name: string;
  userId: string;
  phone?: string;
  metadata?: Record<string, string>;
}

export interface CreateConnectAccountParams {
  email: string;
  providerId: string;
  businessName: string;
  country?: string;
}

export interface CreateTransferParams {
  amount: number; // in cents
  destinationAccountId: string;
  transactionId: string;
  description?: string;
}

export interface CreateSubscriptionParams {
  customerId: string;
  priceId: string;
  patientId: string;
  providerId: string;
  metadata?: Record<string, string>;
}

// ============================================================
// CUSTOMERS
// ============================================================

export const customersService = {
  /**
   * Create a new Stripe customer for a patient
   */
  async create(params: CreateCustomerParams): Promise<Stripe.Customer> {
    return stripe.customers.create({
      email: params.email,
      name: params.name,
      phone: params.phone,
      metadata: {
        user_id: params.userId,
        ...params.metadata,
      },
    });
  },

  /**
   * Get a customer by ID
   */
  async get(customerId: string): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
    return stripe.customers.retrieve(customerId);
  },

  /**
   * Update a customer
   */
  async update(
    customerId: string,
    params: Partial<CreateCustomerParams>
  ): Promise<Stripe.Customer> {
    return stripe.customers.update(customerId, {
      email: params.email,
      name: params.name,
      phone: params.phone,
      metadata: params.metadata,
    });
  },

  /**
   * Delete a customer
   */
  async delete(customerId: string): Promise<Stripe.DeletedCustomer> {
    return stripe.customers.del(customerId);
  },

  /**
   * List customer's payment methods
   */
  async listPaymentMethods(customerId: string, type: Stripe.PaymentMethodListParams.Type = 'card') {
    return stripe.paymentMethods.list({
      customer: customerId,
      type,
    });
  },
};

// ============================================================
// PAYMENT INTENTS (One-time payments)
// ============================================================

export const paymentIntentsService = {
  /**
   * Create a payment intent for a healthcare payment
   */
  async create(params: CreatePaymentIntentParams): Promise<Stripe.PaymentIntent> {
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: params.amount,
      currency: params.currency || 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        patient_id: params.patientId,
        provider_id: params.providerId,
        appointment_id: params.appointmentId || '',
        ...params.metadata,
      },
      description: params.description || 'Healthcare payment',
    };

    if (params.customerId) {
      paymentIntentParams.customer = params.customerId;
    }

    return stripe.paymentIntents.create(paymentIntentParams);
  },

  /**
   * Get a payment intent by ID
   */
  async get(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return stripe.paymentIntents.retrieve(paymentIntentId);
  },

  /**
   * Confirm a payment intent
   */
  async confirm(paymentIntentId: string, paymentMethodId?: string): Promise<Stripe.PaymentIntent> {
    return stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
    });
  },

  /**
   * Cancel a payment intent
   */
  async cancel(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return stripe.paymentIntents.cancel(paymentIntentId);
  },

  /**
   * Capture a payment intent (for auth-then-capture flows)
   */
  async capture(paymentIntentId: string, amount?: number): Promise<Stripe.PaymentIntent> {
    return stripe.paymentIntents.capture(paymentIntentId, {
      amount_to_capture: amount,
    });
  },

  /**
   * List payment intents for a customer
   */
  async listByCustomer(customerId: string, limit = 10) {
    return stripe.paymentIntents.list({
      customer: customerId,
      limit,
    });
  },
};

// ============================================================
// REFUNDS
// ============================================================

export const refundsService = {
  /**
   * Create a full refund
   */
  async createFull(paymentIntentId: string, reason?: string): Promise<Stripe.Refund> {
    return stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: reason as Stripe.RefundCreateParams.Reason,
    });
  },

  /**
   * Create a partial refund
   */
  async createPartial(
    paymentIntentId: string,
    amount: number,
    reason?: string
  ): Promise<Stripe.Refund> {
    return stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount,
      reason: reason as Stripe.RefundCreateParams.Reason,
    });
  },

  /**
   * Get a refund by ID
   */
  async get(refundId: string): Promise<Stripe.Refund> {
    return stripe.refunds.retrieve(refundId);
  },

  /**
   * List refunds for a payment intent
   */
  async listByPaymentIntent(paymentIntentId: string) {
    return stripe.refunds.list({
      payment_intent: paymentIntentId,
    });
  },
};

// ============================================================
// STRIPE CONNECT (Provider accounts)
// ============================================================

export const connectService = {
  /**
   * Create a Connect Express account for a provider
   */
  async createExpressAccount(params: CreateConnectAccountParams): Promise<Stripe.Account> {
    return stripe.accounts.create({
      type: 'express',
      country: params.country || 'US',
      email: params.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      business_profile: {
        name: params.businessName,
        mcc: '8011', // Doctors
        url: `https://modullar.health/providers/${params.providerId}`,
      },
      metadata: {
        provider_id: params.providerId,
      },
    });
  },

  /**
   * Create an account link for onboarding
   */
  async createAccountLink(
    accountId: string,
    refreshUrl: string,
    returnUrl: string
  ): Promise<Stripe.AccountLink> {
    return stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
  },

  /**
   * Create a login link for the Express dashboard
   */
  async createLoginLink(accountId: string): Promise<Stripe.LoginLink> {
    return stripe.accounts.createLoginLink(accountId);
  },

  /**
   * Get account details
   */
  async getAccount(accountId: string): Promise<Stripe.Account> {
    return stripe.accounts.retrieve(accountId);
  },

  /**
   * Check if account is fully onboarded
   */
  async isOnboarded(accountId: string): Promise<boolean> {
    const account = await stripe.accounts.retrieve(accountId);
    return account.details_submitted && account.charges_enabled && account.payouts_enabled;
  },

  /**
   * Delete/deauthorize a Connect account
   */
  async deleteAccount(accountId: string): Promise<Stripe.DeletedAccount> {
    return stripe.accounts.del(accountId);
  },

  /**
   * Get account balance
   */
  async getBalance(accountId: string): Promise<Stripe.Balance> {
    return stripe.balance.retrieve({
      stripeAccount: accountId,
    });
  },
};

// ============================================================
// TRANSFERS (Payouts to providers)
// ============================================================

export const transfersService = {
  /**
   * Transfer funds to a connected account (provider payout)
   */
  async createTransfer(params: CreateTransferParams): Promise<Stripe.Transfer> {
    return stripe.transfers.create({
      amount: params.amount,
      currency: 'usd',
      destination: params.destinationAccountId,
      description: params.description || 'Provider payout',
      metadata: {
        transaction_id: params.transactionId,
      },
    });
  },

  /**
   * Create a transfer with source transaction (direct charge)
   */
  async createFromCharge(
    chargeId: string,
    destinationAccountId: string,
    amount: number
  ): Promise<Stripe.Transfer> {
    return stripe.transfers.create({
      amount,
      currency: 'usd',
      destination: destinationAccountId,
      source_transaction: chargeId,
    });
  },

  /**
   * Get transfer details
   */
  async get(transferId: string): Promise<Stripe.Transfer> {
    return stripe.transfers.retrieve(transferId);
  },

  /**
   * List transfers to a connected account
   */
  async listByDestination(destinationAccountId: string, limit = 10) {
    return stripe.transfers.list({
      destination: destinationAccountId,
      limit,
    });
  },

  /**
   * Reverse a transfer (clawback)
   */
  async reverse(transferId: string, amount?: number): Promise<Stripe.TransferReversal> {
    return stripe.transfers.createReversal(transferId, {
      amount,
    });
  },
};

// ============================================================
// SUBSCRIPTIONS (Recurring billing)
// ============================================================

export const subscriptionsService = {
  /**
   * Create a subscription for recurring payments
   */
  async create(params: CreateSubscriptionParams): Promise<Stripe.Subscription> {
    return stripe.subscriptions.create({
      customer: params.customerId,
      items: [{ price: params.priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        patient_id: params.patientId,
        provider_id: params.providerId,
        ...params.metadata,
      },
    });
  },

  /**
   * Get subscription by ID
   */
  async get(subscriptionId: string): Promise<Stripe.Subscription> {
    return stripe.subscriptions.retrieve(subscriptionId);
  },

  /**
   * Cancel a subscription
   */
  async cancel(subscriptionId: string, immediately = false): Promise<Stripe.Subscription> {
    if (immediately) {
      return stripe.subscriptions.cancel(subscriptionId);
    }
    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  },

  /**
   * Pause a subscription
   */
  async pause(subscriptionId: string): Promise<Stripe.Subscription> {
    return stripe.subscriptions.update(subscriptionId, {
      pause_collection: {
        behavior: 'void',
      },
    });
  },

  /**
   * Resume a paused subscription
   */
  async resume(subscriptionId: string): Promise<Stripe.Subscription> {
    return stripe.subscriptions.update(subscriptionId, {
      pause_collection: '',
    });
  },

  /**
   * List subscriptions for a customer
   */
  async listByCustomer(customerId: string) {
    return stripe.subscriptions.list({
      customer: customerId,
    });
  },
};

// ============================================================
// PRODUCTS & PRICES
// ============================================================

export const productsService = {
  /**
   * Create a product (e.g., consultation type)
   */
  async create(
    name: string,
    description?: string,
    metadata?: Record<string, string>
  ): Promise<Stripe.Product> {
    return stripe.products.create({
      name,
      description,
      metadata,
    });
  },

  /**
   * Create a price for a product
   */
  async createPrice(
    productId: string,
    unitAmount: number,
    currency = 'usd',
    recurring?: { interval: 'day' | 'week' | 'month' | 'year' }
  ): Promise<Stripe.Price> {
    const priceParams: Stripe.PriceCreateParams = {
      product: productId,
      unit_amount: unitAmount,
      currency,
    };

    if (recurring) {
      priceParams.recurring = recurring;
    }

    return stripe.prices.create(priceParams);
  },

  /**
   * List all products
   */
  async list(active = true) {
    return stripe.products.list({ active });
  },

  /**
   * List prices for a product
   */
  async listPrices(productId: string) {
    return stripe.prices.list({ product: productId });
  },
};

// ============================================================
// INVOICES
// ============================================================

export const invoicesService = {
  /**
   * Create an invoice
   */
  async create(customerId: string, metadata?: Record<string, string>): Promise<Stripe.Invoice> {
    return stripe.invoices.create({
      customer: customerId,
      auto_advance: false,
      metadata,
    });
  },

  /**
   * Add line item to invoice
   */
  async addLineItem(
    invoiceId: string,
    amount: number,
    description: string,
    currency = 'usd'
  ): Promise<Stripe.InvoiceItem> {
    const invoice = await stripe.invoices.retrieve(invoiceId);
    return stripe.invoiceItems.create({
      customer: invoice.customer as string,
      invoice: invoiceId,
      amount,
      currency,
      description,
    });
  },

  /**
   * Finalize and send invoice
   */
  async finalizeAndSend(invoiceId: string): Promise<Stripe.Invoice> {
    await stripe.invoices.finalizeInvoice(invoiceId);
    return stripe.invoices.sendInvoice(invoiceId);
  },

  /**
   * Mark invoice as paid (for external payments)
   */
  async markPaid(invoiceId: string): Promise<Stripe.Invoice> {
    return stripe.invoices.pay(invoiceId, {
      paid_out_of_band: true,
    });
  },

  /**
   * Void an invoice
   */
  async void(invoiceId: string): Promise<Stripe.Invoice> {
    return stripe.invoices.voidInvoice(invoiceId);
  },

  /**
   * Get invoice PDF URL
   */
  async getPdfUrl(invoiceId: string): Promise<string | null> {
    const invoice = await stripe.invoices.retrieve(invoiceId);
    return invoice.invoice_pdf ?? null;
  },
};

// ============================================================
// PAYMENT METHODS
// ============================================================

export const paymentMethodsService = {
  /**
   * Attach a payment method to a customer
   */
  async attach(paymentMethodId: string, customerId: string): Promise<Stripe.PaymentMethod> {
    return stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
  },

  /**
   * Detach a payment method from a customer
   */
  async detach(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    return stripe.paymentMethods.detach(paymentMethodId);
  },

  /**
   * Set default payment method for a customer
   */
  async setDefault(customerId: string, paymentMethodId: string): Promise<Stripe.Customer> {
    return stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  },

  /**
   * Get payment method details
   */
  async get(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    return stripe.paymentMethods.retrieve(paymentMethodId);
  },
};

// ============================================================
// SETUP INTENTS (Save card for later)
// ============================================================

export const setupIntentsService = {
  /**
   * Create a setup intent to save a payment method
   */
  async create(customerId: string): Promise<Stripe.SetupIntent> {
    return stripe.setupIntents.create({
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
    });
  },

  /**
   * Get setup intent
   */
  async get(setupIntentId: string): Promise<Stripe.SetupIntent> {
    return stripe.setupIntents.retrieve(setupIntentId);
  },

  /**
   * Confirm setup intent
   */
  async confirm(setupIntentId: string, paymentMethodId: string): Promise<Stripe.SetupIntent> {
    return stripe.setupIntents.confirm(setupIntentId, {
      payment_method: paymentMethodId,
    });
  },
};

// ============================================================
// CHECKOUT SESSIONS (Hosted payment page)
// ============================================================

export const checkoutService = {
  /**
   * Create a checkout session for a one-time payment
   */
  async createPaymentSession(params: {
    customerId?: string;
    amount: number;
    productName: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Checkout.Session> {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: params.productName,
            },
            unit_amount: params.amount,
          },
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
    };

    if (params.customerId) {
      sessionParams.customer = params.customerId;
    }

    return stripe.checkout.sessions.create(sessionParams);
  },

  /**
   * Create a checkout session for subscription
   */
  async createSubscriptionSession(params: {
    customerId?: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    trialDays?: number;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Checkout.Session> {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
    };

    if (params.customerId) {
      sessionParams.customer = params.customerId;
    }

    if (params.trialDays) {
      sessionParams.subscription_data = {
        trial_period_days: params.trialDays,
      };
    }

    return stripe.checkout.sessions.create(sessionParams);
  },

  /**
   * Get checkout session
   */
  async get(sessionId: string): Promise<Stripe.Checkout.Session> {
    return stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'payment_intent'],
    });
  },
};

// ============================================================
// DISPUTES
// ============================================================

export const disputesService = {
  /**
   * Get dispute details
   */
  async get(disputeId: string): Promise<Stripe.Dispute> {
    return stripe.disputes.retrieve(disputeId);
  },

  /**
   * Submit evidence for a dispute
   */
  async submitEvidence(
    disputeId: string,
    evidence: Stripe.DisputeUpdateParams.Evidence
  ): Promise<Stripe.Dispute> {
    return stripe.disputes.update(disputeId, {
      evidence,
      submit: true,
    });
  },

  /**
   * Close a dispute (accept as lost)
   */
  async close(disputeId: string): Promise<Stripe.Dispute> {
    return stripe.disputes.close(disputeId);
  },

  /**
   * List all disputes
   */
  async list(limit = 10) {
    return stripe.disputes.list({ limit });
  },
};

// ============================================================
// WEBHOOKS
// ============================================================

export const webhooksService = {
  /**
   * Construct and verify webhook event
   */
  constructEvent(payload: string | Buffer, signature: string, webhookSecret: string): Stripe.Event {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  },
};

// Export all services
export const stripeServices = {
  customers: customersService,
  paymentIntents: paymentIntentsService,
  refunds: refundsService,
  connect: connectService,
  transfers: transfersService,
  subscriptions: subscriptionsService,
  products: productsService,
  invoices: invoicesService,
  paymentMethods: paymentMethodsService,
  setupIntents: setupIntentsService,
  checkout: checkoutService,
  disputes: disputesService,
  webhooks: webhooksService,
};

export default stripeServices;
