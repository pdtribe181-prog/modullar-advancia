/**
 * Crypto Payment Service using Coinbase Commerce
 * Supports BTC, ETH, USDC, and other cryptocurrencies
 */

import crypto from 'crypto';
import { getEnv } from '../config/env.js';
import { createServiceClient } from '../lib/supabase.js';

// Types
export interface CreateCryptoChargeParams {
  amount: number; // in USD cents
  currency?: string; // pricing currency (default: USD)
  patientId: string;
  providerId: string;
  appointmentId?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface CryptoCharge {
  id: string;
  code: string;
  name: string;
  description: string;
  pricing_type: 'fixed_price' | 'no_price';
  addresses: {
    bitcoin?: string;
    ethereum?: string;
    usdc?: string;
    dai?: string;
  };
  pricing: {
    local: { amount: string; currency: string };
    bitcoin?: { amount: string; currency: string };
    ethereum?: { amount: string; currency: string };
    usdc?: { amount: string; currency: string };
  };
  hosted_url: string;
  created_at: string;
  expires_at: string;
  timeline: Array<{
    status: string;
    time: string;
  }>;
  payments: Array<{
    network: string;
    transaction_id: string;
    status: string;
    value: { local: { amount: string; currency: string } };
  }>;
}

export interface CryptoWebhookEvent {
  id: string;
  type:
    | 'charge:created'
    | 'charge:confirmed'
    | 'charge:failed'
    | 'charge:delayed'
    | 'charge:pending'
    | 'charge:resolved';
  data: CryptoCharge;
}

class CryptoPaymentService {
  private apiKey: string;
  private webhookSecret: string;
  private baseUrl = 'https://api.commerce.coinbase.com';

  constructor() {
    const env = getEnv();
    this.apiKey = env.COINBASE_COMMERCE_API_KEY || '';
    this.webhookSecret = env.COINBASE_COMMERCE_WEBHOOK_SECRET || '';
  }

  private async request<T>(
    endpoint: string,
    options: {
      method?: string;
      body?: Record<string, unknown>;
    } = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-CC-Api-Key': this.apiKey,
        'X-CC-Version': '2018-03-22',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Coinbase Commerce API error: ${response.status} - ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    return result.data as T;
  }

  /**
   * Create a new crypto payment charge
   */
  async createCharge(params: CreateCryptoChargeParams): Promise<CryptoCharge> {
    const {
      amount,
      currency = 'USD',
      patientId,
      providerId,
      appointmentId,
      description,
      metadata,
    } = params;

    const charge = await this.request<CryptoCharge>('/charges', {
      method: 'POST',
      body: {
        name: 'Healthcare Payment',
        description: description || 'Medical appointment payment',
        pricing_type: 'fixed_price',
        local_price: {
          amount: (amount / 100).toFixed(2), // Convert cents to dollars
          currency: currency.toUpperCase(),
        },
        metadata: {
          patient_id: patientId,
          provider_id: providerId,
          appointment_id: appointmentId || '',
          ...metadata,
        },
        redirect_url: `${getEnv().FRONTEND_URL}/payment/success`,
        cancel_url: `${getEnv().FRONTEND_URL}/payment/cancel`,
      },
    });

    // Store the charge in database
    await this.storeCharge(charge, patientId, providerId, appointmentId);

    return charge;
  }

  /**
   * Get a charge by ID
   */
  async getCharge(chargeId: string): Promise<CryptoCharge> {
    return this.request<CryptoCharge>(`/charges/${chargeId}`);
  }

  /**
   * Get a charge by code
   */
  async getChargeByCode(code: string): Promise<CryptoCharge> {
    return this.request<CryptoCharge>(`/charges/${code}`);
  }

