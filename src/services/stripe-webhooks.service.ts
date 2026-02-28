import Stripe from 'stripe';
import { createServiceClient } from '../lib/supabase.js';
import { sendPaymentSuccessEmail, sendPaymentFailedEmail } from './email.service.js';
import { logger } from '../middleware/logging.middleware.js';
import { recordTransaction } from './metrics.service.js';

// Use service role client for webhook operations (bypasses RLS)
const supabase = createServiceClient();

/**
 * Stripe Webhook Event Handler
 * Processes incoming Stripe webhook events and updates the database accordingly
 */

type WebhookHandler = (event: Stripe.Event) => Promise<void>;

// Map of event types to their handlers
const eventHandlers: Record<string, WebhookHandler> = {
  // Payment Intent Events
  'payment_intent.created': handlePaymentIntentCreated,
  'payment_intent.succeeded': handlePaymentIntentSucceeded,
  'payment_intent.payment_failed': handlePaymentIntentFailed,
  'payment_intent.canceled': handlePaymentIntentCanceled,
  'payment_intent.processing': handlePaymentIntentProcessing,

  // Charge Events
  'charge.succeeded': handleChargeSucceeded,
  'charge.updated': handleChargeUpdated,
  'charge.failed': handleChargeFailed,
  'charge.refunded': handleChargeRefunded,
  'charge.dispute.created': handleDisputeCreated,
  'charge.dispute.updated': handleDisputeUpdated,
  'charge.dispute.closed': handleDisputeClosed,

  // Customer Events
  'customer.created': handleCustomerCreated,
  'customer.updated': handleCustomerUpdated,
  'customer.deleted': handleCustomerDeleted,

  // Subscription Events
  'customer.subscription.created': handleSubscriptionCreated,
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionDeleted,
  'customer.subscription.trial_will_end': handleSubscriptionTrialEnding,

  // Invoice Events
  'invoice.created': handleInvoiceCreated,
  'invoice.paid': handleInvoicePaid,
  'invoice.payment_failed': handleInvoicePaymentFailed,
  'invoice.finalized': handleInvoiceFinalized,
  'invoice.upcoming': handleInvoiceUpcoming,

  // Connect Events
  'account.updated': handleConnectAccountUpdated,
  'account.application.deauthorized': handleConnectAccountDeauthorized,

  // Transfer Events
  'transfer.created': handleTransferCreated,
  'transfer.failed': handleTransferFailed,
  'transfer.reversed': handleTransferReversed,

  // Payout Events (for connected accounts)
  'payout.created': handlePayoutCreated,
  'payout.paid': handlePayoutPaid,
  'payout.failed': handlePayoutFailed,

  // Checkout Session Events
  'checkout.session.completed': handleCheckoutSessionCompleted,
  'checkout.session.expired': handleCheckoutSessionExpired,
};

/**
 * Main webhook processor
 */
export async function processWebhook(event: Stripe.Event): Promise<void> {
  const handler = eventHandlers[event.type];

  if (handler) {
    logger.info('Processing webhook', { type: event.type, id: event.id });
    await handler(event);
  } else {
    logger.debug('Unhandled webhook event', { type: event.type });
  }

  // Log all webhook events
  await logWebhookEvent(event);
}

/**
 * Log webhook event to database
 */
