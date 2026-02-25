import { Router, Response } from 'express';
import {
  walletChallengeService,
  linkedWalletsService,
  walletTransactionsService,
  walletAuditService,
  isValidWalletAddress,
  normalizeAddress,
  BlockchainNetwork,
} from '../services/wallet.service.js';
import {
  authenticate,
  authenticateWithProfile,
  requireRole,
  AuthenticatedRequest,
} from '../middleware/auth.middleware.js';
import { supabase } from '../lib/supabase.js';
import { apiLimiter, sensitiveLimiter } from '../middleware/rateLimit.middleware.js';
import { asyncHandler, AppError } from '../utils/errors.js';

const router = Router();

/**
 * Web3 Wallet Routes
 *
 * Provider Wallet Management:
 * 1. POST /wallet/challenge - Generate verification challenge
 * 2. POST /wallet/verify - Verify signature and link wallet
 * 3. GET /wallet/list - List linked wallets
 * 4. GET /wallet/:id - Get wallet details
 * 5. PATCH /wallet/:id - Update wallet settings
 * 6. DELETE /wallet/:id - Unlink wallet
 * 7. POST /wallet/:id/primary - Set as primary payout wallet
 *
 * Transactions:
 * 8. GET /wallet/transactions - Get wallet transactions
 * 9. GET /wallet/transactions/:id - Get transaction details
 */

// Supported networks
const SUPPORTED_NETWORKS: BlockchainNetwork[] = [
  'ethereum',
  'solana',
  'polygon',
  'base',
  'arbitrum',
];

// ============================================================
// CHALLENGE GENERATION
// ============================================================

/**
 * Generate a verification challenge for wallet linking
 * POST /wallet/challenge
 */
router.post(
  '/challenge',
  sensitiveLimiter,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { walletAddress, network } = req.body;

    // Validate inputs
    if (!walletAddress || typeof walletAddress !== 'string') {
      throw AppError.badRequest('Wallet address is required');
    }

    if (!network || !SUPPORTED_NETWORKS.includes(network)) {
      throw AppError.badRequest(`Invalid network. Supported: ${SUPPORTED_NETWORKS.join(', ')}`);
    }

    // Validate address format
    if (!isValidWalletAddress(walletAddress, network)) {
      throw AppError.badRequest('Invalid wallet address format for the specified network');
    }

    // Normalize address
    const normalizedAddress = normalizeAddress(walletAddress, network);

    // Check if wallet already linked
    const { data: existing } = await supabase
      .from('linked_wallets')
      .select('id, user_id')
      .eq('wallet_address', normalizedAddress)
      .eq('blockchain_network', network)
      .single();

    if (existing) {
      if (existing.user_id === req.user!.id) {
        throw AppError.conflict('This wallet is already linked to your account');
      }
      throw AppError.conflict('This wallet is already linked to another account');
    }

    // Generate challenge
    const challenge = await walletChallengeService.generate({
      walletAddress: normalizedAddress,
      network,
      userId: req.user!.id,
    });

    // Log attempt
    await walletAuditService.log({
      userId: req.user!.id,
      action: 'challenge_generated',
      details: { wallet_address: normalizedAddress, network },
      success: true,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      data: {
        challengeId: challenge.id,
        message: challenge.challenge_message,
        expiresAt: challenge.expires_at,
        network,
        walletAddress: normalizedAddress,
      },
    });
  })
);

// ============================================================
// WALLET VERIFICATION & LINKING
// ============================================================

/**
 * Verify signature and link wallet
 * POST /wallet/verify
 */
