import { createClient } from '@supabase/supabase-js';
import { getEnv } from '../config/env.js';
import crypto from 'crypto';
import { verifyMessage } from 'ethers';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

// Types
export type BlockchainNetwork = 'ethereum' | 'solana' | 'polygon' | 'base' | 'arbitrum';
export type WalletVerificationStatus = 'pending' | 'verified' | 'failed' | 'expired' | 'revoked';

export interface LinkedWallet {
  id: string;
  user_id: string;
  provider_id: string | null;
  wallet_address: string;
  blockchain_network: BlockchainNetwork;
  wallet_label: string | null;
  verification_status: WalletVerificationStatus;
  verified_at: string | null;
  is_primary_payout: boolean;
  payout_enabled: boolean;
  min_payout_amount: number;
  payout_currency: string;
  created_at: string;
  updated_at: string;
}

export interface WalletChallenge {
  id: string;
  user_id: string;
  wallet_address: string;
  blockchain_network: BlockchainNetwork;
  challenge_message: string;
  nonce: string;
  status: 'pending' | 'completed' | 'expired' | 'failed';
  expires_at: string;
}

export interface GenerateChallengeParams {
  walletAddress: string;
  network: BlockchainNetwork;
  userId: string;
}

export interface VerifySignatureParams {
  challengeId: string;
  signature: string;
  walletAddress: string;
  network: BlockchainNetwork;
  userId: string;
}

export interface LinkWalletParams {
  userId: string;
  providerId?: string;
  walletAddress: string;
  network: BlockchainNetwork;
  label?: string;
  signature: string;
  challengeId: string;
}

export interface WalletTransaction {
  id: string;
  linked_wallet_id: string;
  provider_id: string;
  transaction_type: 'payout' | 'refund' | 'adjustment';
  amount: number;
  currency: string;
  fiat_equivalent: number | null;
  status: 'pending' | 'processing' | 'confirmed' | 'failed' | 'cancelled';
  tx_hash: string | null;
  created_at: string;
}

