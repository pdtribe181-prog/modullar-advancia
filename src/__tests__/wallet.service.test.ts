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
const { signatureVerificationService, walletChallengeService, linkedWalletsService } =
  await import('../services/wallet.service');

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
});
