/**
 * Stripe Webhooks Service Tests
 * Covers: processWebhook, all event handlers (payment_intent, charge, dispute,
 *         customer, subscription, invoice, connect, transfer, payout, checkout)
 */
import { jest } from '@jest/globals';
import type Stripe from 'stripe';

// Supabase mock
const mockInsert = jest.fn<any>().mockReturnValue({ error: null });
const mockUpdate = jest.fn<any>();
const mockEq = jest.fn<any>();
const mockSelect = jest.fn<any>();
const mockSingle = jest.fn<any>();

function createChain(finalResult: any = { data: null, error: null }): any {
  const c: any = {};
  c.select = jest.fn<any>().mockReturnValue(c);
  c.insert = jest.fn<any>().mockReturnValue(c);
  c.update = jest.fn<any>().mockReturnValue(c);
  c.eq = jest.fn<any>().mockReturnValue(c);
  c.single = jest.fn<any>().mockResolvedValue(finalResult);
  c.then = (resolve: any, reject: any) => Promise.resolve(finalResult).then(resolve, reject);
  return c;
}

const mockFrom = jest.fn<any>();

jest.unstable_mockModule('../lib/supabase.js', () => ({
  createServiceClient: () => ({ from: mockFrom }),
  supabase: { from: mockFrom },
}));

jest.unstable_mockModule('../services/email.service.js', () => ({
  sendPaymentSuccessEmail: jest.fn<any>().mockResolvedValue(undefined),
  sendPaymentFailedEmail: jest.fn<any>().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../middleware/logging.middleware.js', () => ({
  logger: {
    info: jest.fn<any>(),
    warn: jest.fn<any>(),
    error: jest.fn<any>(),
    debug: jest.fn<any>(),
  },
}));

jest.unstable_mockModule('../services/metrics.service.js', () => ({
  recordTransaction: jest.fn<any>(),
}));

const { processWebhook } = await import('../services/stripe-webhooks.service.js');
const { recordTransaction } = await import('../services/metrics.service.js');
const { sendPaymentSuccessEmail, sendPaymentFailedEmail } =
  await import('../services/email.service.js');

beforeEach(() => {
  jest.clearAllMocks();
  // Default: all from() calls return a successful chain
  mockFrom.mockReturnValue(createChain({ data: null, error: null }));
});

// Helper to build a minimal Stripe event
function makeEvent(type: string, object: any, extra: any = {}): Stripe.Event {
  return {
    id: 'evt_test_123',
    type,
    data: { object },
    ...extra,
  } as unknown as Stripe.Event;
}

