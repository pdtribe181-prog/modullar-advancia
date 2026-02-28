/**
 * Unit tests for wallet service - signature verification
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock ethers verifyMessage
const mockVerifyMessage = jest.fn<any>();
jest.unstable_mockModule('ethers', () => ({
  verifyMessage: mockVerifyMessage,
}));

// Mock tweetnacl
const mockVerifyDetached = jest.fn<any>();
jest.unstable_mockModule('tweetnacl', () => ({
  default: {
    sign: {
      detached: {
        verify: mockVerifyDetached,
      },
    },
  },
}));

// Mock bs58
const mockBs58Decode = jest.fn<any>();
jest.unstable_mockModule('bs58', () => ({
  default: {
    decode: mockBs58Decode,
  },
}));

// Mock Supabase and env
const mockInsert = jest.fn<any>();
const mockSelect = jest.fn<any>();
const mockSingle = jest.fn<any>();
const mockUpdate = jest.fn<any>();
const mockFrom = jest.fn<any>();
const mockEq = jest.fn<any>();

jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

jest.unstable_mockModule('../config/env', () => ({
  getEnv: jest.fn(() => ({
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-key',
  })),
}));

// Dynamic import after mocks
const {
  signatureVerificationService,
  walletChallengeService,
  linkedWalletsService,
  walletTransactionsService,
  walletAuditService,
  isValidWalletAddress,
  normalizeAddress,
} = await import('../services/wallet.service');

describe('Wallet Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // SIGNATURE VERIFICATION
  // ============================================================
  describe('signatureVerificationService', () => {
    describe('verifyEvmSignature', () => {
      it('should return true when recovered address matches', () => {
        const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD00';
        const message = 'Test message';
        const signature = '0x' + 'a'.repeat(130); // 132 chars total

        mockVerifyMessage.mockReturnValue(address);

        const result = signatureVerificationService.verifyEvmSignature(message, signature, address);

        expect(result).toBe(true);
        expect(mockVerifyMessage).toHaveBeenCalledWith(message, signature);
      });

      it('should return true for case-insensitive address match', () => {
        const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD00';
        const message = 'Test message';
        const signature = '0x' + 'a'.repeat(130);

        mockVerifyMessage.mockReturnValue(address.toUpperCase());

        const result = signatureVerificationService.verifyEvmSignature(
          message,
          signature,
          address.toLowerCase()
        );

        expect(result).toBe(true);
      });

      it('should return false when signature format is invalid (no 0x prefix)', () => {
        const result = signatureVerificationService.verifyEvmSignature(
          'msg',
          'not-hex-sig',
          '0xabc'
        );
        expect(result).toBe(false);
        expect(mockVerifyMessage).not.toHaveBeenCalled();
      });

      it('should return false when signature has wrong length', () => {
        const result = signatureVerificationService.verifyEvmSignature(
          'msg',
          '0x' + 'a'.repeat(10), // too short
          '0xabc'
        );
        expect(result).toBe(false);
      });

      it('should return false when recovered address does not match', () => {
        mockVerifyMessage.mockReturnValue('0xDIFFERENTADDRESS');

        const result = signatureVerificationService.verifyEvmSignature(
          'msg',
          '0x' + 'a'.repeat(130),
          '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD00'
        );
        expect(result).toBe(false);
      });

      it('should return false when verifyMessage throws', () => {
        mockVerifyMessage.mockImplementation(() => {
          throw new Error('Invalid signature');
        });

        const result = signatureVerificationService.verifyEvmSignature(
          'msg',
          '0x' + 'a'.repeat(130),
          '0xabc'
        );
        expect(result).toBe(false);
      });
    });

    describe('verifySolanaSignature', () => {
      const validAddress = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH'; // 44 chars
      const validPublicKey = new Uint8Array(32).fill(1);
      const validSigBytes = new Uint8Array(64).fill(2);

      beforeEach(() => {
        mockBs58Decode.mockImplementation((input: string) => {
          if (input === validAddress) return validPublicKey;
          return validSigBytes; // for signature decode
        });
      });

      it('should return true for valid Solana signature', () => {
        mockVerifyDetached.mockReturnValue(true);

        const result = signatureVerificationService.verifySolanaSignature(
          'Test message',
          'base58signaturestring', // will be bs58.decoded
          validAddress
        );

        expect(result).toBe(true);
        expect(mockVerifyDetached).toHaveBeenCalled();
      });

      it('should return false when address is too short', () => {
        const result = signatureVerificationService.verifySolanaSignature(
          'msg',
          'sig',
          'short' // too short
        );
        expect(result).toBe(false);
      });

      it('should return false when address is too long', () => {
        const result = signatureVerificationService.verifySolanaSignature(
          'msg',
          'sig',
          'a'.repeat(50) // too long
        );
        expect(result).toBe(false);
      });

      it('should return false when public key is not 32 bytes', () => {
        mockBs58Decode.mockReturnValue(new Uint8Array(31)); // wrong length

        const result = signatureVerificationService.verifySolanaSignature(
          'msg',
          'sig',
          validAddress
        );
        expect(result).toBe(false);
      });

      it('should return false when signature is not 64 bytes', () => {
        mockBs58Decode
          .mockReturnValueOnce(validPublicKey) // address decode OK
          .mockReturnValueOnce(new Uint8Array(63)); // signature decode wrong length

        const result = signatureVerificationService.verifySolanaSignature(
          'msg',
          'sig',
          validAddress
        );
        expect(result).toBe(false);
      });

      it('should return false when nacl verification fails', () => {
        mockVerifyDetached.mockReturnValue(false);

        const result = signatureVerificationService.verifySolanaSignature(
          'Test message',
          'invalidsig',
          validAddress
        );

        expect(result).toBe(false);
      });

      it('should fall back to base64 when bs58 decode fails', () => {
        // First call for address succeeds, second call (signature) throws, falls back to base64
        let callCount = 0;
        mockBs58Decode.mockImplementation(() => {
          callCount++;
          if (callCount === 1) return validPublicKey;
          throw new Error('Invalid base58');
        });
        mockVerifyDetached.mockReturnValue(true);

        const base64Sig = Buffer.from(new Uint8Array(64).fill(3)).toString('base64');

        const result = signatureVerificationService.verifySolanaSignature(
          'Test message',
          base64Sig,
          validAddress
        );

        expect(result).toBe(true);
      });

      it('should return false when exception is thrown', () => {
        mockBs58Decode.mockImplementation(() => {
          throw new Error('Decode error');
        });

        const result = signatureVerificationService.verifySolanaSignature(
          'msg',
          'sig',
          validAddress
        );
        expect(result).toBe(false);
      });
    });

    describe('verify (network router)', () => {
      beforeEach(() => {
        // Set up valid EVM response for quick testing
        mockVerifyMessage.mockReturnValue('0xabc');
      });

      it('should route ethereum to EVM verification', () => {
        signatureVerificationService.verify('ethereum', 'msg', '0x' + 'a'.repeat(130), '0xabc');
        expect(mockVerifyMessage).toHaveBeenCalled();
      });

      it('should route polygon to EVM verification', () => {
        signatureVerificationService.verify('polygon', 'msg', '0x' + 'a'.repeat(130), '0xabc');
        expect(mockVerifyMessage).toHaveBeenCalled();
      });

      it('should route base to EVM verification', () => {
        signatureVerificationService.verify('base', 'msg', '0x' + 'a'.repeat(130), '0xabc');
        expect(mockVerifyMessage).toHaveBeenCalled();
      });

      it('should route arbitrum to EVM verification', () => {
        signatureVerificationService.verify('arbitrum', 'msg', '0x' + 'a'.repeat(130), '0xabc');
        expect(mockVerifyMessage).toHaveBeenCalled();
      });

      it('should route solana to Solana verification', () => {
        const validAddress = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';
        mockBs58Decode.mockReturnValue(new Uint8Array(32));
        mockVerifyDetached.mockReturnValue(true);

        signatureVerificationService.verify('solana', 'msg', 'sig', validAddress);
        // bs58.decode is called for Solana, not ethers
      });

      it('should return false for unsupported network', () => {
        const result = signatureVerificationService.verify('bitcoin' as any, 'msg', 'sig', 'addr');
        expect(result).toBe(false);
      });
    });
  });

  // ============================================================
  // WALLET CHALLENGE SERVICE (DB interactions)
  // ============================================================
  describe('walletChallengeService', () => {
    describe('generate', () => {
      it('should expire existing challenges and create a new one', async () => {
        const mockChallenge = {
          id: 'ch-1',
          user_id: 'user-1',
          wallet_address: '0xabc',
          blockchain_network: 'ethereum',
          challenge_message: 'test',
          nonce: 'nonce123',
          status: 'pending',
          expires_at: new Date(Date.now() + 900000).toISOString(),
        };

        // Chain: from().update().eq().eq().eq()
        const updateEq3 = jest.fn<any>().mockResolvedValue({ error: null });
        const updateEq2 = jest.fn<any>().mockReturnValue({ eq: updateEq3 });
        const updateEq1 = jest.fn<any>().mockReturnValue({ eq: updateEq2 });
        const mockUpdateFn = jest.fn<any>().mockReturnValue({ eq: updateEq1 });

        // Chain: from().insert().select().single()
        const insertSingle = jest.fn<any>().mockResolvedValue({ data: mockChallenge, error: null });
        const insertSelect = jest.fn<any>().mockReturnValue({ single: insertSingle });
        const mockInsertFn = jest.fn<any>().mockReturnValue({ select: insertSelect });

        let fromCallCount = 0;
        mockFrom.mockImplementation(() => {
          fromCallCount++;
          if (fromCallCount === 1) {
            return { update: mockUpdateFn };
          }
          return { insert: mockInsertFn };
        });

        const result = await walletChallengeService.generate({
          walletAddress: '0xABC',
          network: 'ethereum',
          userId: 'user-1',
        });

        expect(result).toEqual(mockChallenge);
        expect(mockFrom).toHaveBeenCalledWith('wallet_verification_challenges');
      });

      it('should throw when insert fails', async () => {
        const updateEq3 = jest.fn<any>().mockResolvedValue({ error: null });
        const updateEq2 = jest.fn<any>().mockReturnValue({ eq: updateEq3 });
        const updateEq1 = jest.fn<any>().mockReturnValue({ eq: updateEq2 });
        const mockUpdateFn = jest.fn<any>().mockReturnValue({ eq: updateEq1 });

        const insertSingle = jest.fn<any>().mockResolvedValue({
          data: null,
          error: { message: 'Insert failed' },
        });
        const insertSelect = jest.fn<any>().mockReturnValue({ single: insertSingle });
        const mockInsertFn = jest.fn<any>().mockReturnValue({ select: insertSelect });

        let fromCallCount = 0;
        mockFrom.mockImplementation(() => {
          fromCallCount++;
          if (fromCallCount === 1) return { update: mockUpdateFn };
          return { insert: mockInsertFn };
        });

        await expect(
          walletChallengeService.generate({
            walletAddress: '0xABC',
            network: 'ethereum',
            userId: 'user-1',
          })
        ).rejects.toThrow('Failed to create challenge');
      });
    });

    describe('getById', () => {
      it('should return challenge data when found', async () => {
        const mockChallenge = { id: 'ch-1', status: 'pending' };
        const selectSingle = jest.fn<any>().mockResolvedValue({ data: mockChallenge, error: null });
        const selectEq = jest.fn<any>().mockReturnValue({ single: selectSingle });
        const mockSelectFn = jest.fn<any>().mockReturnValue({ eq: selectEq });
        mockFrom.mockReturnValue({ select: mockSelectFn });

        const result = await walletChallengeService.getById('ch-1');
        expect(result).toEqual(mockChallenge);
      });

      it('should return null when not found', async () => {
        const selectSingle = jest.fn<any>().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        });
        const selectEq = jest.fn<any>().mockReturnValue({ single: selectSingle });
        const mockSelectFn = jest.fn<any>().mockReturnValue({ eq: selectEq });
        mockFrom.mockReturnValue({ select: mockSelectFn });

        const result = await walletChallengeService.getById('ch-999');
        expect(result).toBeNull();
      });
    });

    describe('complete', () => {
      it('should update challenge status to completed', async () => {
        const updateEq = jest.fn<any>().mockResolvedValue({ error: null });
        const mockUpdateFn = jest.fn<any>().mockReturnValue({ eq: updateEq });
        mockFrom.mockReturnValue({ update: mockUpdateFn });

        await expect(walletChallengeService.complete('ch-1', '0xsig')).resolves.toBeUndefined();

        expect(mockUpdateFn).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'completed',
            signature: '0xsig',
          })
        );
      });

      it('should throw when update fails', async () => {
        const updateEq = jest.fn<any>().mockResolvedValue({
          error: { message: 'Update failed' },
        });
        const mockUpdateFn = jest.fn<any>().mockReturnValue({ eq: updateEq });
        mockFrom.mockReturnValue({ update: mockUpdateFn });

        await expect(walletChallengeService.complete('ch-1', '0xsig')).rejects.toThrow(
          'Failed to complete challenge'
        );
      });
    });
  });

  // ============================================================
  // LINKED WALLETS SERVICE
  // ============================================================

  describe('linkedWalletsService', () => {
    describe('link', () => {
      const validParams = {
        userId: 'user-1',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        network: 'ethereum' as const,
        signature: '0x' + 'ab'.repeat(65), // 132-char EVM signature (0x + 130 hex chars)
        challengeId: 'ch-1',
        label: 'My Wallet',
      };

      const mockChallenge = {
        id: 'ch-1',
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        challenge_message: 'Sign this message',
        status: 'pending',
        expires_at: new Date(Date.now() + 600000).toISOString(),
      };

      it('should link a wallet after successful verification', async () => {
        // Mock walletChallengeService.getById
        const selectSingle = jest.fn<any>().mockResolvedValue({
          data: mockChallenge,
          error: null,
        });
        const selectEq = jest.fn<any>().mockReturnValue({ single: selectSingle });
        const mockSelectFn = jest.fn<any>().mockReturnValue({ eq: selectEq });

        // Mock verify signature - return true
        mockVerifyMessage.mockReturnValue(validParams.walletAddress);

        // Track call count to mockFrom
        let callCount = 0;
        mockFrom.mockImplementation((table: string) => {
          callCount++;
          if (table === 'wallet_verification_challenges') {
            if (callCount <= 1) {
              // getById
              return { select: mockSelectFn };
            } else {
              // complete
              const eqFn = jest.fn<any>().mockResolvedValue({ error: null });
              return { update: jest.fn<any>().mockReturnValue({ eq: eqFn }) };
            }
          }
          if (table === 'linked_wallets') {
            if (callCount <= 3) {
              // check existing
              const single2 = jest
                .fn<any>()
                .mockResolvedValue({ data: null, error: { message: 'Not found' } });
              const eq2 = jest.fn<any>().mockReturnValue({ single: single2 });
              const eq1 = jest.fn<any>().mockReturnValue({ eq: eq2 });
              return { select: jest.fn<any>().mockReturnValue({ eq: eq1 }) };
            } else {
              // insert
              const walletData = {
                id: 'w-1',
                user_id: validParams.userId,
                wallet_address: validParams.walletAddress.toLowerCase(),
                blockchain_network: validParams.network,
                verification_status: 'verified',
              };
              const insertSingle = jest
                .fn<any>()
                .mockResolvedValue({ data: walletData, error: null });
              const insertSelect = jest.fn<any>().mockReturnValue({ single: insertSingle });
              return { insert: jest.fn<any>().mockReturnValue({ select: insertSelect }) };
            }
          }
          return {};
        });

        const result = await linkedWalletsService.link(validParams);
        expect(result).toBeDefined();
        expect(result.verification_status).toBe('verified');
      });

      it('should throw when challenge not found', async () => {
        const selectSingle = jest.fn<any>().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        });
        const selectEq = jest.fn<any>().mockReturnValue({ single: selectSingle });
        const mockSelectFn = jest.fn<any>().mockReturnValue({ eq: selectEq });
        mockFrom.mockReturnValue({ select: mockSelectFn });

        await expect(linkedWalletsService.link(validParams)).rejects.toThrow('Challenge not found');
      });

      it('should throw when challenge already used', async () => {
        const usedChallenge = { ...mockChallenge, status: 'completed' };
        const selectSingle = jest.fn<any>().mockResolvedValue({
          data: usedChallenge,
          error: null,
        });
        const selectEq = jest.fn<any>().mockReturnValue({ single: selectSingle });
        const mockSelectFn = jest.fn<any>().mockReturnValue({ eq: selectEq });
        mockFrom.mockReturnValue({ select: mockSelectFn });

        await expect(linkedWalletsService.link(validParams)).rejects.toThrow(
          'Challenge already used or expired'
        );
      });

      it('should throw when challenge expired', async () => {
        const expiredChallenge = {
          ...mockChallenge,
          expires_at: new Date(Date.now() - 60000).toISOString(),
        };
        const selectSingle = jest.fn<any>().mockResolvedValue({
          data: expiredChallenge,
          error: null,
        });
        const selectEq = jest.fn<any>().mockReturnValue({ single: selectSingle });
        const mockSelectFn = jest.fn<any>().mockReturnValue({ eq: selectEq });
        mockFrom.mockReturnValue({ select: mockSelectFn });

        await expect(linkedWalletsService.link(validParams)).rejects.toThrow(
          'Challenge has expired'
        );
      });

      it('should throw when wallet address does not match challenge', async () => {
        const mismatchChallenge = { ...mockChallenge, wallet_address: '0xDIFFERENT' };
        const selectSingle = jest.fn<any>().mockResolvedValue({
          data: mismatchChallenge,
          error: null,
        });
        const selectEq = jest.fn<any>().mockReturnValue({ single: selectSingle });
        const mockSelectFn = jest.fn<any>().mockReturnValue({ eq: selectEq });
        mockFrom.mockReturnValue({ select: mockSelectFn });

        await expect(linkedWalletsService.link(validParams)).rejects.toThrow(
          'Wallet address mismatch'
        );
      });

      it('should throw when signature is invalid', async () => {
        // Signature verification fails
        mockVerifyMessage.mockReturnValue('0xDIFFERENTADDRESS');

        let callCount = 0;
        mockFrom.mockImplementation((table: string) => {
          callCount++;
          if (table === 'wallet_verification_challenges') {
            if (callCount <= 1) {
              const selectSingle = jest.fn<any>().mockResolvedValue({
                data: mockChallenge,
                error: null,
              });
              const selectEq = jest.fn<any>().mockReturnValue({ single: selectSingle });
              return { select: jest.fn<any>().mockReturnValue({ eq: selectEq }) };
            } else {
              // update challenge to failed
              const eqFn = jest.fn<any>().mockResolvedValue({ error: null });
              return { update: jest.fn<any>().mockReturnValue({ eq: eqFn }) };
            }
          }
          return {};
        });

        await expect(linkedWalletsService.link(validParams)).rejects.toThrow('Invalid signature');
      });

      it('should throw when wallet already linked', async () => {
        mockVerifyMessage.mockReturnValue(validParams.walletAddress);

        let callCount = 0;
        mockFrom.mockImplementation((table: string) => {
          callCount++;
          if (table === 'wallet_verification_challenges') {
            if (callCount <= 1) {
              const selectSingle = jest
                .fn<any>()
                .mockResolvedValue({ data: mockChallenge, error: null });
              const selectEq = jest.fn<any>().mockReturnValue({ single: selectSingle });
              return { select: jest.fn<any>().mockReturnValue({ eq: selectEq }) };
            }
            const eqFn = jest.fn<any>().mockResolvedValue({ error: null });
            return { update: jest.fn<any>().mockReturnValue({ eq: eqFn }) };
          }
          if (table === 'linked_wallets') {
            const single2 = jest
              .fn<any>()
              .mockResolvedValue({ data: { id: 'existing-w' }, error: null });
            const eq2 = jest.fn<any>().mockReturnValue({ single: single2 });
            const eq1 = jest.fn<any>().mockReturnValue({ eq: eq2 });
            return { select: jest.fn<any>().mockReturnValue({ eq: eq1 }) };
          }
          return {};
        });

        await expect(linkedWalletsService.link(validParams)).rejects.toThrow(
          'Wallet already linked to an account'
        );
      });

      it('should throw when insert fails', async () => {
        mockVerifyMessage.mockReturnValue(validParams.walletAddress);

        let callCount = 0;
        mockFrom.mockImplementation((table: string) => {
          callCount++;
          if (table === 'wallet_verification_challenges') {
            if (callCount <= 1) {
              const selectSingle = jest
                .fn<any>()
                .mockResolvedValue({ data: mockChallenge, error: null });
              const selectEq = jest.fn<any>().mockReturnValue({ single: selectSingle });
              return { select: jest.fn<any>().mockReturnValue({ eq: selectEq }) };
            }
            const eqFn = jest.fn<any>().mockResolvedValue({ error: null });
            return { update: jest.fn<any>().mockReturnValue({ eq: eqFn }) };
          }
          if (table === 'linked_wallets') {
            if (callCount <= 3) {
              const single2 = jest
                .fn<any>()
                .mockResolvedValue({ data: null, error: { message: 'Not found' } });
              const eq2 = jest.fn<any>().mockReturnValue({ single: single2 });
              const eq1 = jest.fn<any>().mockReturnValue({ eq: eq2 });
              return { select: jest.fn<any>().mockReturnValue({ eq: eq1 }) };
            }
            const insertSingle = jest
              .fn<any>()
              .mockResolvedValue({ data: null, error: { message: 'DB insert error' } });
            const insertSelect = jest.fn<any>().mockReturnValue({ single: insertSingle });
            return { insert: jest.fn<any>().mockReturnValue({ select: insertSelect }) };
          }
          return {};
        });

        await expect(linkedWalletsService.link(validParams)).rejects.toThrow(
          'Failed to link wallet'
        );
      });
    });

    describe('getByUserId', () => {
      it('should return wallets for user', async () => {
        const wallets = [{ id: 'w-1' }, { id: 'w-2' }];
        const orderFn = jest.fn<any>().mockResolvedValue({ data: wallets, error: null });
        const eqFn = jest.fn<any>().mockReturnValue({ order: orderFn });
        const selectFn = jest.fn<any>().mockReturnValue({ eq: eqFn });
        mockFrom.mockReturnValue({ select: selectFn });

        const result = await linkedWalletsService.getByUserId('user-1');
        expect(result).toEqual(wallets);
      });

      it('should return empty array on null data', async () => {
        const orderFn = jest.fn<any>().mockResolvedValue({ data: null, error: null });
        const eqFn = jest.fn<any>().mockReturnValue({ order: orderFn });
        const selectFn = jest.fn<any>().mockReturnValue({ eq: eqFn });
        mockFrom.mockReturnValue({ select: selectFn });

        const result = await linkedWalletsService.getByUserId('user-1');
        expect(result).toEqual([]);
      });

      it('should throw on error', async () => {
        const orderFn = jest.fn<any>().mockResolvedValue({
          data: null,
          error: { message: 'DB error' },
        });
        const eqFn = jest.fn<any>().mockReturnValue({ order: orderFn });
        const selectFn = jest.fn<any>().mockReturnValue({ eq: eqFn });
        mockFrom.mockReturnValue({ select: selectFn });

        await expect(linkedWalletsService.getByUserId('user-1')).rejects.toThrow(
          'Failed to get wallets'
        );
      });
    });

    describe('getByProviderId', () => {
      it('should return verified provider wallets', async () => {
        const wallets = [{ id: 'w-1', is_primary_payout: true }];
        const orderFn = jest.fn<any>().mockResolvedValue({ data: wallets, error: null });
        const eq2 = jest.fn<any>().mockReturnValue({ order: orderFn });
        const eq1 = jest.fn<any>().mockReturnValue({ eq: eq2 });
        const selectFn = jest.fn<any>().mockReturnValue({ eq: eq1 });
        mockFrom.mockReturnValue({ select: selectFn });

        const result = await linkedWalletsService.getByProviderId('prov-1');
        expect(result).toEqual(wallets);
      });

      it('should throw on error', async () => {
        const orderFn = jest.fn<any>().mockResolvedValue({
          data: null,
          error: { message: 'DB error' },
        });
        const eq2 = jest.fn<any>().mockReturnValue({ order: orderFn });
        const eq1 = jest.fn<any>().mockReturnValue({ eq: eq2 });
        const selectFn = jest.fn<any>().mockReturnValue({ eq: eq1 });
        mockFrom.mockReturnValue({ select: selectFn });

        await expect(linkedWalletsService.getByProviderId('prov-1')).rejects.toThrow(
          'Failed to get provider wallets'
        );
      });
    });

    describe('getById', () => {
      it('should return wallet by id and userId', async () => {
        const wallet = { id: 'w-1', user_id: 'user-1' };
        const singleFn = jest.fn<any>().mockResolvedValue({ data: wallet, error: null });
        const eq2 = jest.fn<any>().mockReturnValue({ single: singleFn });
        const eq1 = jest.fn<any>().mockReturnValue({ eq: eq2 });
        const selectFn = jest.fn<any>().mockReturnValue({ eq: eq1 });
        mockFrom.mockReturnValue({ select: selectFn });

        const result = await linkedWalletsService.getById('w-1', 'user-1');
        expect(result).toEqual(wallet);
      });

      it('should return null on error', async () => {
        const singleFn = jest.fn<any>().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        });
        const eq2 = jest.fn<any>().mockReturnValue({ single: singleFn });
        const eq1 = jest.fn<any>().mockReturnValue({ eq: eq2 });
        const selectFn = jest.fn<any>().mockReturnValue({ eq: eq1 });
        mockFrom.mockReturnValue({ select: selectFn });

        const result = await linkedWalletsService.getById('w-99', 'user-1');
        expect(result).toBeNull();
      });
    });

    describe('setPrimaryPayout', () => {
      it('should set wallet as primary payout', async () => {
        const wallet = {
          id: 'w-1',
          user_id: 'user-1',
          verification_status: 'verified',
          provider_id: 'prov-1',
        };
        const updatedWallet = { ...wallet, is_primary_payout: true, payout_enabled: true };

        let callCount = 0;
        mockFrom.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // getById
            const singleFn = jest.fn<any>().mockResolvedValue({ data: wallet, error: null });
            const eq2 = jest.fn<any>().mockReturnValue({ single: singleFn });
            const eq1 = jest.fn<any>().mockReturnValue({ eq: eq2 });
            return { select: jest.fn<any>().mockReturnValue({ eq: eq1 }) };
          }
          if (callCount === 2) {
            // clear existing primary
            const eq2 = jest.fn<any>().mockResolvedValue({ error: null });
            const eq1 = jest.fn<any>().mockReturnValue({ eq: eq2 });
            return { update: jest.fn<any>().mockReturnValue({ eq: eq1 }) };
          }
          // set new primary
          const singleFn = jest.fn<any>().mockResolvedValue({
            data: updatedWallet,
            error: null,
          });
          const selectFn = jest.fn<any>().mockReturnValue({ single: singleFn });
          const eqFn = jest.fn<any>().mockReturnValue({ select: selectFn });
          return { update: jest.fn<any>().mockReturnValue({ eq: eqFn }) };
        });

        const result = await linkedWalletsService.setPrimaryPayout('w-1', 'user-1');
        expect(result.is_primary_payout).toBe(true);
      });

      it('should throw when wallet not found', async () => {
        const singleFn = jest.fn<any>().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        });
        const eq2 = jest.fn<any>().mockReturnValue({ single: singleFn });
        const eq1 = jest.fn<any>().mockReturnValue({ eq: eq2 });
        mockFrom.mockReturnValue({ select: jest.fn<any>().mockReturnValue({ eq: eq1 }) });

        await expect(linkedWalletsService.setPrimaryPayout('w-99', 'user-1')).rejects.toThrow(
          'Wallet not found'
        );
      });

      it('should throw when wallet not verified', async () => {
        const wallet = {
          id: 'w-1',
          user_id: 'user-1',
          verification_status: 'pending',
          provider_id: 'prov-1',
        };
        const singleFn = jest.fn<any>().mockResolvedValue({ data: wallet, error: null });
        const eq2 = jest.fn<any>().mockReturnValue({ single: singleFn });
        const eq1 = jest.fn<any>().mockReturnValue({ eq: eq2 });
        mockFrom.mockReturnValue({ select: jest.fn<any>().mockReturnValue({ eq: eq1 }) });

        await expect(linkedWalletsService.setPrimaryPayout('w-1', 'user-1')).rejects.toThrow(
          'Wallet must be verified to set as primary'
        );
      });

      it('should throw when wallet has no provider', async () => {
        const wallet = {
          id: 'w-1',
          user_id: 'user-1',
          verification_status: 'verified',
          provider_id: null,
        };
        const singleFn = jest.fn<any>().mockResolvedValue({ data: wallet, error: null });
        const eq2 = jest.fn<any>().mockReturnValue({ single: singleFn });
        const eq1 = jest.fn<any>().mockReturnValue({ eq: eq2 });
        mockFrom.mockReturnValue({ select: jest.fn<any>().mockReturnValue({ eq: eq1 }) });

        await expect(linkedWalletsService.setPrimaryPayout('w-1', 'user-1')).rejects.toThrow(
          'Wallet must be linked to a provider'
        );
      });

      it('should throw when final update fails', async () => {
        const wallet = {
          id: 'w-1',
          user_id: 'user-1',
          verification_status: 'verified',
          provider_id: 'prov-1',
        };

        let callCount = 0;
        mockFrom.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            const singleFn = jest.fn<any>().mockResolvedValue({ data: wallet, error: null });
            const eq2 = jest.fn<any>().mockReturnValue({ single: singleFn });
            const eq1 = jest.fn<any>().mockReturnValue({ eq: eq2 });
            return { select: jest.fn<any>().mockReturnValue({ eq: eq1 }) };
          }
          if (callCount === 2) {
            const eq2 = jest.fn<any>().mockResolvedValue({ error: null });
            const eq1 = jest.fn<any>().mockReturnValue({ eq: eq2 });
            return { update: jest.fn<any>().mockReturnValue({ eq: eq1 }) };
          }
          const singleFn = jest
            .fn<any>()
            .mockResolvedValue({ data: null, error: { message: 'DB error' } });
          const selectFn = jest.fn<any>().mockReturnValue({ single: singleFn });
          const eqFn = jest.fn<any>().mockReturnValue({ select: selectFn });
          return { update: jest.fn<any>().mockReturnValue({ eq: eqFn }) };
        });

        await expect(linkedWalletsService.setPrimaryPayout('w-1', 'user-1')).rejects.toThrow(
          'Failed to set primary wallet'
        );
      });
    });

    describe('update', () => {
      it('should update wallet settings', async () => {
        const wallet = { id: 'w-1', user_id: 'user-1' };
        const updated = { ...wallet, wallet_label: 'Updated' };

        let callCount = 0;
        mockFrom.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // getById
            const singleFn = jest.fn<any>().mockResolvedValue({ data: wallet, error: null });
            const eq2 = jest.fn<any>().mockReturnValue({ single: singleFn });
            const eq1 = jest.fn<any>().mockReturnValue({ eq: eq2 });
            return { select: jest.fn<any>().mockReturnValue({ eq: eq1 }) };
          }
          // update
          const singleFn = jest.fn<any>().mockResolvedValue({ data: updated, error: null });
          const selectFn = jest.fn<any>().mockReturnValue({ single: singleFn });
          const eqFn = jest.fn<any>().mockReturnValue({ select: selectFn });
          return { update: jest.fn<any>().mockReturnValue({ eq: eqFn }) };
        });

        const result = await linkedWalletsService.update('w-1', 'user-1', {
          wallet_label: 'Updated',
        });
        expect(result.wallet_label).toBe('Updated');
      });

      it('should throw when wallet not found', async () => {
        const singleFn = jest.fn<any>().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        });
        const eq2 = jest.fn<any>().mockReturnValue({ single: singleFn });
        const eq1 = jest.fn<any>().mockReturnValue({ eq: eq2 });
        mockFrom.mockReturnValue({ select: jest.fn<any>().mockReturnValue({ eq: eq1 }) });

        await expect(
          linkedWalletsService.update('w-99', 'user-1', { wallet_label: 'x' })
        ).rejects.toThrow('Wallet not found');
      });

      it('should throw when DB update fails', async () => {
        const wallet = { id: 'w-1', user_id: 'user-1' };

        let callCount = 0;
        mockFrom.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            const singleFn = jest.fn<any>().mockResolvedValue({ data: wallet, error: null });
            const eq2 = jest.fn<any>().mockReturnValue({ single: singleFn });
            const eq1 = jest.fn<any>().mockReturnValue({ eq: eq2 });
            return { select: jest.fn<any>().mockReturnValue({ eq: eq1 }) };
          }
          const singleFn = jest.fn<any>().mockResolvedValue({
            data: null,
            error: { message: 'DB error' },
          });
          const selectFn = jest.fn<any>().mockReturnValue({ single: singleFn });
          const eqFn = jest.fn<any>().mockReturnValue({ select: selectFn });
          return { update: jest.fn<any>().mockReturnValue({ eq: eqFn }) };
        });

        await expect(
          linkedWalletsService.update('w-1', 'user-1', { wallet_label: 'x' })
        ).rejects.toThrow('Failed to update wallet');
      });
    });

    describe('unlink', () => {
      it('should unlink a wallet with no pending transactions', async () => {
        const wallet = { id: 'w-1', user_id: 'user-1' };

        let callCount = 0;
        mockFrom.mockImplementation((table: string) => {
          callCount++;
          if (table === 'linked_wallets' && callCount === 1) {
            // getById
            const singleFn = jest.fn<any>().mockResolvedValue({ data: wallet, error: null });
            const eq2 = jest.fn<any>().mockReturnValue({ single: singleFn });
            const eq1 = jest.fn<any>().mockReturnValue({ eq: eq2 });
            return { select: jest.fn<any>().mockReturnValue({ eq: eq1 }) };
          }
          if (table === 'wallet_transactions') {
            // check pending transactions
            const limitFn = jest.fn<any>().mockResolvedValue({ data: [], error: null });
            const inFn = jest.fn<any>().mockReturnValue({ limit: limitFn });
            const eqFn = jest.fn<any>().mockReturnValue({ in: inFn });
            return { select: jest.fn<any>().mockReturnValue({ eq: eqFn }) };
          }
          // delete
          const eqFn = jest.fn<any>().mockResolvedValue({ error: null });
          return { delete: jest.fn<any>().mockReturnValue({ eq: eqFn }) };
        });

        await expect(linkedWalletsService.unlink('w-1', 'user-1')).resolves.toBeUndefined();
      });

      it('should throw when wallet not found', async () => {
        const singleFn = jest.fn<any>().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        });
        const eq2 = jest.fn<any>().mockReturnValue({ single: singleFn });
        const eq1 = jest.fn<any>().mockReturnValue({ eq: eq2 });
        mockFrom.mockReturnValue({ select: jest.fn<any>().mockReturnValue({ eq: eq1 }) });

        await expect(linkedWalletsService.unlink('w-99', 'user-1')).rejects.toThrow(
          'Wallet not found'
        );
      });

      it('should throw when pending transactions exist', async () => {
        const wallet = { id: 'w-1', user_id: 'user-1' };

        let callCount = 0;
        mockFrom.mockImplementation((table: string) => {
          callCount++;
          if (table === 'linked_wallets') {
            const singleFn = jest.fn<any>().mockResolvedValue({ data: wallet, error: null });
            const eq2 = jest.fn<any>().mockReturnValue({ single: singleFn });
            const eq1 = jest.fn<any>().mockReturnValue({ eq: eq2 });
            return { select: jest.fn<any>().mockReturnValue({ eq: eq1 }) };
          }
          if (table === 'wallet_transactions') {
            const limitFn = jest.fn<any>().mockResolvedValue({
              data: [{ id: 'tx-1' }],
              error: null,
            });
            const inFn = jest.fn<any>().mockReturnValue({ limit: limitFn });
            const eqFn = jest.fn<any>().mockReturnValue({ in: inFn });
            return { select: jest.fn<any>().mockReturnValue({ eq: eqFn }) };
          }
          return {};
        });

        await expect(linkedWalletsService.unlink('w-1', 'user-1')).rejects.toThrow(
          'Cannot unlink wallet with pending transactions'
        );
      });

      it('should throw when delete fails', async () => {
        const wallet = { id: 'w-1', user_id: 'user-1' };

        let callCount = 0;
        mockFrom.mockImplementation((table: string) => {
          callCount++;
          if (table === 'linked_wallets' && callCount === 1) {
            const singleFn = jest.fn<any>().mockResolvedValue({ data: wallet, error: null });
            const eq2 = jest.fn<any>().mockReturnValue({ single: singleFn });
            const eq1 = jest.fn<any>().mockReturnValue({ eq: eq2 });
            return { select: jest.fn<any>().mockReturnValue({ eq: eq1 }) };
          }
          if (table === 'wallet_transactions') {
            const limitFn = jest.fn<any>().mockResolvedValue({ data: [], error: null });
            const inFn = jest.fn<any>().mockReturnValue({ limit: limitFn });
            const eqFn = jest.fn<any>().mockReturnValue({ in: inFn });
            return { select: jest.fn<any>().mockReturnValue({ eq: eqFn }) };
          }
          const eqFn = jest.fn<any>().mockResolvedValue({ error: { message: 'delete error' } });
          return { delete: jest.fn<any>().mockReturnValue({ eq: eqFn }) };
        });

        await expect(linkedWalletsService.unlink('w-1', 'user-1')).rejects.toThrow(
          'Failed to unlink wallet'
        );
      });
    });

    describe('revoke', () => {
      it('should revoke a wallet', async () => {
        const revokedWallet = {
          id: 'w-1',
          verification_status: 'revoked',
          payout_enabled: false,
          is_primary_payout: false,
        };
        const singleFn = jest.fn<any>().mockResolvedValue({
          data: revokedWallet,
          error: null,
        });
        const selectFn = jest.fn<any>().mockReturnValue({ single: singleFn });
        const eqFn = jest.fn<any>().mockReturnValue({ select: selectFn });
        mockFrom.mockReturnValue({ update: jest.fn<any>().mockReturnValue({ eq: eqFn }) });

        const result = await linkedWalletsService.revoke('w-1');
        expect(result.verification_status).toBe('revoked');
        expect(result.payout_enabled).toBe(false);
      });

      it('should throw on error', async () => {
        const singleFn = jest.fn<any>().mockResolvedValue({
          data: null,
          error: { message: 'DB error' },
        });
        const selectFn = jest.fn<any>().mockReturnValue({ single: singleFn });
        const eqFn = jest.fn<any>().mockReturnValue({ select: selectFn });
        mockFrom.mockReturnValue({ update: jest.fn<any>().mockReturnValue({ eq: eqFn }) });

        await expect(linkedWalletsService.revoke('w-99')).rejects.toThrow(
          'Failed to revoke wallet'
        );
      });
    });
  });

  // ============================================================
  // WALLET TRANSACTIONS SERVICE
  // ============================================================

  describe('walletTransactionsService', () => {
    describe('getByProviderId', () => {
      it('should return provider transactions', async () => {
        const txns = [{ id: 'tx-1' }, { id: 'tx-2' }];
        const limitFn = jest.fn<any>().mockResolvedValue({ data: txns, error: null });
        const orderFn = jest.fn<any>().mockReturnValue({ limit: limitFn });
        const eqFn = jest.fn<any>().mockReturnValue({ order: orderFn });
        const selectFn = jest.fn<any>().mockReturnValue({ eq: eqFn });
        mockFrom.mockReturnValue({ select: selectFn });

        const result = await walletTransactionsService.getByProviderId('prov-1');
        expect(result).toEqual(txns);
      });

      it('should return empty array when no data', async () => {
        const limitFn = jest.fn<any>().mockResolvedValue({ data: null, error: null });
        const orderFn = jest.fn<any>().mockReturnValue({ limit: limitFn });
        const eqFn = jest.fn<any>().mockReturnValue({ order: orderFn });
        const selectFn = jest.fn<any>().mockReturnValue({ eq: eqFn });
        mockFrom.mockReturnValue({ select: selectFn });

        const result = await walletTransactionsService.getByProviderId('prov-1');
        expect(result).toEqual([]);
      });

      it('should throw on error', async () => {
        const limitFn = jest.fn<any>().mockResolvedValue({
          data: null,
          error: { message: 'DB error' },
        });
        const orderFn = jest.fn<any>().mockReturnValue({ limit: limitFn });
        const eqFn = jest.fn<any>().mockReturnValue({ order: orderFn });
        const selectFn = jest.fn<any>().mockReturnValue({ eq: eqFn });
        mockFrom.mockReturnValue({ select: selectFn });

        await expect(walletTransactionsService.getByProviderId('prov-1')).rejects.toThrow(
          'Failed to get transactions'
        );
      });
    });

    describe('getById', () => {
      it('should return transaction by id', async () => {
        const tx = { id: 'tx-1', status: 'confirmed' };
        const singleFn = jest.fn<any>().mockResolvedValue({ data: tx, error: null });
        const eqFn = jest.fn<any>().mockReturnValue({ single: singleFn });
        const selectFn = jest.fn<any>().mockReturnValue({ eq: eqFn });
        mockFrom.mockReturnValue({ select: selectFn });

        const result = await walletTransactionsService.getById('tx-1');
        expect(result).toEqual(tx);
      });

      it('should return null when not found', async () => {
        const singleFn = jest.fn<any>().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        });
        const eqFn = jest.fn<any>().mockReturnValue({ single: singleFn });
        const selectFn = jest.fn<any>().mockReturnValue({ eq: eqFn });
        mockFrom.mockReturnValue({ select: selectFn });

        const result = await walletTransactionsService.getById('tx-999');
        expect(result).toBeNull();
      });
    });

    describe('initiatePayout', () => {
      const payoutParams = {
        walletId: 'w-1',
        providerId: 'prov-1',
        amount: 100,
        currency: 'USDC',
        fiatEquivalent: 100,
        invoiceIds: ['inv-1'],
      };

      it('should create pending payout transaction', async () => {
        const wallet = {
          id: 'w-1',
          blockchain_network: 'ethereum',
          min_payout_amount: 10,
        };
        const txData = {
          id: 'tx-1',
          status: 'pending',
          amount: 100,
        };

        let callCount = 0;
        mockFrom.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // get wallet
            const singleFn = jest.fn<any>().mockResolvedValue({ data: wallet, error: null });
            const eq4 = jest.fn<any>().mockReturnValue({ single: singleFn });
            const eq3 = jest.fn<any>().mockReturnValue({ eq: eq4 });
            const eq2 = jest.fn<any>().mockReturnValue({ eq: eq3 });
            const eq1 = jest.fn<any>().mockReturnValue({ eq: eq2 });
            return { select: jest.fn<any>().mockReturnValue({ eq: eq1 }) };
          }
          // insert transaction
          const singleFn = jest.fn<any>().mockResolvedValue({ data: txData, error: null });
          const selectFn = jest.fn<any>().mockReturnValue({ single: singleFn });
          return { insert: jest.fn<any>().mockReturnValue({ select: selectFn }) };
        });

        const result = await walletTransactionsService.initiatePayout(payoutParams);
        expect(result.status).toBe('pending');
      });

      it('should throw when wallet not found or not enabled', async () => {
        const singleFn = jest.fn<any>().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        });
        const eq4 = jest.fn<any>().mockReturnValue({ single: singleFn });
        const eq3 = jest.fn<any>().mockReturnValue({ eq: eq4 });
        const eq2 = jest.fn<any>().mockReturnValue({ eq: eq3 });
        const eq1 = jest.fn<any>().mockReturnValue({ eq: eq2 });
        mockFrom.mockReturnValue({ select: jest.fn<any>().mockReturnValue({ eq: eq1 }) });

        await expect(walletTransactionsService.initiatePayout(payoutParams)).rejects.toThrow(
          'Wallet not found or not enabled for payouts'
        );
      });

      it('should throw when amount below minimum', async () => {
        const wallet = {
          id: 'w-1',
          blockchain_network: 'ethereum',
          min_payout_amount: 500,
        };
        const singleFn = jest.fn<any>().mockResolvedValue({ data: wallet, error: null });
        const eq4 = jest.fn<any>().mockReturnValue({ single: singleFn });
        const eq3 = jest.fn<any>().mockReturnValue({ eq: eq4 });
        const eq2 = jest.fn<any>().mockReturnValue({ eq: eq3 });
        const eq1 = jest.fn<any>().mockReturnValue({ eq: eq2 });
        mockFrom.mockReturnValue({ select: jest.fn<any>().mockReturnValue({ eq: eq1 }) });

        await expect(walletTransactionsService.initiatePayout(payoutParams)).rejects.toThrow(
          'Amount below minimum payout'
        );
      });

      it('should throw when payout insert fails', async () => {
        const wallet = {
          id: 'w-1',
          blockchain_network: 'ethereum',
          min_payout_amount: 10,
        };

        let callCount = 0;
        mockFrom.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            const singleFn = jest.fn<any>().mockResolvedValue({ data: wallet, error: null });
            const eq4 = jest.fn<any>().mockReturnValue({ single: singleFn });
            const eq3 = jest.fn<any>().mockReturnValue({ eq: eq4 });
            const eq2 = jest.fn<any>().mockReturnValue({ eq: eq3 });
            const eq1 = jest.fn<any>().mockReturnValue({ eq: eq2 });
            return { select: jest.fn<any>().mockReturnValue({ eq: eq1 }) };
          }
          const singleFn = jest
            .fn<any>()
            .mockResolvedValue({ data: null, error: { message: 'Insert error' } });
          const selectFn = jest.fn<any>().mockReturnValue({ single: singleFn });
          return { insert: jest.fn<any>().mockReturnValue({ select: selectFn }) };
        });

        await expect(walletTransactionsService.initiatePayout(payoutParams)).rejects.toThrow(
          'Failed to initiate payout'
        );
      });
    });

    describe('updateStatus', () => {
      it('should update transaction status', async () => {
        const updated = { id: 'tx-1', status: 'processing', tx_hash: '0xhash' };
        const singleFn = jest.fn<any>().mockResolvedValue({ data: updated, error: null });
        const selectFn = jest.fn<any>().mockReturnValue({ single: singleFn });
        const eqFn = jest.fn<any>().mockReturnValue({ select: selectFn });
        mockFrom.mockReturnValue({ update: jest.fn<any>().mockReturnValue({ eq: eqFn }) });

        const result = await walletTransactionsService.updateStatus('tx-1', 'processing', '0xhash');
        expect(result.status).toBe('processing');
      });

      it('should set confirmed_at for confirmed status', async () => {
        const updated = { id: 'tx-1', status: 'confirmed', confirmed_at: '2024-01-01' };
        const updateFn = jest.fn<any>();
        const singleFn = jest.fn<any>().mockResolvedValue({ data: updated, error: null });
        const selectFn = jest.fn<any>().mockReturnValue({ single: singleFn });
        const eqFn = jest.fn<any>().mockReturnValue({ select: selectFn });
        updateFn.mockReturnValue({ eq: eqFn });
        mockFrom.mockReturnValue({ update: updateFn });

        const result = await walletTransactionsService.updateStatus(
          'tx-1',
          'confirmed',
          '0xhash',
          12
        );
        expect(result.status).toBe('confirmed');
        const updateArg = updateFn.mock.calls[0][0] as any;
        expect(updateArg).toHaveProperty('confirmed_at');
        expect(updateArg.confirmations).toBe(12);
      });

      it('should throw on error', async () => {
        const singleFn = jest.fn<any>().mockResolvedValue({
          data: null,
          error: { message: 'DB error' },
        });
        const selectFn = jest.fn<any>().mockReturnValue({ single: singleFn });
        const eqFn = jest.fn<any>().mockReturnValue({ select: selectFn });
        mockFrom.mockReturnValue({ update: jest.fn<any>().mockReturnValue({ eq: eqFn }) });

        await expect(walletTransactionsService.updateStatus('tx-1', 'failed')).rejects.toThrow(
          'Failed to update transaction'
        );
      });
    });
  });

  // ============================================================
  // WALLET AUDIT SERVICE
  // ============================================================

  describe('walletAuditService', () => {
    describe('log', () => {
      it('should insert audit log entry', async () => {
        const insertFn = jest.fn<any>().mockResolvedValue({ error: null });
        mockFrom.mockReturnValue({ insert: insertFn });

        await walletAuditService.log({
          userId: 'user-1',
          providerId: 'prov-1',
          walletId: 'w-1',
          action: 'wallet_linked',
          details: { network: 'ethereum' },
          success: true,
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
        });

        expect(mockFrom).toHaveBeenCalledWith('wallet_audit_log');
        expect(insertFn).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: 'user-1',
            provider_id: 'prov-1',
            linked_wallet_id: 'w-1',
            action: 'wallet_linked',
            success: true,
          })
        );
      });

      it('should handle missing optional fields', async () => {
        const insertFn = jest.fn<any>().mockResolvedValue({ error: null });
        mockFrom.mockReturnValue({ insert: insertFn });

        await walletAuditService.log({
          userId: 'user-1',
          action: 'wallet_check',
          success: false,
          errorMessage: 'Something went wrong',
        });

        expect(insertFn).toHaveBeenCalledWith(
          expect.objectContaining({
            provider_id: null,
            linked_wallet_id: null,
            error_message: 'Something went wrong',
            ip_address: null,
            user_agent: null,
          })
        );
      });
    });

    describe('getByUserId', () => {
      it('should return audit logs for user', async () => {
        const logs = [{ id: 'log-1' }, { id: 'log-2' }];
        const limitFn = jest.fn<any>().mockResolvedValue({ data: logs, error: null });
        const orderFn = jest.fn<any>().mockReturnValue({ limit: limitFn });
        const eqFn = jest.fn<any>().mockReturnValue({ order: orderFn });
        const selectFn = jest.fn<any>().mockReturnValue({ eq: eqFn });
        mockFrom.mockReturnValue({ select: selectFn });

        const result = await walletAuditService.getByUserId('user-1');
        expect(result).toEqual(logs);
      });

      it('should use custom limit', async () => {
        const limitFn = jest.fn<any>().mockResolvedValue({ data: [], error: null });
        const orderFn = jest.fn<any>().mockReturnValue({ limit: limitFn });
        const eqFn = jest.fn<any>().mockReturnValue({ order: orderFn });
        const selectFn = jest.fn<any>().mockReturnValue({ eq: eqFn });
        mockFrom.mockReturnValue({ select: selectFn });

        await walletAuditService.getByUserId('user-1', 25);
        expect(limitFn).toHaveBeenCalledWith(25);
      });

      it('should throw on error', async () => {
        const limitFn = jest.fn<any>().mockResolvedValue({
          data: null,
          error: { message: 'DB error' },
        });
        const orderFn = jest.fn<any>().mockReturnValue({ limit: limitFn });
        const eqFn = jest.fn<any>().mockReturnValue({ order: orderFn });
        const selectFn = jest.fn<any>().mockReturnValue({ eq: eqFn });
        mockFrom.mockReturnValue({ select: selectFn });

        await expect(walletAuditService.getByUserId('user-1')).rejects.toThrow(
          'Failed to get audit log'
        );
      });
    });
  });

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================

  describe('isValidWalletAddress', () => {
    it('should validate EVM addresses', () => {
      expect(isValidWalletAddress('0x1234567890abcdef1234567890abcdef12345678', 'ethereum')).toBe(
        true
      );
      expect(isValidWalletAddress('0x1234567890abcdef1234567890abcdef12345678', 'polygon')).toBe(
        true
      );
      expect(isValidWalletAddress('0x1234567890abcdef1234567890abcdef12345678', 'base')).toBe(true);
      expect(isValidWalletAddress('0x1234567890abcdef1234567890abcdef12345678', 'arbitrum')).toBe(
        true
      );
    });

    it('should reject invalid EVM addresses', () => {
      expect(isValidWalletAddress('not-an-address', 'ethereum')).toBe(false);
      expect(isValidWalletAddress('0x1234', 'ethereum')).toBe(false);
      expect(isValidWalletAddress('', 'ethereum')).toBe(false);
    });

    it('should validate Solana addresses', () => {
      // Valid base58 string of 32-44 chars, no 0, O, I, l
      expect(isValidWalletAddress('4fYNw3dojWmQ4dXtSGE9epjRGy9pFSx62YypT7avPYvA', 'solana')).toBe(
        true
      );
    });

    it('should reject invalid Solana addresses', () => {
      expect(isValidWalletAddress('short', 'solana')).toBe(false);
      expect(isValidWalletAddress('', 'solana')).toBe(false);
    });

    it('should return false for unsupported networks', () => {
      expect(
        isValidWalletAddress('0x1234567890abcdef1234567890abcdef12345678', 'bitcoin' as any)
      ).toBe(false);
    });
  });

  describe('normalizeAddress', () => {
    it('should lowercase EVM addresses', () => {
      expect(normalizeAddress('0xABCDEF1234567890abcdef1234567890ABCDEF12', 'ethereum')).toBe(
        '0xabcdef1234567890abcdef1234567890abcdef12'
      );
      expect(normalizeAddress('0xABCDEF1234567890abcdef1234567890ABCDEF12', 'polygon')).toBe(
        '0xabcdef1234567890abcdef1234567890abcdef12'
      );
      expect(normalizeAddress('0xABCDEF1234567890abcdef1234567890ABCDEF12', 'base')).toBe(
        '0xabcdef1234567890abcdef1234567890abcdef12'
      );
      expect(normalizeAddress('0xABCDEF1234567890abcdef1234567890ABCDEF12', 'arbitrum')).toBe(
        '0xabcdef1234567890abcdef1234567890abcdef12'
      );
    });

    it('should preserve Solana address case', () => {
      const addr = '4fYNw3dojWmQ4dXtSGE9epjRGy9pFSx62YypT7avPYvA';
      expect(normalizeAddress(addr, 'solana')).toBe(addr);
    });

    it('should return address as-is for unknown network', () => {
      expect(normalizeAddress('SomeAddr', 'bitcoin' as any)).toBe('SomeAddr');
    });
  });
});
