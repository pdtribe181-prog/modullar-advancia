/**
 * Auth Service Tests — comprehensive coverage
 * Covers: signUp, signIn, signOut, getCurrentUser, getSession,
 *   resetPassword, updatePassword, onAuthStateChange, signInWithProvider,
 *   phone auth, MFA, reauthenticate, resendEmailConfirmation, updateEmail
 */
import { jest } from '@jest/globals';

// Build comprehensive Supabase auth mock
const mockSignUp = jest.fn<any>();
const mockSignInWithPassword = jest.fn<any>();
const mockSignOut = jest.fn<any>();
const mockGetUser = jest.fn<any>();
const mockGetSession = jest.fn<any>();
const mockResetPasswordForEmail = jest.fn<any>();
const mockUpdateUser = jest.fn<any>();
const mockOnAuthStateChange = jest.fn<any>();
const mockSignInWithOAuth = jest.fn<any>();
const mockSignInWithOtp = jest.fn<any>();
const mockVerifyOtp = jest.fn<any>();
const mockResend = jest.fn<any>();
const mockReauthenticate = jest.fn<any>();

// MFA
const mockMfaEnroll = jest.fn<any>();
const mockMfaChallenge = jest.fn<any>();
const mockMfaVerify = jest.fn<any>();
const mockMfaListFactors = jest.fn<any>();
const mockMfaUnenroll = jest.fn<any>();
const mockMfaGetAssuranceLevel = jest.fn<any>();

// DB chain helper for profile operations
function createChain(finalResult: any) {
  const c: any = {};
  c.select = jest.fn<any>().mockReturnValue(c);
  c.insert = jest.fn<any>().mockReturnValue(c);
  c.eq = jest.fn<any>().mockReturnValue(c);
  c.single = jest.fn<any>().mockResolvedValue(finalResult);
  c.then = (resolve: any, reject: any) => Promise.resolve(finalResult).then(resolve, reject);
  return c;
}

const mockFrom = jest.fn<any>();

const mockSupabase = {
  auth: {
    signUp: mockSignUp,
    signInWithPassword: mockSignInWithPassword,
    signOut: mockSignOut,
    getUser: mockGetUser,
    getSession: mockGetSession,
    resetPasswordForEmail: mockResetPasswordForEmail,
    updateUser: mockUpdateUser,
    onAuthStateChange: mockOnAuthStateChange,
    signInWithOAuth: mockSignInWithOAuth,
    signInWithOtp: mockSignInWithOtp,
    verifyOtp: mockVerifyOtp,
    resend: mockResend,
    reauthenticate: mockReauthenticate,
    mfa: {
      enroll: mockMfaEnroll,
      challenge: mockMfaChallenge,
      verify: mockMfaVerify,
      listFactors: mockMfaListFactors,
      unenroll: mockMfaUnenroll,
      getAuthenticatorAssuranceLevel: mockMfaGetAssuranceLevel,
    },
  },
  from: mockFrom,
};

jest.unstable_mockModule('../lib/supabase.js', () => ({
  getSupabaseClient: () => mockSupabase,
  supabase: mockSupabase,
}));