router.post(
  '/verify',
  sensitiveLimiter,
  authenticateWithProfile,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { challengeId, signature, walletAddress, network, label } = req.body;

    // Validate inputs
    if (!challengeId || !signature || !walletAddress || !network) {
      throw AppError.badRequest('challengeId, signature, walletAddress, and network are required');
    }

    if (!SUPPORTED_NETWORKS.includes(network)) {
      throw AppError.badRequest(`Invalid network. Supported: ${SUPPORTED_NETWORKS.join(', ')}`);
    }

    // Get provider ID if user is a provider
    let providerId: string | undefined;
    const { data: provider } = await supabase
      .from('providers')
      .select('id')
      .eq('user_id', req.user!.id)
      .single();

    if (provider) {
      providerId = provider.id;
    }

    try {
      const wallet = await linkedWalletsService.link({
        userId: req.user!.id,
        providerId,
        walletAddress: normalizeAddress(walletAddress, network),
        network,
        label,
        signature,
        challengeId,
      });

      // Log success
      await walletAuditService.log({
        userId: req.user!.id,
        providerId,
        walletId: wallet.id,
        action: 'wallet_linked',
        details: { wallet_address: wallet.wallet_address, network },
        success: true,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({
        success: true,
        data: {
          id: wallet.id,
          walletAddress: wallet.wallet_address,
          network: wallet.blockchain_network,
          label: wallet.wallet_label,
          verificationStatus: wallet.verification_status,
          verifiedAt: wallet.verified_at,
        },
      });
    } catch (error) {
      // Log failure
      await walletAuditService.log({
        userId: req.user!.id,
        action: 'wallet_link_failed',
        details: { wallet_address: walletAddress, network, error: (error as Error).message },
        success: false,
        errorMessage: (error as Error).message,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      throw error;
    }
  })
);

// ============================================================
// WALLET LISTING & DETAILS
// ============================================================

/**
 * List all linked wallets for the authenticated user
 * GET /wallet/list
 */
router.get(
  '/list',
  apiLimiter,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const wallets = await linkedWalletsService.getByUserId(req.user!.id);

    res.json({
      success: true,
      data: wallets.map((wallet) => ({
        id: wallet.id,
        walletAddress: wallet.wallet_address,
        network: wallet.blockchain_network,
        label: wallet.wallet_label,
        verificationStatus: wallet.verification_status,
        isPrimaryPayout: wallet.is_primary_payout,
        payoutEnabled: wallet.payout_enabled,
        minPayoutAmount: wallet.min_payout_amount,
        payoutCurrency: wallet.payout_currency,
        createdAt: wallet.created_at,
      })),
    });
  })
);

// ============================================================
// TRANSACTIONS
// ============================================================

/**
 * Get wallet transactions for authenticated provider
 * GET /wallet/transactions
 */
router.get(
  '/transactions',
  apiLimiter,
  authenticateWithProfile,
  requireRole('provider', 'admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Get provider
    const { data: provider } = await supabase
      .from('providers')
      .select('id')
      .eq('user_id', req.user!.id)
      .single();

    if (!provider) {
      throw AppError.notFound('Provider profile not found');
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const transactions = await walletTransactionsService.getByProviderId(provider.id, limit);

    res.json({
      success: true,
      data: transactions.map((tx) => ({
        id: tx.id,
        type: tx.transaction_type,
        amount: tx.amount,
        currency: tx.currency,
        fiatEquivalent: tx.fiat_equivalent,
        status: tx.status,
        txHash: tx.tx_hash,
        createdAt: tx.created_at,
      })),
    });
  })
);

/**
 * Get transaction details
 * GET /wallet/transactions/:id
 */
router.get(
  '/transactions/:id',
  apiLimiter,
  authenticateWithProfile,
  requireRole('provider', 'admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const transactionId = req.params.id as string;
    // Get provider
    const { data: provider } = await supabase
      .from('providers')
      .select('id')
      .eq('user_id', req.user!.id)
      .single();

    if (!provider) {
      throw AppError.notFound('Provider profile not found');
    }

    const transaction = await walletTransactionsService.getById(transactionId);

    if (!transaction || transaction.provider_id !== provider.id) {
      throw AppError.notFound('Transaction not found');
    }

    res.json({
      success: true,
      data: transaction,
    });
  })
);

/**
 * Get wallet details by ID
 * GET /wallet/:id
 */
router.get(
  '/:id',
  apiLimiter,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const walletId = req.params.id as string;
    const wallet = await linkedWalletsService.getById(walletId, req.user!.id);

    if (!wallet) {
      throw AppError.notFound('Wallet not found');
    }

    res.json({
      success: true,
      data: {
        id: wallet.id,
        walletAddress: wallet.wallet_address,
        network: wallet.blockchain_network,
        label: wallet.wallet_label,
        verificationStatus: wallet.verification_status,
        verifiedAt: wallet.verified_at,
        isPrimaryPayout: wallet.is_primary_payout,
        payoutEnabled: wallet.payout_enabled,
        minPayoutAmount: wallet.min_payout_amount,
        payoutCurrency: wallet.payout_currency,
        createdAt: wallet.created_at,
        updatedAt: wallet.updated_at,
      },
    });
  })
);