async function logWebhookEvent(event: Stripe.Event): Promise<void> {
  try {
    await supabase.from('stripe_webhook_events').insert({
      event_id: event.id,
      event_type: event.type,
      payload: event.data.object,
      processed_at: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to log webhook event', error as Error, { eventId: event.id });
  }
}

// ============================================================
// PAYMENT INTENT HANDLERS
// ============================================================

async function handlePaymentIntentCreated(event: Stripe.Event): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const { patient_id, provider_id, appointment_id } = paymentIntent.metadata;

  // Create a pending transaction record
  if (patient_id || provider_id) {
    await supabase.from('transactions').insert({
      patient_id: patient_id || null,
      provider_id: provider_id || null,
      appointment_id: appointment_id || null,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      payment_status: 'pending',
      stripe_payment_intent_id: paymentIntent.id,
      description: paymentIntent.description || 'Payment',
      created_at: new Date().toISOString(),
    });
  }
}

async function handlePaymentIntentSucceeded(event: Stripe.Event): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const { patient_id, provider_id, appointment_id } = paymentIntent.metadata;

  // Track payment success metric
  recordTransaction(true);

  // Update transaction status
  const { error } = await supabase
    .from('transactions')
    .update({
      payment_status: 'succeeded',
      stripe_payment_intent_id: paymentIntent.id,
      stripe_charge_id: paymentIntent.latest_charge as string,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  if (error) {
    // If no existing transaction, create one
    await supabase.from('transactions').insert({
      patient_id,
      provider_id,
      appointment_id: appointment_id || null,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      payment_status: 'succeeded',
      stripe_payment_intent_id: paymentIntent.id,
      stripe_charge_id: paymentIntent.latest_charge as string,
      description: paymentIntent.description || 'Payment',
      processed_at: new Date().toISOString(),
    });
  }

  // Create notification for patient
  if (patient_id) {
    await createNotification(
      patient_id,
      'payment_alert',
      'Payment Successful',
      `Your payment of $${(paymentIntent.amount / 100).toFixed(2)} was processed successfully.`
    );
  }

  // Send email notification
  if (paymentIntent.receipt_email) {
    await sendPaymentSuccessEmail(paymentIntent.receipt_email, {
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      description: paymentIntent.description || undefined,
      transactionId: paymentIntent.id,
      receiptUrl: undefined, // Will be available from charge
    });
  }

  // Update appointment if linked
  if (appointment_id) {
    await supabase.from('appointments').update({ payment_status: 'paid' }).eq('id', appointment_id);
  }
}

async function handlePaymentIntentFailed(event: Stripe.Event): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const { patient_id } = paymentIntent.metadata;

  // Track payment failure metric
  recordTransaction(false);

  await supabase
    .from('transactions')
    .update({
      payment_status: 'failed',
      failure_reason: paymentIntent.last_payment_error?.message,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  if (patient_id) {
    await createNotification(
      patient_id,
      'payment_alert',
      'Payment Failed',
      `Your payment of $${(paymentIntent.amount / 100).toFixed(2)} could not be processed. Please try again.`
    );
  }

  // Send email notification
  if (paymentIntent.receipt_email) {
    await sendPaymentFailedEmail(paymentIntent.receipt_email, {
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      reason: paymentIntent.last_payment_error?.message,
    });
  }
}

async function handlePaymentIntentCanceled(event: Stripe.Event): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  await supabase
    .from('transactions')
    .update({
      payment_status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);
}

async function handlePaymentIntentProcessing(event: Stripe.Event): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  await supabase
    .from('transactions')
    .update({
      payment_status: 'processing',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);
}

// ============================================================
// CHARGE HANDLERS
// ============================================================

async function handleChargeSucceeded(event: Stripe.Event): Promise<void> {
  const charge = event.data.object as Stripe.Charge;

  await supabase
    .from('transactions')
    .update({
      stripe_charge_id: charge.id,
      receipt_url: charge.receipt_url,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', charge.payment_intent);
}

async function handleChargeUpdated(event: Stripe.Event): Promise<void> {
  const charge = event.data.object as Stripe.Charge;

  // Update transaction with latest charge details
  await supabase
    .from('transactions')
    .update({
      stripe_charge_id: charge.id,
      receipt_url: charge.receipt_url,
      payment_status: charge.status === 'succeeded' ? 'succeeded' : charge.status,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', charge.payment_intent);
}

async function handleChargeFailed(event: Stripe.Event): Promise<void> {
  const charge = event.data.object as Stripe.Charge;

  await supabase
    .from('transactions')
    .update({
      payment_status: 'failed',
      failure_reason: charge.failure_message,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', charge.payment_intent);
}

async function handleChargeRefunded(event: Stripe.Event): Promise<void> {
  const charge = event.data.object as Stripe.Charge;

  const refundAmount = charge.amount_refunded / 100;
  const isFullRefund = charge.refunded;

  await supabase
    .from('transactions')
    .update({
      payment_status: isFullRefund ? 'refunded' : 'partially_refunded',
      refunded_amount: refundAmount,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_charge_id', charge.id);

  // Create notification
  const { data: transaction } = await supabase
    .from('transactions')
    .select('patient_id')
    .eq('stripe_charge_id', charge.id)
    .single();

  if (transaction?.patient_id) {
    await createNotification(
      transaction.patient_id,
      'payment_alert',
      'Refund Processed',
      `A refund of $${refundAmount.toFixed(2)} has been processed to your account.`
    );
  }
}

// ============================================================
// DISPUTE HANDLERS
// ============================================================

async function handleDisputeCreated(event: Stripe.Event): Promise<void> {
  const dispute = event.data.object as Stripe.Dispute;

  // Find the transaction
  const { data: transaction } = await supabase
    .from('transactions')
    .select('id, patient_id, provider_id')
    .eq('stripe_charge_id', dispute.charge)
    .single();

  if (transaction) {
    // Create dispute record
    await supabase.from('disputes').insert({
      transaction_id: transaction.id,
      stripe_dispute_id: dispute.id,
      reason: dispute.reason,
      status: 'new',
      amount: dispute.amount / 100,
      currency: dispute.currency.toUpperCase(),
      evidence_due_by: dispute.evidence_details?.due_by
        ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
        : null,
    });

    // Notify provider
    if (transaction.provider_id) {
      await createNotification(
        transaction.provider_id,
        'payment_alert',
        'Dispute Received',
        `A payment dispute has been filed. Please review and submit evidence.`
      );
    }
  }
}

async function handleDisputeUpdated(event: Stripe.Event): Promise<void> {
  const dispute = event.data.object as Stripe.Dispute;

  await supabase
    .from('disputes')
    .update({
      status: mapDisputeStatus(dispute.status),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_dispute_id', dispute.id);
}

async function handleDisputeClosed(event: Stripe.Event): Promise<void> {
  const dispute = event.data.object as Stripe.Dispute;

  await supabase
    .from('disputes')
    .update({
      status: dispute.status === 'won' ? 'won' : 'lost',
      resolution_outcome: dispute.status,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_dispute_id', dispute.id);
}

function mapDisputeStatus(stripeStatus: string): string {
  const statusMap: Record<string, string> = {
    warning_needs_response: 'evidence_required',
    warning_under_review: 'under_review',
    warning_closed: 'closed',
    needs_response: 'evidence_required',
    under_review: 'under_review',
    won: 'won',
    lost: 'lost',
  };
  return statusMap[stripeStatus] || 'under_review';
}

// ============================================================
// CUSTOMER HANDLERS
// ============================================================

async function handleCustomerCreated(event: Stripe.Event): Promise<void> {
  const customer = event.data.object as Stripe.Customer;
  const userId = customer.metadata?.user_id;

  if (userId) {
    await supabase
      .from('user_profiles')
      .update({ stripe_customer_id: customer.id })
      .eq('id', userId);
  }
}

async function handleCustomerUpdated(event: Stripe.Event): Promise<void> {
  // Handle customer updates if needed
  logger.debug('Customer updated', { customerId: (event.data.object as Stripe.Customer).id });
}

async function handleCustomerDeleted(event: Stripe.Event): Promise<void> {
  const customer = event.data.object as Stripe.Customer;

  await supabase
    .from('user_profiles')
    .update({ stripe_customer_id: null })
    .eq('stripe_customer_id', customer.id);
}

// ============================================================
// SUBSCRIPTION HANDLERS
// ============================================================

async function handleSubscriptionCreated(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const { patient_id, provider_id } = subscription.metadata;

  await supabase.from('recurring_billing').insert({
    patient_id,
    provider_id,
    stripe_subscription_id: subscription.id,
    status: 'active',
    billing_frequency: mapBillingInterval(subscription.items.data[0]?.price.recurring?.interval),
    amount: subscription.items.data[0]?.price.unit_amount
      ? subscription.items.data[0].price.unit_amount / 100
      : 0,
    currency: subscription.currency.toUpperCase(),
    current_period_start: (subscription as any).current_period_start
      ? new Date((subscription as any).current_period_start * 1000).toISOString()
      : null,
    current_period_end: (subscription as any).current_period_end
      ? new Date((subscription as any).current_period_end * 1000).toISOString()
      : null,
    trial_end: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
  });
}

async function handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;

  await supabase
    .from('recurring_billing')
    .update({
      status: mapSubscriptionStatus(subscription.status),
      current_period_start: (subscription as any).current_period_start
        ? new Date((subscription as any).current_period_start * 1000).toISOString()
        : null,
      current_period_end: (subscription as any).current_period_end
        ? new Date((subscription as any).current_period_end * 1000).toISOString()
        : null,
      cancel_at: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);
}

async function handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;

  await supabase
    .from('recurring_billing')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);
}

async function handleSubscriptionTrialEnding(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const { patient_id } = subscription.metadata;

  if (patient_id) {
    await createNotification(
      patient_id,
      'payment_alert',
      'Trial Ending Soon',
      'Your trial period will end in 3 days. Please add a payment method to continue.'
    );
  }
}

function mapSubscriptionStatus(status: Stripe.Subscription.Status): string {
  const statusMap: Record<string, string> = {
    active: 'active',
    past_due: 'active',
    unpaid: 'paused',
    canceled: 'cancelled',
    incomplete: 'active',
    incomplete_expired: 'cancelled',
    trialing: 'active',
    paused: 'paused',
  };
  return statusMap[status] || 'active';
}

function mapBillingInterval(interval?: string): string {
  const intervalMap: Record<string, string> = {
    day: 'daily',
    week: 'weekly',
    month: 'monthly',
    year: 'yearly',
  };
  return intervalMap[interval || 'month'] || 'monthly';
}

// ============================================================
// INVOICE HANDLERS
// ============================================================

async function handleInvoiceCreated(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  logger.debug('Invoice created', { invoiceId: invoice.id });
}

async function handleInvoicePaid(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;

  // Update our invoice record if it exists
  await supabase
    .from('invoices')
    .update({
      status: 'paid',
      stripe_invoice_id: invoice.id,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_invoice_id', invoice.id);
}

async function handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = invoice.customer as string;

  // Get user from customer ID
  const { data: user } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (user) {
    await createNotification(
      user.id,
      'payment_alert',
      'Invoice Payment Failed',
      `Payment for invoice ${invoice.number || invoice.id} failed. Please update your payment method.`
    );
  }
}

async function handleInvoiceFinalized(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;

  await supabase
    .from('invoices')
    .update({
      status: 'sent',
      stripe_invoice_id: invoice.id,
      pdf_url: invoice.invoice_pdf,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_invoice_id', invoice.id);
}

async function handleInvoiceUpcoming(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = invoice.customer as string;

  const { data: user } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (user) {
    await createNotification(
      user.id,
      'payment_alert',
      'Upcoming Payment',
      `You have an upcoming payment of $${((invoice.amount_due || 0) / 100).toFixed(2)} on ${
        invoice.due_date
          ? new Date(invoice.due_date * 1000).toLocaleDateString()
          : 'your next billing date'
      }.`
    );
  }
}

// ============================================================
// CONNECT ACCOUNT HANDLERS
// ============================================================

async function handleConnectAccountUpdated(event: Stripe.Event): Promise<void> {
  const account = event.data.object as Stripe.Account;
  const providerId = account.metadata?.provider_id;

  if (providerId) {
    const isOnboarded =
      account.details_submitted && account.charges_enabled && account.payouts_enabled;

    await supabase
      .from('providers')
      .update({
        stripe_account_id: account.id,
        stripe_onboarding_complete: isOnboarded,
        stripe_charges_enabled: account.charges_enabled,
        stripe_payouts_enabled: account.payouts_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', providerId);

    if (isOnboarded) {
      // Get provider's user_id for notification
      const { data: provider } = await supabase
        .from('providers')
        .select('user_id')
        .eq('id', providerId)
        .single();

      if (provider?.user_id) {
        await createNotification(
          provider.user_id,
          'system_update',
          'Payment Setup Complete',
          'Your payment account is now fully set up. You can now receive payments from patients.'
        );
      }
    }
  }
}

async function handleConnectAccountDeauthorized(event: Stripe.Event): Promise<void> {
  const account = event.data.object as Stripe.Account;

  await supabase
    .from('providers')
    .update({
      stripe_account_id: null,
      stripe_onboarding_complete: false,
      stripe_charges_enabled: false,
      stripe_payouts_enabled: false,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_account_id', account.id);
}

// ============================================================
// TRANSFER HANDLERS
// ============================================================

async function handleTransferCreated(event: Stripe.Event): Promise<void> {
  const transfer = event.data.object as Stripe.Transfer;
  const transactionId = transfer.metadata?.transaction_id;

  if (transactionId) {
    await supabase
      .from('transactions')
      .update({
        provider_payout_status: 'pending',
        stripe_transfer_id: transfer.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId);
  }
}

async function handleTransferFailed(event: Stripe.Event): Promise<void> {
  const transfer = event.data.object as Stripe.Transfer;

  await supabase
    .from('transactions')
    .update({
      provider_payout_status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_transfer_id', transfer.id);
}

async function handleTransferReversed(event: Stripe.Event): Promise<void> {
  const transfer = event.data.object as Stripe.Transfer;

  await supabase
    .from('transactions')
    .update({
      provider_payout_status: 'reversed',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_transfer_id', transfer.id);
}

// ============================================================
// PAYOUT HANDLERS
// ============================================================

async function handlePayoutCreated(event: Stripe.Event): Promise<void> {
  logger.debug('Payout created', { payoutId: (event.data.object as Stripe.Payout).id });
}

async function handlePayoutPaid(event: Stripe.Event): Promise<void> {
  const payout = event.data.object as Stripe.Payout;
  const connectedAccountId = event.account;

  if (connectedAccountId) {
    // Get provider by stripe account
    const { data: provider } = await supabase
      .from('providers')
      .select('user_id')
      .eq('stripe_account_id', connectedAccountId)
      .single();

    if (provider?.user_id) {
      await createNotification(
        provider.user_id,
        'payment_alert',
        'Payout Sent',
        `A payout of $${(payout.amount / 100).toFixed(2)} has been sent to your bank account.`
      );
    }
  }
}

async function handlePayoutFailed(event: Stripe.Event): Promise<void> {
  const payout = event.data.object as Stripe.Payout;
  const connectedAccountId = event.account;

  if (connectedAccountId) {
    const { data: provider } = await supabase
      .from('providers')
      .select('user_id')
      .eq('stripe_account_id', connectedAccountId)
      .single();

    if (provider?.user_id) {
      await createNotification(
        provider.user_id,
        'payment_alert',
        'Payout Failed',
        `A payout of $${(payout.amount / 100).toFixed(2)} failed. Please check your bank account details.`
      );
    }
  }
}

// ============================================================
// CHECKOUT SESSION HANDLERS
// ============================================================

async function handleCheckoutSessionCompleted(event: Stripe.Event): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;

  if (session.mode === 'payment') {
    // Handle one-time payment checkout
    const { patient_id, provider_id, appointment_id } = session.metadata || {};

    if (patient_id && provider_id) {
      await supabase.from('transactions').insert({
        patient_id,
        provider_id,
        appointment_id: appointment_id || null,
        amount: (session.amount_total || 0) / 100,
        currency: session.currency?.toUpperCase() || 'USD',
        payment_status: 'succeeded',
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string,
        description: 'Checkout payment',
        processed_at: new Date().toISOString(),
      });
    }
  } else if (session.mode === 'subscription') {
    // Subscription handled by subscription.created webhook
    logger.debug('Subscription checkout completed', { subscriptionId: session.subscription });
  }
}

async function handleCheckoutSessionExpired(event: Stripe.Event): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;
  logger.debug('Checkout session expired', { sessionId: session.id });
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string
): Promise<void> {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      notification_type: type,
      priority: 'medium',
      title,
      message,
      read_status: 'unread',
    });
  } catch (error) {
    logger.error('Failed to create notification', error as Error, { userId, type });
  }
}

export default processWebhook;
