/**
 * Database Webhook Service
 * Handles Supabase database webhook events for real-time notifications
 */

import { createServiceClient } from '../lib/supabase.js';
import emailService from './email.service.js';
import { logger } from '../middleware/logging.middleware.js';

// Webhook payload types from Supabase
export interface WebhookPayload<T = Record<string, unknown>> {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: T | null;
  old_record: T | null;
}

// Table record types - exported for routes
export interface TransactionRecord {
  id: string;
  patient_id: string;
  provider_id: string;
  amount: number;
  currency: string;
  status: string;
  description?: string;
  stripe_payment_intent_id?: string;
  created_at: string;
}

export interface DisputeRecord {
  id: string;
  transaction_id: string;
  patient_id: string;
  provider_id: string;
  amount: number;
  reason: string;
  status: string;
  created_at: string;
}

export interface AppointmentRecord {
  id: string;
  patient_id: string;
  provider_id: string;
  scheduled_at: string;
  service_type: string;
  status: string;
  notes?: string;
  created_at: string;
}

export interface WalletTransactionRecord {
  id: string;
  wallet_id: string;
  transaction_type: string;
  amount: number;
  currency: string;
  status: string;
  tx_hash?: string;
  created_at: string;
  updated_at: string;
}

interface NotificationRecord {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

// Helper to get user details
async function getUserDetails(
  userId: string
): Promise<{ email?: string; full_name?: string; phone?: string } | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('email, full_name, phone')
    .eq('id', userId)
    .single();

  if (error) {
    logger.warn('Failed to get user details', { userId, error: error.message });
    return null;
  }
  return data;
}

// Helper to get provider details
async function getProviderDetails(
  providerId: string
): Promise<{ business_name?: string; email?: string } | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('providers')
    .select('business_name, contact_email')
    .eq('id', providerId)
    .single();

  if (error) {
    logger.warn('Failed to get provider details', { providerId, error: error.message });
    return null;
  }
  return { business_name: data?.business_name, email: data?.contact_email };
}

// Create in-app notification
async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  metadata?: Record<string, unknown>
) {
  const supabase = createServiceClient();
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    notification_type: type as 'system' | 'transaction' | 'security' | 'compliance' | 'marketing',
    title,
    message,
    metadata,
    read_status: 'unread',
  });

  if (error) {
    logger.error('Failed to create notification', undefined, {
      userId,
      type,
      errorMessage: error.message,
    });
  }
}