// ============================================================
// WALLET MANAGEMENT
// ============================================================

/**
 * Update wallet settings
 * PATCH /wallet/:id
 */
router.patch(
  '/:id',
  apiLimiter,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const walletId = req.params.id as string;
    const { label, payoutEnabled, minPayoutAmount, payoutCurrency } = req.body;

    const updates: Record<string, unknown> = {};
    if (label !== undefined) updates.wallet_label = label;
    if (payoutEnabled !== undefined) updates.payout_enabled = payoutEnabled;
    if (minPayoutAmount !== undefined) {
      if (minPayoutAmount < 10) {
        throw AppError.badRequest('Minimum payout amount must be at least 10');
      }
      updates.min_payout_amount = minPayoutAmount;
    }
    if (payoutCurrency !== undefined) {
      const validCurrencies = ['USDC', 'USDT', 'ETH', 'SOL'];
      if (!validCurrencies.includes(payoutCurrency)) {
        throw AppError.badRequest(`Invalid currency. Supported: ${validCurrencies.join(', ')}`);
      }
      updates.payout_currency = payoutCurrency;
    }

    if (Object.keys(updates).length === 0) {
      throw AppError.badRequest('No valid updates provided');
    }

    const wallet = await linkedWalletsService.update(walletId, req.user!.id, updates);

    res.json({
      success: true,
      data: {
        id: wallet.id,
        walletAddress: wallet.wallet_address,
        network: wallet.blockchain_network,
        label: wallet.wallet_label,
        payoutEnabled: wallet.payout_enabled,
        minPayoutAmount: wallet.min_payout_amount,
        payoutCurrency: wallet.payout_currency,
        updatedAt: wallet.updated_at,
      },
    });
  })
);

/**
 * Set wallet as primary payout destination
 * POST /wallet/:id/primary
 */
router.post(
  '/:id/primary',
  sensitiveLimiter,
  authenticateWithProfile,
  requireRole('provider', 'admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const walletId = req.params.id as string;
    const wallet = await linkedWalletsService.setPrimaryPayout(walletId, req.user!.id);

    await walletAuditService.log({
      userId: req.user!.id,
      providerId: wallet.provider_id || undefined,
      walletId: wallet.id,
      action: 'set_primary_payout',
      success: true,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      data: {
        id: wallet.id,
        walletAddress: wallet.wallet_address,
        isPrimaryPayout: wallet.is_primary_payout,
        payoutEnabled: wallet.payout_enabled,
      },
    });
  })
);

/**
 * Unlink a wallet
 * DELETE /wallet/:id
 */
router.delete(
  '/:id',
  sensitiveLimiter,
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const walletId = req.params.id as string;
    // Get wallet before deleting for audit
    const wallet = await linkedWalletsService.getById(walletId, req.user!.id);
    if (!wallet) {
      throw AppError.notFound('Wallet not found');
    }

    await linkedWalletsService.unlink(walletId, req.user!.id);

    await walletAuditService.log({
      userId: req.user!.id,
      providerId: wallet.provider_id || undefined,
      action: 'wallet_unlinked',
      details: { wallet_address: wallet.wallet_address, network: wallet.blockchain_network },
      success: true,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: 'Wallet unlinked successfully',
    });
  })
);

// ============================================================
// ADMIN ROUTES
// ============================================================

/**
 * Admin: Revoke a wallet (security action)
 * POST /wallet/:id/revoke
 */
router.post(
  '/:id/revoke',
  sensitiveLimiter,
  authenticateWithProfile,
  requireRole('admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const walletId = req.params.id as string;
    const { reason } = req.body;

    const wallet = await linkedWalletsService.revoke(walletId);

    await walletAuditService.log({
      userId: req.user!.id,
      walletId: wallet.id,
      action: 'wallet_revoked_admin',
      details: { reason, revoked_by: req.user!.id },
      success: true,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      data: {
        id: wallet.id,
        verificationStatus: wallet.verification_status,
        payoutEnabled: wallet.payout_enabled,
      },
    });
  })
);

export default router;
