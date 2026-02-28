/**
 * Auth Flow Integration Tests
 * Tests complete authentication flows: email verification, MFA, password reset,
 * identity linking, and security preferences.
 */

import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// ── Mocks ──

const mockGetUser = jest.fn<any>();
const mockSignInWithPassword = jest.fn<any>();
const mockSignUp = jest.fn<any>();
const mockSignOut = jest.fn<any>();
const mockRefreshSession = jest.fn<any>();
const mockResetPasswordForEmail = jest.fn<any>();
const mockUpdateUser = jest.fn<any>();
const mockSignInWithOtp = jest.fn<any>();
const mockVerifyOtp = jest.fn<any>();
const mockResend = jest.fn<any>();
const mockLinkIdentity = jest.fn<any>();
const mockMfaEnroll = jest.fn<any>();
const mockMfaChallenge = jest.fn<any>();
const mockMfaVerify = jest.fn<any>();
const mockMfaListFactors = jest.fn<any>();
const mockMfaUnenroll = jest.fn<any>();
const mockMfaGetAAL = jest.fn<any>();
const mockFrom = jest.fn<any>();

jest.unstable_mockModule('../lib/supabase.js', () => ({
  supabase: {
    auth: { getUser: mockGetUser },
    from: mockFrom,
  },
  createServiceClient: () => ({
    auth: {
      getUser: mockGetUser,
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
      refreshSession: mockRefreshSession,
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: mockUpdateUser,
      signInWithOtp: mockSignInWithOtp,
      verifyOtp: mockVerifyOtp,
      resend: mockResend,
      linkIdentity: mockLinkIdentity,
      mfa: {
        enroll: mockMfaEnroll,
        challenge: mockMfaChallenge,
        verify: mockMfaVerify,
        listFactors: mockMfaListFactors,
        unenroll: mockMfaUnenroll,
        getAuthenticatorAssuranceLevel: mockMfaGetAAL,
      },
    },
    from: mockFrom,
  }),
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
  authLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  apiLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  sensitiveLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

const mockLogSecurityEvent = jest.fn<any>();
const mockLogAndNotify = jest.fn<any>();
const mockExtractIPAddress = jest.fn<any>();

jest.unstable_mockModule('../services/security.service.js', () => ({
  logSecurityEvent: mockLogSecurityEvent,
  logAndNotify: mockLogAndNotify,
  extractIPAddress: mockExtractIPAddress,
}));

const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  phone: '+15551234567',
  user_metadata: { full_name: 'Test User' },
  identities: [
    {
      id: 'identity-1',
      provider: 'email',
      created_at: '2026-01-01',
      last_sign_in_at: '2026-02-01',
      identity_data: { email: 'test@example.com' },
    },
  ],
};

jest.unstable_mockModule('../middleware/auth.middleware.js', () => ({
  authenticate: (req: any, _res: Response, next: NextFunction) => {
    req.user = mockUser;
    next();
  },
  authenticateWithProfile: (req: any, _res: Response, next: NextFunction) => {
    req.user = mockUser;
    req.profile = { id: mockUser.id, role: 'patient' };
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
const { default: authRouter } = await import('../routes/auth.routes.js');
const { sendErrorResponse } = await import('../utils/errors.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRouter);
  app.use((err: any, _req: any, res: any, _next: any) => {
    sendErrorResponse(res, err, undefined);
  });
  return app;
}

function mockSupabaseChain(result: { data: any; error: any }) {
  const chain: any = {};
  chain.select = jest.fn<any>().mockReturnValue(chain);
  chain.insert = jest.fn<any>().mockReturnValue(chain);
  chain.update = jest.fn<any>().mockReturnValue(chain);
  chain.upsert = jest.fn<any>().mockReturnValue(chain);
  chain.eq = jest.fn<any>().mockReturnValue(chain);
  chain.single = jest.fn<any>().mockResolvedValue(result);
  chain.limit = jest.fn<any>().mockReturnValue(chain);
  chain.order = jest.fn<any>().mockReturnValue(chain);
  mockFrom.mockReturnValue(chain);
  return chain;
}

// ── Tests ──

describe('Auth Flow Integration', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockExtractIPAddress.mockReturnValue('127.0.0.1');
    mockLogSecurityEvent.mockResolvedValue('evt_1');
    mockLogAndNotify.mockResolvedValue(undefined);
  });

  // ────────────── Password Reset Flow ──────────────

  describe('Password Reset Flow', () => {
    it('POST /auth/forgot-password sends reset email', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

      const res = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'user@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Password reset email sent');
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        'user@example.com',
        expect.objectContaining({ redirectTo: expect.stringContaining('/reset-password') })
      );
    });

    it('PUT /auth/password updates password for authenticated user', async () => {
      mockUpdateUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const res = await request(app)
        .put('/auth/password')
        .set('Authorization', 'Bearer test-token')
        .send({ password: 'NewSecureP@ss1' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Password updated');
      expect(mockLogAndNotify).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'password_changed' }),
        expect.any(Object)
      );
    });

    it('PUT /auth/password rejects short passwords', async () => {
      const res = await request(app)
        .put('/auth/password')
        .set('Authorization', 'Bearer test-token')
        .send({ password: 'short' });

      expect(res.status).toBe(400);
    });
  });

  // ────────────── Phone Auth Flow ──────────────

  describe('Phone Authentication Flow', () => {
    it('POST /auth/phone/signup sends OTP', async () => {
      mockSignInWithOtp.mockResolvedValue({ data: {}, error: null });

      const res = await request(app)
        .post('/auth/phone/signup')
        .send({ phone: '+15551234567', fullName: 'New User' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('OTP sent');
    });

    it('POST /auth/phone/signin sends OTP', async () => {
      mockSignInWithOtp.mockResolvedValue({ data: {}, error: null });

      const res = await request(app).post('/auth/phone/signin').send({ phone: '+15551234567' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('OTP sent');
    });

    it('POST /auth/phone/verify verifies OTP and returns session', async () => {
      const verifiedUser = { ...mockUser, id: 'verified-user-id' };
      mockVerifyOtp.mockResolvedValue({
        data: { user: verifiedUser, session: { access_token: 'tok_verified' } },
        error: null,
      });

      // Mock profile exists and is active
      mockSupabaseChain({
        data: { id: verifiedUser.id, role: 'patient', status: 'active' },
        error: null,
      });

      const res = await request(app)
        .post('/auth/phone/verify')
        .send({ phone: '+15551234567', token: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.data.session.access_token).toBe('tok_verified');
    });

    it('POST /auth/phone/verify rejects pending users', async () => {
      mockVerifyOtp.mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null,
      });
      mockSignOut.mockResolvedValue({ error: null });

      mockSupabaseChain({
        data: { id: mockUser.id, role: 'patient', status: 'pending' },
        error: null,
      });

      const res = await request(app)
        .post('/auth/phone/verify')
        .send({ phone: '+15551234567', token: '123456' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('pending');
    });

    it('POST /auth/phone/resend resends OTP', async () => {
      mockResend.mockResolvedValue({ data: {}, error: null });

      const res = await request(app).post('/auth/phone/resend').send({ phone: '+15551234567' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('OTP resent');
    });

    it('rejects when Supabase returns error for invalid phone', async () => {
      mockSignInWithOtp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid phone number', status: 400 },
      });

      const res = await request(app).post('/auth/phone/signup').send({ phone: '12345' });

      expect(res.status).toBe(400);
    });
  });

  // ────────────── MFA Flow ──────────────

  describe('MFA Flow', () => {
    it('POST /auth/mfa/enroll creates TOTP factor', async () => {
      mockMfaEnroll.mockResolvedValue({
        data: {
          id: 'factor-1',
          type: 'totp',
          totp: { qr_code: 'data:image/svg+xml;...', uri: 'otpauth://...' },
        },
        error: null,
      });

      const res = await request(app)
        .post('/auth/mfa/enroll')
        .set('Authorization', 'Bearer test-token')
        .send({ friendlyName: 'My Authenticator' });

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('factor-1');
      expect(res.body.data.totp).toBeDefined();
    });

    it('POST /auth/mfa/verify activates factor', async () => {
      mockMfaChallenge.mockResolvedValue({
        data: { id: 'challenge-1' },
        error: null,
      });
      mockMfaVerify.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

      const res = await request(app)
        .post('/auth/mfa/verify')
        .set('Authorization', 'Bearer test-token')
        .send({ factorId: '550e8400-e29b-41d4-a716-446655440001', code: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('MFA factor verified');
      expect(mockLogAndNotify).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'mfa_enabled' }),
        expect.any(Object)
      );
    });

    it('GET /auth/mfa/factors lists enrolled factors', async () => {
      mockMfaListFactors.mockResolvedValue({
        data: {
          all: [{ id: 'factor-1', factor_type: 'totp', friendly_name: 'App' }],
          totp: [{ id: 'factor-1' }],
          phone: [],
        },
        error: null,
      });

      const res = await request(app)
        .get('/auth/mfa/factors')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.data.totp).toHaveLength(1);
    });

    it('GET /auth/mfa/assurance returns assurance level', async () => {
      mockMfaGetAAL.mockResolvedValue({
        data: {
          currentLevel: 'aal1',
          nextLevel: 'aal2',
          currentAuthenticationMethods: [{ method: 'password' }],
        },
        error: null,
      });

      const res = await request(app)
        .get('/auth/mfa/assurance')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.data.currentLevel).toBe('aal1');
      expect(res.body.data.nextLevel).toBe('aal2');
    });
  });

  // ────────────── Email Management ──────────────

  describe('Email Management', () => {
    it('POST /auth/email/resend-confirmation resends verification', async () => {
      mockResend.mockResolvedValue({ data: {}, error: null });

      const res = await request(app)
        .post('/auth/email/resend-confirmation')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Confirmation email resent');
    });

    it('PUT /auth/email updates email address', async () => {
      mockUpdateUser.mockResolvedValue({
        data: { user: { ...mockUser, email: 'new@example.com' } },
        error: null,
      });

      const res = await request(app)
        .put('/auth/email')
        .set('Authorization', 'Bearer test-token')
        .send({ email: 'new@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Verification email sent');
    });
  });

  // ────────────── Identity Linking ──────────────

  describe('Identity Linking', () => {
    it('GET /auth/identities returns linked providers', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const res = await request(app)
        .get('/auth/identities')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.data.identities).toHaveLength(1);
      expect(res.body.data.identities[0].provider).toBe('email');
    });

    it('POST /auth/identities/link returns OAuth URL', async () => {
      mockLinkIdentity.mockResolvedValue({
        data: { url: 'https://accounts.google.com/o/oauth2/...' },
        error: null,
      });

      const res = await request(app)
        .post('/auth/identities/link')
        .set('Authorization', 'Bearer test-token')
        .send({ provider: 'google' });

      expect(res.status).toBe(200);
      expect(res.body.data.url).toContain('google');
      expect(res.body.data.provider).toBe('google');
    });
  });

  // ────────────── Security Preferences ──────────────

  describe('Security Preferences', () => {
    it('GET /auth/security/preferences returns defaults', async () => {
      mockSupabaseChain({
        data: { security_preferences: null },
        error: null,
      });

      const res = await request(app)
        .get('/auth/security/preferences')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.data.preferences.emailNotifications).toBe(true);
      expect(res.body.data.preferences.notifyOnPasswordChange).toBe(true);
    });

    it('PUT /auth/security/preferences updates settings', async () => {
      mockSupabaseChain({ data: null, error: null });

      const res = await request(app)
        .put('/auth/security/preferences')
        .set('Authorization', 'Bearer test-token')
        .send({
          emailNotifications: true,
          smsNotifications: true,
          notifyOnLogin: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.preferences.smsNotifications).toBe(true);
    });
  });

  // ────────────── Account Recovery ──────────────

  describe('Account Recovery', () => {
    it('POST /auth/recovery/initiate sends OTP without revealing user existence', async () => {
      mockSupabaseChain({
        data: { id: mockUser.id, phone: '+15551234567', email: 'test@example.com' },
        error: null,
      });
      mockSignInWithOtp.mockResolvedValue({ data: {}, error: null });

      const res = await request(app)
        .post('/auth/recovery/initiate')
        .send({ phone: '+15551234567' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('If this phone is registered');
    });

    it('POST /auth/recovery/complete verifies OTP and returns session', async () => {
      mockVerifyOtp.mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'recovered' } },
        error: null,
      });

      const res = await request(app)
        .post('/auth/recovery/complete')
        .send({ phone: '+15551234567', token: '654321' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Account recovered');
      expect(res.body.data.session.access_token).toBe('recovered');
    });

    it('POST /auth/recovery/complete rejects invalid OTP', async () => {
      mockVerifyOtp.mockResolvedValue({
        data: null,
        error: { message: 'Token expired' },
      });

      const res = await request(app)
        .post('/auth/recovery/complete')
        .send({ phone: '+15551234567', token: '000000' });

      expect(res.status).toBe(401);
    });
  });
});