describe('Stripe Webhooks Service', () => {
  // ==================================================================
  // processWebhook dispatcher
  // ==================================================================
  describe('processWebhook', () => {
    it('handles known event types', async () => {
      const event = makeEvent('payment_intent.created', {
        id: 'pi_test',
        amount: 5000,
        currency: 'usd',
        metadata: { patient_id: 'p1', provider_id: 'pr1' },
      });

      await processWebhook(event);
      // Should insert transaction + log webhook event
      expect(mockFrom).toHaveBeenCalled();
    });

    it('handles unknown event types without throwing', async () => {
      const event = makeEvent('some.unknown.event', {});
      await expect(processWebhook(event)).resolves.not.toThrow();
    });

    it('logs all events to stripe_webhook_events table', async () => {
      const event = makeEvent('some.event', { id: 'obj_1' });
      await processWebhook(event);

      expect(mockFrom).toHaveBeenCalledWith('stripe_webhook_events');
    });

    it('handles logWebhookEvent failure gracefully', async () => {
      // Make the stripe_webhook_events insert throw
      mockFrom.mockImplementation((table: string) => {
        if (table === 'stripe_webhook_events') {
          return {
            insert: jest.fn<any>().mockRejectedValue(new Error('DB insert failed')),
          };
        }
        return createChain({ data: null, error: null });
      });

      const event = makeEvent('some.unknown.event', { id: 'obj_fail' });
      // Should not throw despite logWebhookEvent failure
      await expect(processWebhook(event)).resolves.not.toThrow();
    });
  });

  // ==================================================================
  // Payment Intent Handlers
  // ==================================================================
  describe('payment_intent.created', () => {
    it('inserts a pending transaction when metadata has patient_id', async () => {
      const event = makeEvent('payment_intent.created', {
        id: 'pi_001',
        amount: 10000,
        currency: 'usd',
        description: 'Office visit',
        metadata: { patient_id: 'pat-1', provider_id: 'prov-1', appointment_id: 'appt-1' },
      });

      await processWebhook(event);
      expect(mockFrom).toHaveBeenCalledWith('transactions');
    });

    it('skips insert when no patient_id or provider_id', async () => {
      const event = makeEvent('payment_intent.created', {
        id: 'pi_002',
        amount: 5000,
        currency: 'usd',
        metadata: {},
      });

      await processWebhook(event);
      // Only webhook log should be called, not transactions insert
      const transactionCalls = mockFrom.mock.calls.filter((c: any) => c[0] === 'transactions');
      expect(transactionCalls.length).toBe(0);
    });
  });

  describe('payment_intent.succeeded', () => {
    it('updates transaction and sends notification + email', async () => {
      // First call: update transactions → error (so it does insert fallback)
      // We mock separate chains for each from() call
      mockFrom
        .mockReturnValueOnce(createChain({ data: null, error: { message: 'not found' } })) // update
        .mockReturnValueOnce(createChain({ data: null, error: null })) // insert fallback
        .mockReturnValueOnce(createChain({ data: null, error: null })) // notification
        .mockReturnValueOnce(createChain({ data: null, error: null })) // appointments update
        .mockReturnValueOnce(createChain({ data: null, error: null })); // webhook log

      const event = makeEvent('payment_intent.succeeded', {
        id: 'pi_003',
        amount: 20000,
        currency: 'usd',
        latest_charge: 'ch_123',
        receipt_email: 'patient@test.com',
        description: 'Payment',
        metadata: { patient_id: 'pat-1', provider_id: 'prov-1', appointment_id: 'appt-1' },
      });

      await processWebhook(event);
      expect(recordTransaction).toHaveBeenCalledWith(true);
      expect(sendPaymentSuccessEmail).toHaveBeenCalled();
    });

    it('records success metric', async () => {
      const event = makeEvent('payment_intent.succeeded', {
        id: 'pi_004',
        amount: 5000,
        currency: 'usd',
        latest_charge: null,
        receipt_email: null,
        metadata: {},
      });

      await processWebhook(event);
      expect(recordTransaction).toHaveBeenCalledWith(true);
    });
  });

  describe('payment_intent.payment_failed', () => {
    it('updates transaction and notifies patient', async () => {
      const event = makeEvent('payment_intent.payment_failed', {
        id: 'pi_005',
        amount: 5000,
        currency: 'usd',
        receipt_email: 'patient@test.com',
        last_payment_error: { message: 'Card declined' },
        metadata: { patient_id: 'pat-1' },
      });

      await processWebhook(event);
      expect(recordTransaction).toHaveBeenCalledWith(false);
      expect(sendPaymentFailedEmail).toHaveBeenCalledWith(
        'patient@test.com',
        expect.objectContaining({ reason: 'Card declined' })
      );
    });
  });

  describe('payment_intent.canceled', () => {
    it('sets transaction status to cancelled', async () => {
      const event = makeEvent('payment_intent.canceled', {
        id: 'pi_006',
        metadata: {},
      });

      await processWebhook(event);
      expect(mockFrom).toHaveBeenCalledWith('transactions');
    });
  });

  describe('payment_intent.processing', () => {
    it('sets transaction status to processing', async () => {
      const event = makeEvent('payment_intent.processing', {
        id: 'pi_007',
        metadata: {},
      });

      await processWebhook(event);
      expect(mockFrom).toHaveBeenCalledWith('transactions');
    });
  });

  // ==================================================================
  // Charge Handlers
  // ==================================================================
  describe('charge.succeeded', () => {
    it('updates charge details on transaction', async () => {
      const event = makeEvent('charge.succeeded', {
        id: 'ch_001',
        payment_intent: 'pi_001',
        receipt_url: 'https://receipt.stripe.com/abc',
      });

      await processWebhook(event);
      expect(mockFrom).toHaveBeenCalledWith('transactions');
    });
  });

  describe('charge.updated', () => {
    it('updates transaction with latest charge data', async () => {
      const event = makeEvent('charge.updated', {
        id: 'ch_002',
        payment_intent: 'pi_002',
        receipt_url: 'https://receipt.stripe.com/def',
        status: 'succeeded',
      });

      await processWebhook(event);
      expect(mockFrom).toHaveBeenCalledWith('transactions');
    });
  });

  describe('charge.failed', () => {
    it('marks transaction as failed', async () => {
      const event = makeEvent('charge.failed', {
        id: 'ch_003',
        payment_intent: 'pi_003',
        failure_message: 'Insufficient funds',
      });

      await processWebhook(event);
      expect(mockFrom).toHaveBeenCalledWith('transactions');
    });
  });

  describe('charge.refunded', () => {
    it('marks transaction as refunded and notifies patient', async () => {
      // First chain: update transactions (refund status)
      // Second chain: select patient_id from transactions
      // Third chain: insert notification
      mockFrom
        .mockReturnValueOnce(createChain({ data: null, error: null }))
        .mockReturnValueOnce(createChain({ data: { patient_id: 'pat-1' }, error: null }))
        .mockReturnValueOnce(createChain({ data: null, error: null }))
        .mockReturnValueOnce(createChain({ data: null, error: null })); // webhook log

      const event = makeEvent('charge.refunded', {
        id: 'ch_004',
        amount_refunded: 5000,
        refunded: true,
        payment_intent: 'pi_004',
      });

      await processWebhook(event);
      expect(mockFrom).toHaveBeenCalledWith('notifications');
    });

    it('marks partial refund correctly', async () => {
      mockFrom
        .mockReturnValueOnce(createChain({ data: null, error: null }))
        .mockReturnValueOnce(createChain({ data: { patient_id: 'pat-1' }, error: null }))
        .mockReturnValueOnce(createChain({ data: null, error: null }))
        .mockReturnValueOnce(createChain({ data: null, error: null }));

      const event = makeEvent('charge.refunded', {
        id: 'ch_005',
        amount_refunded: 2500,
        refunded: false,
        payment_intent: 'pi_005',
      });

      await processWebhook(event);
      expect(mockFrom).toHaveBeenCalledWith('transactions');
    });
  });

  // ==================================================================
  // Dispute Handlers
  // ==================================================================
  describe('charge.dispute.created', () => {
    it('creates dispute record and notifies provider', async () => {
      mockFrom
        .mockReturnValueOnce(
          createChain({
            data: { id: 'txn-1', patient_id: 'pat-1', provider_id: 'prov-1' },
            error: null,
          })
        ) // transaction lookup
        .mockReturnValueOnce(createChain({ data: null, error: null })) // insert dispute
        .mockReturnValueOnce(createChain({ data: null, error: null })) // notification
        .mockReturnValueOnce(createChain({ data: null, error: null })); // webhook log

      const event = makeEvent('charge.dispute.created', {
        id: 'dp_001',
        charge: 'ch_001',
        reason: 'fraudulent',
        amount: 5000,
        currency: 'usd',
        evidence_details: { due_by: Math.floor(Date.now() / 1000) + 86400 },
      });

      await processWebhook(event);
      expect(mockFrom).toHaveBeenCalledWith('disputes');
      expect(mockFrom).toHaveBeenCalledWith('notifications');
    });
  });

  describe('charge.dispute.updated', () => {
    it('updates dispute status', async () => {
      const event = makeEvent('charge.dispute.updated', {
        id: 'dp_002',
        status: 'needs_response',
      });

      await processWebhook(event);
      expect(mockFrom).toHaveBeenCalledWith('disputes');
    });
  });

  describe('charge.dispute.closed', () => {
    it('marks dispute as won or lost', async () => {
      const event = makeEvent('charge.dispute.closed', {
        id: 'dp_003',
        status: 'won',
      });

      await processWebhook(event);
      expect(mockFrom).toHaveBeenCalledWith('disputes');
    });
  });

  // ==================================================================
  // Customer Handlers
  // ==================================================================
  describe('customer.created', () => {
    it('links stripe customer to user profile', async () => {
      const event = makeEvent('customer.created', {
        id: 'cus_001',
        metadata: { user_id: 'user-1' },
      });

      await processWebhook(event);
      expect(mockFrom).toHaveBeenCalledWith('user_profiles');
    });
  });

  describe('customer.updated', () => {
    it('handles update without error', async () => {
      const event = makeEvent('customer.updated', { id: 'cus_002' });
      await expect(processWebhook(event)).resolves.not.toThrow();
    });
  });

  describe('customer.deleted', () => {
    it('clears stripe_customer_id from profile', async () => {
      const event = makeEvent('customer.deleted', { id: 'cus_003' });
      await processWebhook(event);
      expect(mockFrom).toHaveBeenCalledWith('user_profiles');
    });
  });

  // ==================================================================
  // Subscription Handlers
  // ==================================================================
  describe('customer.subscription.created', () => {
    it('inserts recurring billing record', async () => {
      const event = makeEvent('customer.subscription.created', {
        id: 'sub_001',
        currency: 'usd',
        trial_end: null,
        metadata: { patient_id: 'pat-1', provider_id: 'prov-1' },
        items: {
          data: [
            {
              price: {
                unit_amount: 5000,
                recurring: { interval: 'month' },
              },
            },
          ],
        },
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
      });

      await processWebhook(event);
      expect(mockFrom).toHaveBeenCalledWith('recurring_billing');
    });
  });

  describe('customer.subscription.updated', () => {
    it('updates subscription status', async () => {
      const event = makeEvent('customer.subscription.updated', {
        id: 'sub_002',
        status: 'active',
        cancel_at: null,
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
      });

      await processWebhook(event);
      expect(mockFrom).toHaveBeenCalledWith('recurring_billing');
    });
  });

  describe('customer.subscription.deleted', () => {
    it('marks subscription as cancelled', async () => {
      const event = makeEvent('customer.subscription.deleted', { id: 'sub_003' });
      await processWebhook(event);
      expect(mockFrom).toHaveBeenCalledWith('recurring_billing');
    });
  });

  describe('customer.subscription.trial_will_end', () => {
    it('notifies patient about trial ending', async () => {
      const event = makeEvent('customer.subscription.trial_will_end', {
        id: 'sub_004',
        metadata: { patient_id: 'pat-1' },
      });

      await processWebhook(event);
      expect(mockFrom).toHaveBeenCalledWith('notifications');
    });
  });

  // ==================================================================
  // Invoice Handlers
  // ==================================================================
  describe('invoice.created', () => {
    it('handles without error', async () => {
      const event = makeEvent('invoice.created', { id: 'inv_001' });
      await expect(processWebhook(event)).resolves.not.toThrow();
    });
  });

  describe('invoice.paid', () => {
    it('marks invoice as paid', async () => {
      const event = makeEvent('invoice.paid', { id: 'inv_002' });
      await processWebhook(event);
      expect(mockFrom).toHaveBeenCalledWith('invoices');
    });
  });

  describe('invoice.payment_failed', () => {
    it('notifies user about failed payment', async () => {
      mockFrom
        .mockReturnValueOnce(createChain({ data: { id: 'user-1' }, error: null }))
        .mockReturnValueOnce(createChain({ data: null, error: null }))
        .mockReturnValueOnce(createChain({ data: null, error: null }));

      const event = makeEvent('invoice.payment_failed', {
        id: 'inv_003',
        number: 'INV-003',
        customer: 'cus_001',
      });

      await processWebhook(event);
      expect(mockFrom).toHaveBeenCalledWith('user_profiles');
      expect(mockFrom).toHaveBeenCalledWith('notifications');
    });
  });

  describe('invoice.finalized', () => {
    it('updates invoice with PDF link', async () => {
      const event = makeEvent('invoice.finalized', {
        id: 'inv_004',
        invoice_pdf: 'https://stripe.com/invoice.pdf',
      });

      await processWebhook(event);
      expect(mockFrom).toHaveBeenCalledWith('invoices');
    });
  });

  describe('invoice.upcoming', () => {
    it('notifies user about upcoming payment', async () => {
      mockFrom
        .mockReturnValueOnce(createChain({ data: { id: 'user-1' }, error: null }))
        .mockReturnValueOnce(createChain({ data: null, error: null }))
        .mockReturnValueOnce(createChain({ data: null, error: null }));

      const event = makeEvent('invoice.upcoming', {
        id: 'inv_005',
        amount_due: 5000,
        customer: 'cus_001',
        due_date: Math.floor(Date.now() / 1000) + 86400 * 7,
      });

      await processWebhook(event);
      expect(mockFrom).toHaveBeenCalledWith('notifications');
    });
  });

  // ==================================================================
  // Connect Account Handlers
  // ==================================================================
  describe('account.updated', () => {
    it('updates provider stripe status when fully onboarded', async () => {
      mockFrom
        .mockReturnValueOnce(createChain({ data: null, error: null })) // update providers
        .mockReturnValueOnce(createChain({ data: { user_id: 'user-1' }, error: null })) // provider lookup
        .mockReturnValueOnce(createChain({ data: null, error: null })) // notification
        .mockReturnValueOnce(createChain({ data: null, error: null })); // webhook log

      const event = makeEvent('account.updated', {
        id: 'acct_001',
        details_submitted: true,
        charges_enabled: true,
        payouts_enabled: true,
        metadata: { provider_id: 'prov-1' },
      });

      await processWebhook(event);
      expect(mockFrom).toHaveBeenCalledWith('providers');
      expect(mockFrom).toHaveBeenCalledWith('notifications');
    });

    it('skips when no provider_id in metadata', async () => {
      const event = makeEvent('account.updated', {
        id: 'acct_002',
        details_submitted: false,
        charges_enabled: false,
        payouts_enabled: false,
        metadata: {},
      });

      await processWebhook(event);
      // Should only log the event, not touch providers
      const providerCalls = mockFrom.mock.calls.filter((c: any) => c[0] === 'providers');
      expect(providerCalls.length).toBe(0);
    });
  });

  describe('account.application.deauthorized', () => {
    it('resets provider stripe info', async () => {
      const event = makeEvent('account.application.deauthorized', { id: 'acct_003' });
      await processWebhook(event);
      expect(mockFrom).toHaveBeenCalledWith('providers');
    });
  });

  // ==================================================================
  // Transfer Handlers
  // ==================================================================
  describe('transfer.created', () => {
    it('updates transaction with transfer id', async () => {
      const event = makeEvent('transfer.created', {
        id: 'tr_001',
        metadata: { transaction_id: 'txn-1' },
      });

      await processWebhook(event);
      expect(mockFrom).toHaveBeenCalledWith('transactions');
    });

    it('skips when no transaction_id', async () => {
      const event = makeEvent('transfer.created', {
        id: 'tr_002',
        metadata: {},
      });

      await processWebhook(event);
      const txnCalls = mockFrom.mock.calls.filter((c: any) => c[0] === 'transactions');
      expect(txnCalls.length).toBe(0);
    });
  });

  describe('transfer.failed', () => {
    it('marks payout status as failed', async () => {
      const event = makeEvent('transfer.failed', { id: 'tr_003' });
      await processWebhook(event);
      expect(mockFrom).toHaveBeenCalledWith('transactions');
    });
  });

  describe('transfer.reversed', () => {
    it('marks payout status as reversed', async () => {
      const event = makeEvent('transfer.reversed', { id: 'tr_004' });
      await processWebhook(event);
      expect(mockFrom).toHaveBeenCalledWith('transactions');
    });
  });

  // ==================================================================
  // Payout Handlers
  // ==================================================================
  describe('payout.created', () => {
    it('handles without error', async () => {
      const event = makeEvent('payout.created', { id: 'po_001' });
      await expect(processWebhook(event)).resolves.not.toThrow();
    });
  });

  describe('payout.paid', () => {
    it('notifies provider about payout', async () => {
      mockFrom
        .mockReturnValueOnce(createChain({ data: { user_id: 'user-1' }, error: null }))
        .mockReturnValueOnce(createChain({ data: null, error: null }))
        .mockReturnValueOnce(createChain({ data: null, error: null }));

      const event = makeEvent(
        'payout.paid',
        { id: 'po_002', amount: 10000 },
        { account: 'acct_001' }
      );
      await processWebhook(event);
      expect(mockFrom).toHaveBeenCalledWith('notifications');
    });
  });

  describe('payout.failed', () => {
    it('notifies provider about failed payout', async () => {
      mockFrom
        .mockReturnValueOnce(createChain({ data: { user_id: 'user-1' }, error: null }))
        .mockReturnValueOnce(createChain({ data: null, error: null }))
        .mockReturnValueOnce(createChain({ data: null, error: null }));

      const event = makeEvent(
        'payout.failed',
        { id: 'po_003', amount: 5000 },
        { account: 'acct_001' }
      );
      await processWebhook(event);
      expect(mockFrom).toHaveBeenCalledWith('notifications');
    });
  });

  // ==================================================================
  // Checkout Session Handlers
  // ==================================================================
  describe('checkout.session.completed', () => {
    it('inserts transaction for one-time payment', async () => {
      const event = makeEvent('checkout.session.completed', {
        id: 'cs_001',
        mode: 'payment',
        amount_total: 10000,
        currency: 'usd',
        payment_intent: 'pi_010',
        metadata: { patient_id: 'pat-1', provider_id: 'prov-1' },
      });

      await processWebhook(event);
      expect(mockFrom).toHaveBeenCalledWith('transactions');
    });

    it('handles subscription mode without inserting transaction', async () => {
      const event = makeEvent('checkout.session.completed', {
        id: 'cs_002',
        mode: 'subscription',
        subscription: 'sub_010',
        metadata: {},
      });

      await processWebhook(event);
      // Transaction insert should NOT be called for subscription mode
      const txnInserts = mockFrom.mock.calls.filter((c: any) => c[0] === 'transactions');
      expect(txnInserts.length).toBe(0);
    });
  });

  describe('checkout.session.expired', () => {
    it('handles without error', async () => {
      const event = makeEvent('checkout.session.expired', { id: 'cs_003' });
      await expect(processWebhook(event)).resolves.not.toThrow();
    });
  });

  describe('notification creation error', () => {
    it('handles createNotification failure gracefully', async () => {
      // Make notifications insert throw to cover the catch block
      mockFrom.mockImplementation((table: string) => {
        if (table === 'notifications') {
          return {
            insert: jest.fn<any>().mockRejectedValue(new Error('Notification insert failed')),
          };
        }
        return createChain({ data: null, error: null });
      });

      // Use an event that triggers notification creation (payment succeeded)
      const event = makeEvent('payment_intent.succeeded', {
        id: 'pi_notif_fail',
        amount: 2000,
        currency: 'usd',
        metadata: { patient_id: 'pat-1', provider_id: 'prov-1', appointment_id: 'apt-1' },
        charges: { data: [{ receipt_url: 'https://receipt.url' }] },
      });

      // Should not throw despite notification failure
      await expect(processWebhook(event)).resolves.not.toThrow();
    });
  });
});