// Get Supabase client with service role for backend operations
function getSupabase() {
  const env = getEnv();
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

// ============================================================
// WALLET CHALLENGE SERVICE
// ============================================================

export const walletChallengeService = {
  /**
   * Generate a unique challenge message for wallet verification
   */
  async generate(params: GenerateChallengeParams): Promise<WalletChallenge> {
    const supabase = getSupabase();
    const nonce = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const message = [
      'Modullar Advancia Wallet Verification',
      '',
      `I am linking wallet ${params.walletAddress} to my Modullar Advancia account.`,
      '',
      `Nonce: ${nonce}`,
      `Expires: ${expiresAt.toISOString()}`,
      '',
      'This signature will not trigger any blockchain transaction.',
    ].join('\n');

    // Expire existing pending challenges
    await supabase
      .from('wallet_verification_challenges')
      .update({ status: 'expired' })
      .eq('wallet_address', params.walletAddress.toLowerCase())
      .eq('blockchain_network', params.network)
      .eq('status', 'pending');

    // Create new challenge
    const { data, error } = await supabase
      .from('wallet_verification_challenges')
      .insert({
        user_id: params.userId,
        wallet_address: params.walletAddress.toLowerCase(),
        blockchain_network: params.network,
        challenge_message: message,
        nonce,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create challenge: ${error.message}`);
    }

    return data;
  },

  /**
   * Get a pending challenge by ID
   */
  async getById(challengeId: string): Promise<WalletChallenge | null> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('wallet_verification_challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (error) {
      return null;
    }

    return data;
  },

  /**
   * Mark challenge as completed
   */
  async complete(challengeId: string, signature: string): Promise<void> {
    const supabase = getSupabase();

    const { error } = await supabase
      .from('wallet_verification_challenges')
      .update({
        status: 'completed',
        signature,
        completed_at: new Date().toISOString(),
      })
      .eq('id', challengeId);

    if (error) {
      throw new Error(`Failed to complete challenge: ${error.message}`);
    }
  },
};

// ============================================================
// SIGNATURE VERIFICATION SERVICE
// ============================================================

export const signatureVerificationService = {
  /**
   * Verify an Ethereum/EVM signature (EIP-191 personal sign)
   * Uses ethers.js verifyMessage to recover the signer address from
   * the signature and compare it against the expected wallet address.
   */
  verifyEvmSignature(message: string, signature: string, expectedAddress: string): boolean {
    try {
      // Basic format validation
      if (!signature.startsWith('0x') || signature.length !== 132) {
        return false;
      }

      // Recover the signer address from the EIP-191 personal_sign signature
      const recoveredAddress = verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
    } catch {
      return false;
    }
  },

  /**
   * Verify a Solana signature (Ed25519)
   * Uses tweetnacl to verify the detached Ed25519 signature against
   * the public key derived from the base58-encoded Solana address.
   */
  verifySolanaSignature(message: string, signature: string, expectedAddress: string): boolean {
    try {
      // Basic address validation
      if (expectedAddress.length < 32 || expectedAddress.length > 44) {
        return false;
      }

      // Decode the Solana public key from base58
      const publicKeyBytes = bs58.decode(expectedAddress);
      if (publicKeyBytes.length !== 32) {
        return false;
      }

      // Encode the message as bytes
      const messageBytes = new TextEncoder().encode(message);

      // Decode the signature (accept both base58 and base64 formats)
      let signatureBytes: Uint8Array;
      try {
        // Try base58 first (Phantom wallet format)
        signatureBytes = bs58.decode(signature);
      } catch {
        // Fall back to base64
        signatureBytes = new Uint8Array(Buffer.from(signature, 'base64'));
      }

      if (signatureBytes.length !== 64) {
        return false;
      }

      // Verify the Ed25519 detached signature
      return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    } catch {
      return false;
    }
  },

  /**
   * Verify signature based on network
   */
  verify(network: BlockchainNetwork, message: string, signature: string, address: string): boolean {
    switch (network) {
      case 'ethereum':
      case 'polygon':
      case 'base':
      case 'arbitrum':
        return this.verifyEvmSignature(message, signature, address);
      case 'solana':
        return this.verifySolanaSignature(message, signature, address);
      default:
        return false;
    }
  },
};

// ============================================================
// LINKED WALLETS SERVICE
// ============================================================

export const linkedWalletsService = {
  /**
   * Link a wallet to user account after signature verification
   */
  async link(params: LinkWalletParams): Promise<LinkedWallet> {
    const supabase = getSupabase();

    // Get the challenge
    const challenge = await walletChallengeService.getById(params.challengeId);
    if (!challenge) {
      throw new Error('Challenge not found');
    }

    // Verify challenge is valid
    if (challenge.status !== 'pending') {
      throw new Error('Challenge already used or expired');
    }

    if (new Date(challenge.expires_at) < new Date()) {
      throw new Error('Challenge has expired');
    }

    if (challenge.wallet_address.toLowerCase() !== params.walletAddress.toLowerCase()) {
      throw new Error('Wallet address mismatch');
    }

    // Verify signature
    const isValid = signatureVerificationService.verify(
      params.network,
      challenge.challenge_message,
      params.signature,
      params.walletAddress
    );

    if (!isValid) {
      // Mark challenge as failed
      await supabase
        .from('wallet_verification_challenges')
        .update({ status: 'failed' })
        .eq('id', params.challengeId);

      throw new Error('Invalid signature');
    }

    // Mark challenge as completed
    await walletChallengeService.complete(params.challengeId, params.signature);

    // Check if wallet already linked
    const { data: existing } = await supabase
      .from('linked_wallets')
      .select('id')
      .eq('wallet_address', params.walletAddress.toLowerCase())
      .eq('blockchain_network', params.network)
      .single();

    if (existing) {
      throw new Error('Wallet already linked to an account');
    }

    // Create linked wallet
    const { data, error } = await supabase
      .from('linked_wallets')
      .insert({
        user_id: params.userId,
        provider_id: params.providerId || null,
        wallet_address: params.walletAddress.toLowerCase(),
        blockchain_network: params.network,
        wallet_label: params.label || null,
        verification_status: 'verified',
        verification_message: challenge.challenge_message,
        verification_signature: params.signature,
        verified_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to link wallet: ${error.message}`);
    }

    return data;
  },

  /**
   * Get all wallets for a user
   */
  async getByUserId(userId: string): Promise<LinkedWallet[]> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('linked_wallets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get wallets: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Get wallets for a provider
   */
  async getByProviderId(providerId: string): Promise<LinkedWallet[]> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('linked_wallets')
      .select('*')
      .eq('provider_id', providerId)
      .eq('verification_status', 'verified')
      .order('is_primary_payout', { ascending: false });

    if (error) {
      throw new Error(`Failed to get provider wallets: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Get a specific wallet by ID
   */
  async getById(walletId: string, userId: string): Promise<LinkedWallet | null> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('linked_wallets')
      .select('*')
      .eq('id', walletId)
      .eq('user_id', userId)
      .single();

    if (error) {
      return null;
    }

    return data;
  },

  /**
   * Set a wallet as primary payout destination
   */
  async setPrimaryPayout(walletId: string, userId: string): Promise<LinkedWallet> {
    const supabase = getSupabase();

    // Get wallet and verify ownership
    const wallet = await this.getById(walletId, userId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (wallet.verification_status !== 'verified') {
      throw new Error('Wallet must be verified to set as primary');
    }

    if (!wallet.provider_id) {
      throw new Error('Wallet must be linked to a provider');
    }

    // Clear existing primary
    await supabase
      .from('linked_wallets')
      .update({ is_primary_payout: false })
      .eq('provider_id', wallet.provider_id)
      .eq('is_primary_payout', true);

    // Set new primary
    const { data, error } = await supabase
      .from('linked_wallets')
      .update({
        is_primary_payout: true,
        payout_enabled: true,
      })
      .eq('id', walletId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to set primary wallet: ${error.message}`);
    }

    return data;
  },

  /**
   * Update wallet settings
   */
  async update(
    walletId: string,
    userId: string,
    updates: Partial<
      Pick<
        LinkedWallet,
        'wallet_label' | 'payout_enabled' | 'min_payout_amount' | 'payout_currency'
      >
    >
  ): Promise<LinkedWallet> {
    const supabase = getSupabase();

    // Verify ownership
    const wallet = await this.getById(walletId, userId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const { data, error } = await supabase
      .from('linked_wallets')
      .update(updates)
      .eq('id', walletId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update wallet: ${error.message}`);
    }

    return data;
  },

  /**
   * Unlink a wallet
   */
  async unlink(walletId: string, userId: string): Promise<void> {
    const supabase = getSupabase();

    // Verify ownership
    const wallet = await this.getById(walletId, userId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Check for pending transactions
    const { data: pendingTx } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('linked_wallet_id', walletId)
      .in('status', ['pending', 'processing'])
      .limit(1);

    if (pendingTx && pendingTx.length > 0) {
      throw new Error('Cannot unlink wallet with pending transactions');
    }

    const { error } = await supabase.from('linked_wallets').delete().eq('id', walletId);

    if (error) {
      throw new Error(`Failed to unlink wallet: ${error.message}`);
    }
  },

  /**
   * Revoke a wallet (admin action)
   */
  async revoke(walletId: string): Promise<LinkedWallet> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('linked_wallets')
      .update({
        verification_status: 'revoked',
        payout_enabled: false,
        is_primary_payout: false,
      })
      .eq('id', walletId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to revoke wallet: ${error.message}`);
    }

    return data;
  },
};

// ============================================================
// WALLET TRANSACTIONS SERVICE
// ============================================================

export const walletTransactionsService = {
  /**
   * Get transactions for a provider
   */
  async getByProviderId(providerId: string, limit = 50): Promise<WalletTransaction[]> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get transactions: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Get transaction by ID
   */
  async getById(transactionId: string): Promise<WalletTransaction | null> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (error) {
      return null;
    }

    return data;
  },

  /**
   * Initiate a crypto payout (admin/system function)
   */
  async initiatePayout(params: {
    walletId: string;
    providerId: string;
    amount: number;
    currency: string;
    fiatEquivalent: number;
    invoiceIds?: string[];
  }): Promise<WalletTransaction> {
    const supabase = getSupabase();

    // Get wallet
    const { data: wallet } = await supabase
      .from('linked_wallets')
      .select('*')
      .eq('id', params.walletId)
      .eq('provider_id', params.providerId)
      .eq('verification_status', 'verified')
      .eq('payout_enabled', true)
      .single();

    if (!wallet) {
      throw new Error('Wallet not found or not enabled for payouts');
    }

    if (params.amount < wallet.min_payout_amount) {
      throw new Error(`Amount below minimum payout: ${wallet.min_payout_amount}`);
    }

    // Create transaction record
    const { data, error } = await supabase
      .from('wallet_transactions')
      .insert({
        linked_wallet_id: params.walletId,
        provider_id: params.providerId,
        transaction_type: 'payout',
        amount: params.amount,
        currency: params.currency,
        fiat_equivalent: params.fiatEquivalent,
        blockchain_network: wallet.blockchain_network,
        invoice_ids: params.invoiceIds || [],
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to initiate payout: ${error.message}`);
    }

    // Payout is created with 'pending' status.
    // A background job or admin action is required to process the actual
    // blockchain transaction via an RPC provider (e.g. Alchemy, QuickNode).
    // Once the tx is broadcast, call walletTransactionsService.updateStatus()
    // with the tx_hash and update to 'processing', then 'confirmed' on-chain.
    //
    // For now, payouts remain in 'pending' until manually or programmatically
    // processed. This is intentional — automatic on-chain transfers require
    // a hot wallet with private key access, which should be handled by a
    // dedicated, audited payout processor service.

    return data;
  },

  /**
   * Update transaction status (internal/webhook use)
   */
  async updateStatus(
    transactionId: string,
    status: WalletTransaction['status'],
    txHash?: string,
    confirmations?: number
  ): Promise<WalletTransaction> {
    const supabase = getSupabase();

    const updates: Record<string, unknown> = { status };

    if (txHash) {
      updates.tx_hash = txHash;
    }

    if (confirmations !== undefined) {
      updates.confirmations = confirmations;
    }

    if (status === 'confirmed') {
      updates.confirmed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('wallet_transactions')
      .update(updates)
      .eq('id', transactionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update transaction: ${error.message}`);
    }

    return data;
  },
};