const { authService } = await import('../services/auth.service.js');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Auth Service', () => {
  // ---- signUp ----
  describe('signUp', () => {
    it('signs up user and creates profile', async () => {
      const user = { id: 'u-1', email: 'test@example.com' };
      mockSignUp.mockResolvedValue({ data: { user, session: null }, error: null });
      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const result = await authService.signUp('test@example.com', 'password123', 'Test User', 'patient');
      expect(result.user).toEqual(user);
      expect(mockSignUp).toHaveBeenCalledWith(expect.objectContaining({ email: 'test@example.com', password: 'password123' }));
      expect(mockFrom).toHaveBeenCalledWith('user_profiles');
    });

    it('throws on auth error', async () => {
      mockSignUp.mockResolvedValue({ data: { user: null }, error: new Error('Signup failed') });
      await expect(authService.signUp('bad@test.com', 'pw', 'Name')).rejects.toThrow('Signup failed');
    });

    it('throws on profile creation error', async () => {
      const user = { id: 'u-2', email: 'test2@example.com' };
      mockSignUp.mockResolvedValue({ data: { user, session: null }, error: null });
      const chain = createChain({ data: null, error: new Error('Profile error') });
      mockFrom.mockReturnValue(chain);

      await expect(authService.signUp('test2@example.com', 'pw', 'Name')).rejects.toThrow('Profile error');
    });

    it('defaults role to patient', async () => {
      const user = { id: 'u-3', email: 'test3@example.com' };
      mockSignUp.mockResolvedValue({ data: { user, session: null }, error: null });
      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      await authService.signUp('test3@example.com', 'pw', 'Name');
      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            data: expect.objectContaining({ role: 'patient' }),
          }),
        })
      );
    });
  });

  // ---- signIn ----
  describe('signIn', () => {
    it('signs in with email and password', async () => {
      const data = { user: { id: 'u-1' }, session: { access_token: 'tok' } };
      mockSignInWithPassword.mockResolvedValue({ data, error: null });

      const result = await authService.signIn('test@example.com', 'password123');
      expect(result).toEqual(data);
    });

    it('throws on error', async () => {
      mockSignInWithPassword.mockResolvedValue({ data: null, error: new Error('Bad credentials') });
      await expect(authService.signIn('bad@test.com', 'wrong')).rejects.toThrow('Bad credentials');
    });
  });

  // ---- signOut ----
  describe('signOut', () => {
    it('signs out successfully', async () => {
      mockSignOut.mockResolvedValue({ error: null });
      await expect(authService.signOut()).resolves.toBeUndefined();
    });

    it('throws on error', async () => {
      mockSignOut.mockResolvedValue({ error: new Error('Signout failed') });
      await expect(authService.signOut()).rejects.toThrow('Signout failed');
    });
  });

  // ---- getCurrentUser ----
  describe('getCurrentUser', () => {
    it('returns current user', async () => {
      const user = { id: 'u-1', email: 'test@test.com' };
      mockGetUser.mockResolvedValue({ data: { user }, error: null });

      const result = await authService.getCurrentUser();
      expect(result).toEqual(user);
    });

    it('throws on error', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('No session') });
      await expect(authService.getCurrentUser()).rejects.toThrow('No session');
    });
  });

  // ---- getSession ----
  describe('getSession', () => {
    it('returns current session', async () => {
      const session = { access_token: 'tok', refresh_token: 'ref' };
      mockGetSession.mockResolvedValue({ data: { session }, error: null });

      const result = await authService.getSession();
      expect(result).toEqual(session);
    });

    it('throws on error', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: new Error('Expired') });
      await expect(authService.getSession()).rejects.toThrow('Expired');
    });
  });

  // ---- resetPassword ----
  describe('resetPassword', () => {
    it('sends reset email', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
      const result = await authService.resetPassword('test@example.com');
      expect(result).toBeDefined();
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('test@example.com', expect.any(Object));
    });

    it('throws on error', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ data: null, error: new Error('Bad email') });
      await expect(authService.resetPassword('bad@test.com')).rejects.toThrow('Bad email');
    });
  });

  // ---- updatePassword ----
  describe('updatePassword', () => {
    it('updates user password', async () => {
      const data = { user: { id: 'u-1' } };
      mockUpdateUser.mockResolvedValue({ data, error: null });

      const result = await authService.updatePassword('newPw123');
      expect(result).toEqual(data);
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newPw123' });
    });

    it('throws on error', async () => {
      mockUpdateUser.mockResolvedValue({ data: null, error: new Error('Weak password') });
      await expect(authService.updatePassword('pw')).rejects.toThrow('Weak password');
    });
  });

  // ---- onAuthStateChange ----
  describe('onAuthStateChange', () => {
    it('subscribes to auth state changes', () => {
      const unsub = { data: { subscription: { unsubscribe: jest.fn() } } };
      mockOnAuthStateChange.mockReturnValue(unsub);

      const cb = jest.fn();
      const result = authService.onAuthStateChange(cb);
      expect(result).toEqual(unsub);
      expect(mockOnAuthStateChange).toHaveBeenCalledWith(cb);
    });
  });

  // ---- signInWithProvider ----
  describe('signInWithProvider', () => {
    it('initiates OAuth flow', async () => {
      const data = { url: 'https://oauth.example.com', provider: 'google' };
      mockSignInWithOAuth.mockResolvedValue({ data, error: null });

      const result = await authService.signInWithProvider('google');
      expect(result).toEqual(data);
    });

    it('throws on error', async () => {
      mockSignInWithOAuth.mockResolvedValue({ data: null, error: new Error('OAuth failed') });
      await expect(authService.signInWithProvider('github')).rejects.toThrow('OAuth failed');
    });
  });

  // ---- Phone Auth ----
  describe('signUpWithPhone', () => {
    it('sends OTP for phone sign up', async () => {
      const data = { user: null, session: null };
      mockSignInWithOtp.mockResolvedValue({ data, error: null });

      const result = await authService.signUpWithPhone('+1234567890', 'Test User');
      expect(result).toEqual(data);
      expect(mockSignInWithOtp).toHaveBeenCalledWith(expect.objectContaining({ phone: '+1234567890' }));
    });

    it('throws on error', async () => {
      mockSignInWithOtp.mockResolvedValue({ data: null, error: new Error('Invalid phone') });
      await expect(authService.signUpWithPhone('+bad', 'Name')).rejects.toThrow('Invalid phone');
    });
  });

  describe('signInWithPhone', () => {
    it('sends OTP for phone sign in', async () => {
      mockSignInWithOtp.mockResolvedValue({ data: { messageId: 'msg-1' }, error: null });

      const result = await authService.signInWithPhone('+1234567890');
      expect(result).toEqual({ messageId: 'msg-1' });
    });

    it('handles null messageId', async () => {
      mockSignInWithOtp.mockResolvedValue({ data: { messageId: null }, error: null });

      const result = await authService.signInWithPhone('+1234567890');
      expect(result).toEqual({ messageId: undefined });
    });
  });

  describe('verifyPhoneOtp', () => {
    it('verifies OTP and creates profile if needed', async () => {
      const user = { id: 'u-ph-1', phone: '+123', user_metadata: { full_name: 'Phone User', role: 'patient' } };
      mockVerifyOtp.mockResolvedValue({ data: { user, session: {} }, error: null });

      // First call: select (no existing profile)
      const selectChain = createChain({ data: null, error: { code: 'PGRST116' } });
      // Second call: insert
      const insertChain = createChain({ data: null, error: null });
      mockFrom.mockReturnValueOnce(selectChain).mockReturnValueOnce(insertChain);

      const result = await authService.verifyPhoneOtp('+123', '123456');
      expect(result.user).toEqual(user);
    });

    it('skips profile creation if profile exists', async () => {
      const user = { id: 'u-ph-2', phone: '+123', user_metadata: {} };
      mockVerifyOtp.mockResolvedValue({ data: { user, session: {} }, error: null });

      const selectChain = createChain({ data: { id: 'u-ph-2' }, error: null });
      mockFrom.mockReturnValue(selectChain);

      const result = await authService.verifyPhoneOtp('+123', '654321');
      expect(result.user).toEqual(user);
      // insert should NOT be called (only select)
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });

    it('throws on verify error', async () => {
      mockVerifyOtp.mockResolvedValue({ data: null, error: new Error('Invalid OTP') });
      await expect(authService.verifyPhoneOtp('+123', 'wrong')).rejects.toThrow('Invalid OTP');
    });
  });

  describe('updatePhone', () => {
    it('updates phone number', async () => {
      const data = { user: { id: 'u-1', phone: '+999' } };
      mockUpdateUser.mockResolvedValue({ data, error: null });

      const result = await authService.updatePhone('+999');
      expect(result).toEqual(data);
    });
  });

  describe('resendPhoneOtp', () => {
    it('resends OTP', async () => {
      mockResend.mockResolvedValue({ data: { messageId: 'msg-2' }, error: null });

      const result = await authService.resendPhoneOtp('+123');
      expect(result).toEqual({ messageId: 'msg-2' });
    });
  });

  // ---- MFA ----
  describe('enrollMFA', () => {
    it('enrolls TOTP factor', async () => {
      const data = { id: 'f-1', type: 'totp', totp: { qr_code: 'qr', secret: 'sec', uri: 'otpauth://' } };
      mockMfaEnroll.mockResolvedValue({ data, error: null });

      const result = await authService.enrollMFA();
      expect(result).toEqual(data);
      expect(mockMfaEnroll).toHaveBeenCalledWith({ factorType: 'totp', friendlyName: 'Authenticator App' });
    });

    it('accepts custom friendly name', async () => {
      const data = { id: 'f-2', type: 'totp', totp: { qr_code: 'qr', secret: 's', uri: 'u' } };
      mockMfaEnroll.mockResolvedValue({ data, error: null });

      await authService.enrollMFA('My App');
      expect(mockMfaEnroll).toHaveBeenCalledWith({ factorType: 'totp', friendlyName: 'My App' });
    });

    it('throws on error', async () => {
      mockMfaEnroll.mockResolvedValue({ data: null, error: new Error('MFA error') });
      await expect(authService.enrollMFA()).rejects.toThrow('MFA error');
    });
  });

  describe('verifyMFA', () => {
    it('creates challenge then verifies', async () => {
      mockMfaChallenge.mockResolvedValue({ data: { id: 'ch-1' }, error: null });
      mockMfaVerify.mockResolvedValue({ data: { access_token: 'mfa-tok' }, error: null });

      const result = await authService.verifyMFA('f-1', '123456');
      expect(result).toEqual({ access_token: 'mfa-tok' });
      expect(mockMfaChallenge).toHaveBeenCalledWith({ factorId: 'f-1' });
      expect(mockMfaVerify).toHaveBeenCalledWith({ factorId: 'f-1', challengeId: 'ch-1', code: '123456' });
    });

    it('throws on challenge error', async () => {
      mockMfaChallenge.mockResolvedValue({ data: null, error: new Error('Challenge failed') });
      await expect(authService.verifyMFA('f-1', '123456')).rejects.toThrow('Challenge failed');
    });

    it('throws on verify error', async () => {
      mockMfaChallenge.mockResolvedValue({ data: { id: 'ch-1' }, error: null });
      mockMfaVerify.mockResolvedValue({ data: null, error: new Error('Bad code') });
      await expect(authService.verifyMFA('f-1', '000000')).rejects.toThrow('Bad code');
    });
  });

  describe('challengeMFA', () => {
    it('creates challenge then verifies', async () => {
      mockMfaChallenge.mockResolvedValue({ data: { id: 'ch-2' }, error: null });
      mockMfaVerify.mockResolvedValue({ data: { access_token: 'aal2-tok' }, error: null });

      const result = await authService.challengeMFA('f-2', '654321');
      expect(result).toEqual({ access_token: 'aal2-tok' });
    });
  });

  describe('listMFAFactors', () => {
    it('returns all factors', async () => {
      const factors = [{ id: 'f-1', type: 'totp', status: 'verified' }];
      mockMfaListFactors.mockResolvedValue({ data: { all: factors }, error: null });

      const result = await authService.listMFAFactors();
      expect(result).toEqual(factors);
    });

    it('returns empty array when no factors', async () => {
      mockMfaListFactors.mockResolvedValue({ data: { all: null }, error: null });

      const result = await authService.listMFAFactors();
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      mockMfaListFactors.mockResolvedValue({ data: null, error: new Error('List failed') });
      await expect(authService.listMFAFactors()).rejects.toThrow('List failed');
    });
  });

  describe('unenrollMFA', () => {
    it('unenrolls factor', async () => {
      mockMfaUnenroll.mockResolvedValue({ data: { id: 'f-1' }, error: null });

      const result = await authService.unenrollMFA('f-1');
      expect(result).toEqual({ id: 'f-1' });
    });

    it('throws on error', async () => {
      mockMfaUnenroll.mockResolvedValue({ data: null, error: new Error('Unenroll failed') });
      await expect(authService.unenrollMFA('f-bad')).rejects.toThrow('Unenroll failed');
    });
  });

  describe('getMFAAssuranceLevel', () => {
    it('returns assurance level info', async () => {
      mockMfaGetAssuranceLevel.mockResolvedValue({
        data: { currentLevel: 'aal1', nextLevel: 'aal2', currentAuthenticationMethods: [{ method: 'password' }] },
        error: null,
      });

      const result = await authService.getMFAAssuranceLevel();
      expect(result).toEqual({
        currentLevel: 'aal1',
        nextLevel: 'aal2',
        currentAuthenticationMethods: [{ method: 'password' }],
      });
    });

    it('throws on error', async () => {
      mockMfaGetAssuranceLevel.mockResolvedValue({ data: null, error: new Error('Assurance error') });
      await expect(authService.getMFAAssuranceLevel()).rejects.toThrow('Assurance error');
    });
  });

  describe('isMFARequired', () => {
    it('returns true when aal1 → aal2', async () => {
      mockMfaGetAssuranceLevel.mockResolvedValue({
        data: { currentLevel: 'aal1', nextLevel: 'aal2', currentAuthenticationMethods: [] },
        error: null,
      });

      const result = await authService.isMFARequired();
      expect(result).toBe(true);
    });

    it('returns false when already aal2', async () => {
      mockMfaGetAssuranceLevel.mockResolvedValue({
        data: { currentLevel: 'aal2', nextLevel: 'aal2', currentAuthenticationMethods: [] },
        error: null,
      });

      const result = await authService.isMFARequired();
      expect(result).toBe(false);
    });

    it('returns false on error', async () => {
      mockMfaGetAssuranceLevel.mockResolvedValue({
        data: null,
        error: new Error('Assurance check failed'),
      });

      const result = await authService.isMFARequired();
      expect(result).toBe(false);
    });
  });

  // ---- Reauth ----
  describe('reauthenticate', () => {
    it('requests reauthentication', async () => {
      mockReauthenticate.mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null });

      const result = await authService.reauthenticate();
      expect(result).toEqual({ user: { id: 'u-1' } });
    });

    it('throws on error', async () => {
      mockReauthenticate.mockResolvedValue({ data: null, error: new Error('Reauth failed') });
      await expect(authService.reauthenticate()).rejects.toThrow('Reauth failed');
    });
  });

  // ---- Email Verification ----
  describe('resendEmailConfirmation', () => {
    it('resends confirmation email', async () => {
      mockResend.mockResolvedValue({ data: { messageId: 'em-1' }, error: null });

      const result = await authService.resendEmailConfirmation('test@example.com');
      expect(result).toEqual({ messageId: 'em-1' });
      expect(mockResend).toHaveBeenCalledWith({ type: 'signup', email: 'test@example.com' });
    });

    it('throws on error', async () => {
      mockResend.mockResolvedValue({ data: null, error: new Error('Resend failed') });
      await expect(authService.resendEmailConfirmation('bad@test.com')).rejects.toThrow('Resend failed');
    });
  });

  describe('updateEmail', () => {
    it('updates email address', async () => {
      const data = { user: { id: 'u-1', email: 'new@example.com' } };
      mockUpdateUser.mockResolvedValue({ data, error: null });

      const result = await authService.updateEmail('new@example.com');
      expect(result).toEqual(data);
      expect(mockUpdateUser).toHaveBeenCalledWith({ email: 'new@example.com' });
    });

    it('throws on error', async () => {
      mockUpdateUser.mockResolvedValue({ data: null, error: new Error('Email update failed') });
      await expect(authService.updateEmail('bad')).rejects.toThrow('Email update failed');
    });
  });
});
