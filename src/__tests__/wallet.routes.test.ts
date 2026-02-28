/**
 * Wallet Routes Tests
 * Tests for Web3 wallet linking, verification, and management endpoints
 */

import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// ── Mocks ──

const mockGenerate = jest.fn<any>();
const mockLink = jest.fn<any>();
const mockListByUser = jest.fn<any>();
const mockGetByUserId = jest.fn<any>();
const mockGetById = jest.fn<any>();
const mockUpdate = jest.fn<any>();
const mockUnlink = jest.fn<any>();
const mockSetPrimary = jest.fn<any>();
const mockListTransactions = jest.fn<any>();
const mockGetByProviderId = jest.fn<any>();
const mockGetTransaction = jest.fn<any>();
const mockAuditLog = jest.fn<any>();
const mockRevoke = jest.fn<any>();

jest.unstable_mockModule('../services/wallet.service.js', () => ({
  walletChallengeService: { generate: mockGenerate },
  linkedWalletsService: {
    link: mockLink,
    listByUser: mockListByUser,
    getByUserId: mockGetByUserId,
    getById: mockGetById,
    update: mockUpdate,
    unlink: mockUnlink,
    setPrimary: mockSetPrimary,
    setPrimaryPayout: mockSetPrimary,
    revoke: mockRevoke,
  },
  walletTransactionsService: {
    list: mockListTransactions,
    getById: mockGetTransaction,
    getByProviderId: mockGetByProviderId,
  },
  walletAuditService: { log: mockAuditLog },
  isValidWalletAddress: (addr: string, network: string) => {
    if (
      network === 'ethereum' ||
      network === 'polygon' ||
      network === 'base' ||
      network === 'arbitrum'
    ) {
      return /^0x[a-fA-F0-9]{40}$/.test(addr);
    }
    if (network === 'solana') {
      return addr.length >= 32 && addr.length <= 44;
    }
    return false;
  },
  normalizeAddress: (addr: string, network: string) => {
    if (['ethereum', 'polygon', 'base', 'arbitrum'].includes(network)) {
      return addr.toLowerCase();
    }
    return addr;
  },
  BlockchainNetwork: {},
}));

const mockSupabaseFrom = jest.fn<any>();

jest.unstable_mockModule('../lib/supabase.js', () => ({
  supabase: { from: mockSupabaseFrom },
}));

jest.unstable_mockModule('../middleware/logging.middleware.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.unstable_mockModule('../middleware/rateLimit.middleware.js', () => ({
  apiLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  sensitiveLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'provider@test.com',
};

jest.unstable_mockModule('../middleware/auth.middleware.js', () => ({
  authenticate: (req: any, _res: Response, next: NextFunction) => {
    req.user = mockUser;
    next();
  },
  authenticateWithProfile: (req: any, _res: Response, next: NextFunction) => {
    req.user = mockUser;
    req.profile = { id: mockUser.id, role: 'provider' };
    next();
  },
  requireRole:
    (..._roles: string[]) =>
    (_req: Request, _res: Response, next: NextFunction) =>
      next(),
  AuthenticatedRequest: {},
}));

// ── Dynamic imports ──

const { default: express } = await import('express');
const { default: request } = await import('supertest');
const { default: walletRouter } = await import('../routes/wallet.routes.js');
const { sendErrorResponse } = await import('../utils/errors.js');

// ── App factory ──

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/wallet', walletRouter);
  app.use((err: any, req: any, res: any, _next: any) => {
    sendErrorResponse(res, err, req.requestId);
  });
  return app;
}

// ── Tests ──