  /**
   * List all charges
   */
  async listCharges(limit = 25): Promise<CryptoCharge[]> {
    const response = await fetch(`${this.baseUrl}/charges?limit=${limit}`, {
      headers: {
        'X-CC-Api-Key': this.apiKey,
        'X-CC-Version': '2018-03-22',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list charges: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Cancel a charge
   */
  async cancelCharge(chargeId: string): Promise<CryptoCharge> {
    return this.request<CryptoCharge>(`/charges/${chargeId}/cancel`, {
      method: 'POST',
    });
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    hmac.update(payload);
    const computedSignature = hmac.digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computedSignature));
  }

  /**
   * Process webhook event
   */
  async processWebhookEvent(event: CryptoWebhookEvent): Promise<void> {
    const { type, data: charge } = event;

    console.log(`[Crypto] Processing webhook event: ${type} for charge ${charge.code}`);

    switch (type) {
      case 'charge:confirmed':
        await this.handleChargeConfirmed(charge);
        break;
      case 'charge:failed':
        await this.handleChargeFailed(charge);
        break;
      case 'charge:delayed':
        await this.handleChargeDelayed(charge);
        break;
      case 'charge:pending':
        await this.handleChargePending(charge);
        break;
      case 'charge:resolved':
        await this.handleChargeResolved(charge);
        break;
      default:
        console.log(`[Crypto] Unhandled event type: ${type}`);
    }
  }

  /**
   * Store charge in database
   */
  private async storeCharge(
    charge: CryptoCharge,
    patientId: string,
    providerId: string,
    appointmentId?: string
  ): Promise<void> {
    const supabase = createServiceClient();
    const { error } = await supabase.from('crypto_transactions').insert({
      charge_id: charge.id,
      charge_code: charge.code,
      patient_id: patientId,
      provider_id: providerId,
      appointment_id: appointmentId || null,
      amount_usd: parseFloat(charge.pricing.local.amount) * 100, // Store in cents
      currency: charge.pricing.local.currency,
      status: 'pending',
      hosted_url: charge.hosted_url,
      addresses: charge.addresses,
      expires_at: charge.expires_at,
      metadata: charge,
    });

    if (error) {
      console.error('[Crypto] Failed to store charge:', error);
      // Don't throw - charge was created successfully, just logging failed
    }
  }

  /**
   * Update charge status in database
   */
  private async updateChargeStatus(
    chargeCode: string,
    status: string,
    paymentDetails?: Record<string, unknown>
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (paymentDetails) {
      updateData.payment_details = paymentDetails;
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from('crypto_transactions')
      .update(updateData)
      .eq('charge_code', chargeCode);

    if (error) {
      console.error('[Crypto] Failed to update charge status:', error);
    }
  }

  /**
   * Handle confirmed payment
   */
  private async handleChargeConfirmed(charge: CryptoCharge): Promise<void> {
    const payment = charge.payments?.[0];

    await this.updateChargeStatus(charge.code, 'confirmed', {
      network: payment?.network,
      transaction_id: payment?.transaction_id,
      confirmed_at: new Date().toISOString(),
    });

    // Create transaction record
    const metadata = charge as unknown as {
      metadata?: { patient_id?: string; provider_id?: string; appointment_id?: string };
    };
    if (metadata.metadata?.patient_id) {
      const supabase = createServiceClient();
      await supabase.from('transactions').insert({
        patient_id: metadata.metadata.patient_id,
        provider_id: metadata.metadata.provider_id,
        appointment_id: metadata.metadata.appointment_id || null,
        amount: parseFloat(charge.pricing.local.amount) * 100,
        currency: charge.pricing.local.currency,
        type: 'payment',
        status: 'completed',
        payment_method: `crypto_${payment?.network || 'unknown'}`,
        external_reference: charge.code,
        metadata: {
          crypto_charge_id: charge.id,
          crypto_charge_code: charge.code,
          network: payment?.network,
          transaction_id: payment?.transaction_id,
        },
      });
    }

    console.log(`[Crypto] Payment confirmed for charge ${charge.code}`);
  }

  /**
   * Handle failed payment
   */
  private async handleChargeFailed(charge: CryptoCharge): Promise<void> {
    await this.updateChargeStatus(charge.code, 'failed', {
      failed_at: new Date().toISOString(),
      timeline: charge.timeline,
    });

    console.log(`[Crypto] Payment failed for charge ${charge.code}`);
  }

  /**
   * Handle delayed payment (underpaid or late)
   */
  private async handleChargeDelayed(charge: CryptoCharge): Promise<void> {
    await this.updateChargeStatus(charge.code, 'delayed', {
      delayed_at: new Date().toISOString(),
    });

    console.log(`[Crypto] Payment delayed for charge ${charge.code}`);
  }

  /**
   * Handle pending payment
   */
  private async handleChargePending(charge: CryptoCharge): Promise<void> {
    await this.updateChargeStatus(charge.code, 'pending', {
      pending_at: new Date().toISOString(),
    });

    console.log(`[Crypto] Payment pending for charge ${charge.code}`);
  }

  /**
   * Handle resolved payment (manually resolved)
   */
  private async handleChargeResolved(charge: CryptoCharge): Promise<void> {
    await this.updateChargeStatus(charge.code, 'resolved', {
      resolved_at: new Date().toISOString(),
    });

    console.log(`[Crypto] Payment resolved for charge ${charge.code}`);
  }

  /**
   * Check if crypto payments are enabled
   */
  isEnabled(): boolean {
    return Boolean(this.apiKey);
  }
}

// Export singleton instance
export const cryptoService = new CryptoPaymentService();