// ============================================================
// WALLET AUDIT SERVICE
// ============================================================

export const walletAuditService = {
  /**
   * Log a wallet action
   */
  async log(params: {
    userId: string;
    providerId?: string;
    walletId?: string;
    action: string;
    details?: Record<string, unknown>;
    success: boolean;
    errorMessage?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const supabase = getSupabase();

    await supabase.from('wallet_audit_log').insert({
      user_id: params.userId,
      provider_id: params.providerId || null,
      linked_wallet_id: params.walletId || null,
      action: params.action,
      action_details: params.details || {},
      success: params.success,
      error_message: params.errorMessage || null,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
    });
  },

  /**
   * Get audit log for a user
   */
  async getByUserId(userId: string, limit = 100): Promise<unknown[]> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('wallet_audit_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get audit log: ${error.message}`);
    }

    return data || [];
  },
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Validate wallet address format
 */
export function isValidWalletAddress(address: string, network: BlockchainNetwork): boolean {
  switch (network) {
    case 'ethereum':
    case 'polygon':
    case 'base':
    case 'arbitrum':
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    case 'solana':
      return (
        address.length >= 32 && address.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(address)
      );
    default:
      return false;
  }
}

/**
 * Normalize wallet address (lowercase for EVM)
 */
export function normalizeAddress(address: string, network: BlockchainNetwork): string {
  switch (network) {
    case 'ethereum':
    case 'polygon':
    case 'base':
    case 'arbitrum':
      return address.toLowerCase();
    case 'solana':
      return address; // Solana addresses are case-sensitive
    default:
      return address;
  }
}