describe('wallet.routes', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuditLog.mockResolvedValue(undefined);
  });

  // Helper for Supabase chain mocks
  function mockSupabaseChain(result: { data: any; error: any }) {
    const chain: any = {};
    chain.select = jest.fn<any>().mockReturnValue(chain);
    chain.eq = jest.fn<any>().mockReturnValue(chain);
    chain.single = jest.fn<any>().mockResolvedValue(result);
    mockSupabaseFrom.mockReturnValue(chain);
    return chain;
  }

  // ────────────── POST /wallet/challenge ──────────────

  describe('POST /wallet/challenge', () => {
    const validEthAddr = '0x1234567890abcdef1234567890abcdef12345678';

    it('generates a challenge for a valid wallet', async () => {
      // No existing wallet found
      mockSupabaseChain({ data: null, error: { code: 'PGRST116' } });
      mockGenerate.mockResolvedValue({
        id: 'chal_1',
        challenge_message: 'Sign this message',
        expires_at: '2025-02-01T00:00:00Z',
      });

      const res = await request(app)
        .post('/wallet/challenge')
        .set('Authorization', 'Bearer token')
        .send({ walletAddress: validEthAddr, network: 'ethereum' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.challengeId).toBe('chal_1');
      expect(res.body.data.message).toBe('Sign this message');
      expect(mockAuditLog).toHaveBeenCalled();
    });

    it('returns 400 for missing walletAddress', async () => {
      const res = await request(app)
        .post('/wallet/challenge')
        .set('Authorization', 'Bearer token')
        .send({ network: 'ethereum' });

      expect(res.status).toBe(400);
    });

    it('returns 400 for unsupported network', async () => {
      const res = await request(app)
        .post('/wallet/challenge')
        .set('Authorization', 'Bearer token')
        .send({ walletAddress: validEthAddr, network: 'bitcoin' });

      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid address format', async () => {
      const res = await request(app)
        .post('/wallet/challenge')
        .set('Authorization', 'Bearer token')
        .send({ walletAddress: 'not-a-wallet', network: 'ethereum' });

      expect(res.status).toBe(400);
    });

    it('returns 409 when wallet already linked to user', async () => {
      mockSupabaseChain({ data: { id: 'w1', user_id: mockUser.id }, error: null });

      const res = await request(app)
        .post('/wallet/challenge')
        .set('Authorization', 'Bearer token')
        .send({ walletAddress: validEthAddr, network: 'ethereum' });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already linked');
    });

    it('returns 409 when wallet linked to another user', async () => {
      mockSupabaseChain({ data: { id: 'w1', user_id: 'other-user-id' }, error: null });

      const res = await request(app)
        .post('/wallet/challenge')
        .set('Authorization', 'Bearer token')
        .send({ walletAddress: validEthAddr, network: 'ethereum' });

      expect(res.status).toBe(409);
    });
  });

  // ────────────── POST /wallet/verify ──────────────

  describe('POST /wallet/verify', () => {
    const validAddr = '0x1234567890abcdef1234567890abcdef12345678';

    it('verifies and links wallet on success', async () => {
      // Mock provider lookup
      mockSupabaseChain({ data: { id: 'prov_1' }, error: null });

      mockLink.mockResolvedValue({
        id: 'wallet_1',
        wallet_address: validAddr.toLowerCase(),
        blockchain_network: 'ethereum',
        wallet_label: 'My Wallet',
        verification_status: 'verified',
        verified_at: '2025-01-15T00:00:00Z',
      });

      const res = await request(app)
        .post('/wallet/verify')
        .set('Authorization', 'Bearer token')
        .send({
          challengeId: 'chal_1',
          signature: '0xsig123',
          walletAddress: validAddr,
          network: 'ethereum',
          label: 'My Wallet',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.verificationStatus).toBe('verified');
      expect(mockAuditLog).toHaveBeenCalledTimes(1);
    });

    it('returns 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/wallet/verify')
        .set('Authorization', 'Bearer token')
        .send({ challengeId: 'chal_1' });

      expect(res.status).toBe(400);
    });

    it('returns 400 for unsupported network', async () => {
      const res = await request(app)
        .post('/wallet/verify')
        .set('Authorization', 'Bearer token')
        .send({
          challengeId: 'chal_1',
          signature: '0xsig',
          walletAddress: validAddr,
          network: 'bitcoin',
        });

      expect(res.status).toBe(400);
    });

    it('logs failure and re-throws on link error', async () => {
      mockSupabaseChain({ data: null, error: { code: 'PGRST116' } });
      mockLink.mockRejectedValue(new Error('Signature verification failed'));

      const res = await request(app)
        .post('/wallet/verify')
        .set('Authorization', 'Bearer token')
        .send({
          challengeId: 'chal_1',
          signature: '0xbadsig',
          walletAddress: validAddr,
          network: 'ethereum',
        });

      expect(res.status).toBe(500);
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'wallet_link_failed', success: false })
      );
    });
  });

  // ────────────── GET /wallet/list ──────────────

  describe('GET /wallet/list', () => {
    it('returns linked wallets for user', async () => {
      mockGetByUserId.mockResolvedValue([
        {
          id: 'w1',
          wallet_address: '0xabc',
          blockchain_network: 'ethereum',
          wallet_label: 'Main',
          verification_status: 'verified',
          is_primary_payout: false,
          payout_enabled: true,
          min_payout_amount: 10,
          payout_currency: 'USDC',
          created_at: '2025-01-01',
        },
        {
          id: 'w2',
          wallet_address: '0xdef',
          blockchain_network: 'polygon',
          wallet_label: 'Alt',
          verification_status: 'verified',
          is_primary_payout: false,
          payout_enabled: false,
          min_payout_amount: 10,
          payout_currency: 'USDT',
          created_at: '2025-01-02',
        },
      ]);

      const res = await request(app).get('/wallet/list').set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });
  });

  // ────────────── GET /wallet/:id ──────────────

  describe('GET /wallet/:id', () => {
    it('returns wallet details', async () => {
      mockGetById.mockResolvedValue({
        id: 'w1',
        user_id: mockUser.id,
        wallet_address: '0xabc',
        blockchain_network: 'ethereum',
      });

      const res = await request(app).get('/wallet/w1').set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('w1');
    });

    it('returns 404 when wallet not found', async () => {
      mockGetById.mockResolvedValue(null);

      const res = await request(app)
        .get('/wallet/nonexistent')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
    });

    it('returns 404 when wallet belongs to another user (service enforces ownership)', async () => {
      // Service returns null when userId doesn't match — route throws notFound
      mockGetById.mockResolvedValue(null);

      const res = await request(app).get('/wallet/w1').set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
    });
  });

  // ────────────── DELETE /wallet/:id ──────────────

  describe('DELETE /wallet/:id', () => {
    it('unlinks wallet successfully', async () => {
      mockGetById.mockResolvedValue({
        id: 'w1',
        user_id: mockUser.id,
        wallet_address: '0xabc',
        blockchain_network: 'ethereum',
      });
      mockUnlink.mockResolvedValue(undefined);

      const res = await request(app).delete('/wallet/w1').set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'wallet_unlinked' })
      );
    });

    it('returns 404 when wallet not found', async () => {
      mockGetById.mockResolvedValue(null);

      const res = await request(app)
        .delete('/wallet/nonexistent')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
    });

    it('returns 404 when wallet belongs to another user (service enforces ownership)', async () => {
      // Service returns null when userId doesn't match — route throws notFound
      mockGetById.mockResolvedValue(null);

      const res = await request(app).delete('/wallet/w1').set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
    });
  });

  // ────────────── GET /wallet/transactions ──────────────

  describe('GET /wallet/transactions', () => {
    it('returns transactions for provider', async () => {
      // Provider lookup
      mockSupabaseChain({ data: { id: 'prov_1' }, error: null });
      mockGetByProviderId.mockResolvedValue([
        {
          id: 'tx1',
          transaction_type: 'payout',
          amount: '100',
          currency: 'USDC',
          fiat_equivalent: '100',
          status: 'completed',
          tx_hash: '0xhash',
          created_at: '2025-01-01',
        },
      ]);

      const res = await request(app)
        .get('/wallet/transactions')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 404 when provider profile not found', async () => {
      mockSupabaseChain({ data: null, error: { code: 'PGRST116' } });

      const res = await request(app)
        .get('/wallet/transactions')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
    });
  });

  // ────────────── GET /wallet/transactions/:id ──────────────

  describe('GET /wallet/transactions/:id', () => {
    it('returns a single transaction', async () => {
      mockSupabaseChain({ data: { id: 'prov_1' }, error: null });
      mockGetTransaction.mockResolvedValue({
        id: 'tx1',
        provider_id: 'prov_1',
        transaction_type: 'payout',
        amount: '100',
        currency: 'USDC',
        status: 'confirmed',
      });

      const res = await request(app)
        .get('/wallet/transactions/tx1')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('tx1');
    });

    it('returns 404 when transaction not found', async () => {
      mockSupabaseChain({ data: { id: 'prov_1' }, error: null });
      mockGetTransaction.mockResolvedValue(null);

      const res = await request(app)
        .get('/wallet/transactions/tx-unknown')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
    });

    it('returns 404 when transaction belongs to another provider', async () => {
      mockSupabaseChain({ data: { id: 'prov_1' }, error: null });
      mockGetTransaction.mockResolvedValue({
        id: 'tx1',
        provider_id: 'other-provider',
        status: 'confirmed',
      });

      const res = await request(app)
        .get('/wallet/transactions/tx1')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
    });

    it('returns 404 when provider profile not found', async () => {
      mockSupabaseChain({ data: null, error: { code: 'PGRST116' } });

      const res = await request(app)
        .get('/wallet/transactions/tx1')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
    });
  });

  // ────────────── PATCH /wallet/:id ──────────────

  describe('PATCH /wallet/:id', () => {
    it('updates wallet label', async () => {
      mockUpdate.mockResolvedValue({
        id: 'w1',
        wallet_address: '0xabc',
        blockchain_network: 'ethereum',
        wallet_label: 'New Label',
        payout_enabled: true,
        min_payout_amount: 10,
        payout_currency: 'USDC',
        updated_at: '2025-01-15',
      });

      const res = await request(app)
        .patch('/wallet/w1')
        .set('Authorization', 'Bearer token')
        .send({ label: 'New Label' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.label).toBe('New Label');
    });

    it('updates payout settings', async () => {
      mockUpdate.mockResolvedValue({
        id: 'w1',
        wallet_address: '0xabc',
        blockchain_network: 'ethereum',
        wallet_label: 'W',
        payout_enabled: true,
        min_payout_amount: 50,
        payout_currency: 'USDT',
        updated_at: '2025-01-15',
      });

      const res = await request(app)
        .patch('/wallet/w1')
        .set('Authorization', 'Bearer token')
        .send({ payoutEnabled: true, minPayoutAmount: 50, payoutCurrency: 'USDT' });

      expect(res.status).toBe(200);
      expect(res.body.data.minPayoutAmount).toBe(50);
      expect(res.body.data.payoutCurrency).toBe('USDT');
    });

    it('returns 400 when minPayoutAmount is below 10', async () => {
      const res = await request(app)
        .patch('/wallet/w1')
        .set('Authorization', 'Bearer token')
        .send({ minPayoutAmount: 5 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('at least 10');
    });

    it('returns 400 for invalid currency', async () => {
      const res = await request(app)
        .patch('/wallet/w1')
        .set('Authorization', 'Bearer token')
        .send({ payoutCurrency: 'DOGE' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid currency');
    });

    it('returns 400 when no valid updates provided', async () => {
      const res = await request(app)
        .patch('/wallet/w1')
        .set('Authorization', 'Bearer token')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('No valid updates');
    });
  });

  // ────────────── POST /wallet/:id/primary ──────────────

  describe('POST /wallet/:id/primary', () => {
    it('sets wallet as primary payout', async () => {
      mockSetPrimary.mockResolvedValue({
        id: 'w1',
        wallet_address: '0xabc',
        is_primary_payout: true,
        payout_enabled: true,
        provider_id: 'prov_1',
      });

      const res = await request(app)
        .post('/wallet/w1/primary')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isPrimaryPayout).toBe(true);
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'set_primary_payout' })
      );
    });

    it('returns 500 when service throws', async () => {
      mockSetPrimary.mockRejectedValue(new Error('Wallet not found'));

      const res = await request(app)
        .post('/wallet/w1/primary')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(500);
    });
  });

  // ────────────── POST /wallet/:id/revoke ──────────────

  describe('POST /wallet/:id/revoke', () => {
    it('revokes a wallet as admin', async () => {
      mockRevoke.mockResolvedValue({
        id: 'w1',
        verification_status: 'revoked',
        payout_enabled: false,
      });

      const res = await request(app)
        .post('/wallet/w1/revoke')
        .set('Authorization', 'Bearer token')
        .send({ reason: 'Suspicious activity' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.verificationStatus).toBe('revoked');
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'wallet_revoked_admin' })
      );
    });

    it('returns 500 when revoke fails', async () => {
      mockRevoke.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post('/wallet/w1/revoke')
        .set('Authorization', 'Bearer token')
        .send({ reason: 'test' });

      expect(res.status).toBe(500);
    });
  });
});