export const databaseWebhookService = {
  /**
   * Handle transaction events
   */
  async handleTransaction(payload: WebhookPayload<TransactionRecord>): Promise<void> {
    const { type, record, old_record } = payload;

    if (!record) {
      logger.warn('Transaction webhook received without record');
      return;
    }

    logger.info('Processing transaction webhook', {
      type,
      transactionId: record.id,
      status: record.status,
    });

    // Handle new completed payment
    if (type === 'INSERT' && record.status === 'completed') {
      await this.notifyPaymentCompleted(record);
    }

    // Handle status change to completed
    if (type === 'UPDATE' && old_record?.status !== 'completed' && record.status === 'completed') {
      await this.notifyPaymentCompleted(record);
    }

    // Handle failed payment
    if (type === 'UPDATE' && record.status === 'failed' && old_record?.status !== 'failed') {
      await this.notifyPaymentFailed(record);
    }

    // Handle refund
    if (type === 'UPDATE' && record.status === 'refunded' && old_record?.status !== 'refunded') {
      await this.notifyPaymentRefunded(record);
    }
  },

  /**
   * Handle dispute events
   */
  async handleDispute(payload: WebhookPayload<DisputeRecord>): Promise<void> {
    const { type, record, old_record } = payload;

    if (!record) return;

    logger.info('Processing dispute webhook', {
      type,
      disputeId: record.id,
      status: record.status,
    });

    // New dispute opened
    if (type === 'INSERT') {
      await this.notifyDisputeOpened(record);
    }

    // Dispute status changed
    if (type === 'UPDATE' && old_record?.status !== record.status) {
      await this.notifyDisputeStatusChanged(record, old_record?.status);
    }
  },

  /**
   * Handle appointment events
   */
  async handleAppointment(payload: WebhookPayload<AppointmentRecord>): Promise<void> {
    const { type, record, old_record } = payload;

    if (!record) return;

    logger.info('Processing appointment webhook', {
      type,
      appointmentId: record.id,
      status: record.status,
    });

    // New appointment created
    if (type === 'INSERT') {
      await this.notifyAppointmentCreated(record);
    }

    // Appointment confirmed
    if (type === 'UPDATE' && record.status === 'confirmed' && old_record?.status !== 'confirmed') {
      await this.notifyAppointmentConfirmed(record);
    }

    // Appointment cancelled
    if (type === 'UPDATE' && record.status === 'cancelled' && old_record?.status !== 'cancelled') {
      await this.notifyAppointmentCancelled(record);
    }

    // Appointment rescheduled
    if (type === 'UPDATE' && old_record?.scheduled_at !== record.scheduled_at) {
      await this.notifyAppointmentRescheduled(record, old_record?.scheduled_at);
    }
  },

  /**
   * Handle wallet transaction events (crypto payouts)
   */
  async handleWalletTransaction(payload: WebhookPayload<WalletTransactionRecord>): Promise<void> {
    const { type, record, old_record } = payload;

    if (!record) return;

    logger.info('Processing wallet transaction webhook', {
      type,
      walletTxId: record.id,
      status: record.status,
    });

    // Payout completed
    if (type === 'UPDATE' && record.status === 'completed' && old_record?.status !== 'completed') {
      await this.notifyPayoutCompleted(record);
    }

    // Payout failed
    if (type === 'UPDATE' && record.status === 'failed' && old_record?.status !== 'failed') {
      await this.notifyPayoutFailed(record);
    }
  },

  // ============================================================
  // NOTIFICATION IMPLEMENTATIONS
  // ============================================================

  async notifyPaymentCompleted(transaction: TransactionRecord): Promise<void> {
    // Notify patient
    const patient = await getUserDetails(transaction.patient_id);
    if (patient?.email) {
      await emailService.sendEmail({
        to: patient.email,
        template: 'payment_succeeded',
        data: {
          customerName: patient.full_name,
          amount: (transaction.amount / 100).toFixed(2),
          currency: transaction.currency.toUpperCase(),
          description: transaction.description,
          date: new Date(transaction.created_at).toLocaleDateString(),
          transactionId: transaction.id,
        },
      });
    }

    // Create in-app notification for patient
    await createNotification(
      transaction.patient_id,
      'payment_completed',
      'Payment Successful',
      `Your payment of $${(transaction.amount / 100).toFixed(2)} was successful.`,
      { transactionId: transaction.id }
    );

    // Notify provider
    const provider = await getProviderDetails(transaction.provider_id);
    if (provider?.email) {
      await emailService.sendEmail({
        to: provider.email,
        template: 'provider_payment_received',
        data: {
          businessName: provider.business_name,
          amount: (transaction.amount / 100).toFixed(2),
          currency: transaction.currency.toUpperCase(),
          date: new Date(transaction.created_at).toLocaleDateString(),
          transactionId: transaction.id,
        },
      });
    }

    // Create in-app notification for provider
    await createNotification(
      transaction.provider_id,
      'payment_received',
      'Payment Received',
      `You received a payment of $${(transaction.amount / 100).toFixed(2)}.`,
      { transactionId: transaction.id }
    );
  },

  async notifyPaymentFailed(transaction: TransactionRecord): Promise<void> {
    const patient = await getUserDetails(transaction.patient_id);

    if (patient?.email) {
      await emailService.sendEmail({
        to: patient.email,
        template: 'payment_failed',
        data: {
          customerName: patient.full_name,
          amount: (transaction.amount / 100).toFixed(2),
          currency: transaction.currency.toUpperCase(),
          description: transaction.description,
          date: new Date().toLocaleDateString(),
        },
      });
    }

    await createNotification(
      transaction.patient_id,
      'payment_failed',
      'Payment Failed',
      `Your payment of $${(transaction.amount / 100).toFixed(2)} could not be processed.`,
      { transactionId: transaction.id }
    );
  },

  async notifyPaymentRefunded(transaction: TransactionRecord): Promise<void> {
    const patient = await getUserDetails(transaction.patient_id);

    if (patient?.email) {
      await emailService.sendEmail({
        to: patient.email,
        template: 'refund_processed',
        data: {
          customerName: patient.full_name,
          amount: (transaction.amount / 100).toFixed(2),
          currency: transaction.currency.toUpperCase(),
          date: new Date().toLocaleDateString(),
          transactionId: transaction.id,
        },
      });
    }

    await createNotification(
      transaction.patient_id,
      'refund_processed',
      'Refund Processed',
      `Your refund of $${(transaction.amount / 100).toFixed(2)} has been processed.`,
      { transactionId: transaction.id }
    );
  },

  async notifyDisputeOpened(dispute: DisputeRecord): Promise<void> {
    // Notify provider of new dispute
    const provider = await getProviderDetails(dispute.provider_id);

    if (provider?.email) {
      await emailService.sendEmail({
        to: provider.email,
        template: 'dispute_opened',
        data: {
          businessName: provider.business_name,
          amount: (dispute.amount / 100).toFixed(2),
          reason: dispute.reason,
          disputeId: dispute.id,
          date: new Date(dispute.created_at).toLocaleDateString(),
        },
      });
    }

    await createNotification(
      dispute.provider_id,
      'dispute_opened',
      'New Dispute Filed',
      `A dispute for $${(dispute.amount / 100).toFixed(2)} has been filed. Reason: ${dispute.reason}`,
      { disputeId: dispute.id, transactionId: dispute.transaction_id }
    );
  },

  async notifyDisputeStatusChanged(dispute: DisputeRecord, oldStatus?: string): Promise<void> {
    // Notify both parties
    const patient = await getUserDetails(dispute.patient_id);
    const provider = await getProviderDetails(dispute.provider_id);

    const statusMessage =
      dispute.status === 'resolved'
        ? 'has been resolved'
        : dispute.status === 'won'
          ? 'has been decided in your favor'
          : dispute.status === 'lost'
            ? 'has been decided against you'
            : `status changed to ${dispute.status}`;

    // Notify patient
    if (patient?.email) {
      await emailService.sendEmail({
        to: patient.email,
        template: 'dispute_status_update',
        data: {
          customerName: patient.full_name,
          disputeId: dispute.id,
          oldStatus,
          newStatus: dispute.status,
          amount: (dispute.amount / 100).toFixed(2),
        },
      });
    }

    await createNotification(
      dispute.patient_id,
      'dispute_update',
      'Dispute Status Updated',
      `Your dispute ${statusMessage}.`,
      { disputeId: dispute.id }
    );

    // Notify provider
    if (provider?.email) {
      await emailService.sendEmail({
        to: provider.email,
        template: 'dispute_status_update',
        data: {
          businessName: provider.business_name,
          disputeId: dispute.id,
          oldStatus,
          newStatus: dispute.status,
          amount: (dispute.amount / 100).toFixed(2),
        },
      });
    }

    await createNotification(
      dispute.provider_id,
      'dispute_update',
      'Dispute Status Updated',
      `Dispute ${statusMessage}.`,
      { disputeId: dispute.id }
    );
  },

  async notifyAppointmentCreated(appointment: AppointmentRecord): Promise<void> {
    const patient = await getUserDetails(appointment.patient_id);
    const provider = await getProviderDetails(appointment.provider_id);

    const appointmentDate = new Date(appointment.scheduled_at);
    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    // Notify patient
    if (patient?.email) {
      await emailService.sendEmail({
        to: patient.email,
        template: 'appointment_confirmation',
        data: {
          customerName: patient.full_name,
          providerName: provider?.business_name || 'Your provider',
          serviceType: appointment.service_type,
          date: formattedDate,
          time: formattedTime,
          appointmentId: appointment.id,
        },
      });
    }

    await createNotification(
      appointment.patient_id,
      'appointment_created',
      'Appointment Scheduled',
      `Your appointment for ${appointment.service_type} is scheduled for ${formattedDate} at ${formattedTime}.`,
      { appointmentId: appointment.id }
    );

    // Notify provider
    await createNotification(
      appointment.provider_id,
      'appointment_created',
      'New Appointment',
      `New appointment for ${appointment.service_type} scheduled on ${formattedDate} at ${formattedTime}.`,
      { appointmentId: appointment.id, patientId: appointment.patient_id }
    );
  },

  async notifyAppointmentConfirmed(appointment: AppointmentRecord): Promise<void> {
    const patient = await getUserDetails(appointment.patient_id);

    const appointmentDate = new Date(appointment.scheduled_at);
    const formattedDate = appointmentDate.toLocaleDateString();
    const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    await createNotification(
      appointment.patient_id,
      'appointment_confirmed',
      'Appointment Confirmed',
      `Your appointment on ${formattedDate} at ${formattedTime} has been confirmed.`,
      { appointmentId: appointment.id }
    );

    if (patient?.email) {
      await emailService.sendEmail({
        to: patient.email,
        template: 'appointment_confirmed',
        data: {
          customerName: patient.full_name,
          date: formattedDate,
          time: formattedTime,
          serviceType: appointment.service_type,
        },
      });
    }
  },

  async notifyAppointmentCancelled(appointment: AppointmentRecord): Promise<void> {
    const patient = await getUserDetails(appointment.patient_id);

    await createNotification(
      appointment.patient_id,
      'appointment_cancelled',
      'Appointment Cancelled',
      `Your appointment for ${appointment.service_type} has been cancelled.`,
      { appointmentId: appointment.id }
    );

    await createNotification(
      appointment.provider_id,
      'appointment_cancelled',
      'Appointment Cancelled',
      `An appointment for ${appointment.service_type} has been cancelled.`,
      { appointmentId: appointment.id }
    );

    if (patient?.email) {
      await emailService.sendEmail({
        to: patient.email,
        template: 'appointment_cancelled',
        data: {
          customerName: patient.full_name,
          serviceType: appointment.service_type,
        },
      });
    }
  },

  async notifyAppointmentRescheduled(
    appointment: AppointmentRecord,
    oldScheduledAt?: string
  ): Promise<void> {
    const patient = await getUserDetails(appointment.patient_id);

    const newDate = new Date(appointment.scheduled_at);
    const oldDate = oldScheduledAt ? new Date(oldScheduledAt) : null;

    await createNotification(
      appointment.patient_id,
      'appointment_rescheduled',
      'Appointment Rescheduled',
      `Your appointment has been rescheduled to ${newDate.toLocaleDateString()} at ${newDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.`,
      { appointmentId: appointment.id }
    );

    if (patient?.email) {
      await emailService.sendEmail({
        to: patient.email,
        template: 'appointment_rescheduled',
        data: {
          customerName: patient.full_name,
          oldDate: oldDate?.toLocaleDateString(),
          oldTime: oldDate?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          newDate: newDate.toLocaleDateString(),
          newTime: newDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          serviceType: appointment.service_type,
        },
      });
    }
  },

  async notifyPayoutCompleted(walletTx: WalletTransactionRecord): Promise<void> {
    // Get wallet owner
    const supabase = createServiceClient();
    const { data: wallet } = await supabase
      .from('linked_wallets')
      .select('provider_id, wallet_address, wallet_type')
      .eq('id', walletTx.wallet_id)
      .single();

    if (!wallet) return;

    const provider = await getProviderDetails(wallet.provider_id);

    await createNotification(
      wallet.provider_id,
      'payout_completed',
      'Payout Completed',
      `Your payout of ${walletTx.amount} ${walletTx.currency} has been sent to your ${wallet.wallet_type} wallet.`,
      { walletTxId: walletTx.id, txHash: walletTx.tx_hash }
    );

    if (provider?.email) {
      await emailService.sendEmail({
        to: provider.email,
        template: 'payout_completed',
        data: {
          businessName: provider.business_name,
          amount: walletTx.amount,
          currency: walletTx.currency,
          walletAddress: wallet.wallet_address,
          network: wallet.wallet_type,
          txHash: walletTx.tx_hash,
        },
      });
    }
  },

  async notifyPayoutFailed(walletTx: WalletTransactionRecord): Promise<void> {
    const supabase = createServiceClient();
    const { data: wallet } = await supabase
      .from('linked_wallets')
      .select('provider_id, wallet_type')
      .eq('id', walletTx.wallet_id)
      .single();

    if (!wallet) return;

    await createNotification(
      wallet.provider_id,
      'payout_failed',
      'Payout Failed',
      `Your payout of ${walletTx.amount} ${walletTx.currency} could not be processed. Please check your wallet settings.`,
      { walletTxId: walletTx.id }
    );
  },
};

export default databaseWebhookService;
