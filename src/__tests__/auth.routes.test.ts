/**
 * Auth Routes Tests
 * Tests for authentication, profile, and security routes using supertest
 */

import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// ── Mocks ──

const mockGetUser = jest.fn<any>();
const mockSignInWithPassword = jest.fn<any>();
const mockSignUp = jest.fn<any>();
const mockSignOut = jest.fn<any>();
const mockSetSession = jest.fn<any>();
const mockRefreshSession = jest.fn<any>();
const mockResetPasswordForEmail = jest.fn<any>();
const mockSignInWithOtp = jest.fn<any>();
const mockVerifyOtp = jest.fn<any>();
const mockResend = jest.fn<any>();
const mockUpdateUser = jest.fn<any>();
const mockLinkIdentity = jest.fn<any>();
const mockUnlinkIdentity = jest.fn<any>();
const mockMfaEnroll = jest.fn<any>();
const mockMfaVerify = jest.fn<any>();
const mockMfaChallenge = jest.fn<any>();
const mockMfaListFactors = jest.fn<any>();
const mockMfaUnenroll = jest.fn<any>();
const mockMfaGetAssurance = jest.fn<any>();
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
      setSession: mockSetSession,
      refreshSession: mockRefreshSession,
      resetPasswordForEmail: mockResetPasswordForEmail,
      signInWithOtp: mockSignInWithOtp,
      verifyOtp: mockVerifyOtp,
      resend: mockResend,
      updateUser: mockUpdateUser,
      linkIdentity: mockLinkIdentity,
      unlinkIdentity: mockUnlinkIdentity,
      mfa: {
        enroll: mockMfaEnroll,
        verify: mockMfaVerify,
        challenge: mockMfaChallenge,
        listFactors: mockMfaListFactors,
        unenroll: mockMfaUnenroll,
        getAuthenticatorAssuranceLevel: mockMfaGetAssurance,
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

const mockGenerateCsrfToken = jest.fn<any>();
jest.unstable_mockModule('../middleware/csrf.middleware.js', () => ({
  generateCsrfToken: mockGenerateCsrfToken,
  csrfProtection: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

// Auth middleware - let through with mocked user
const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  user_metadata: { full_name: 'Test User' },
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

// ── Create test app ──

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRouter);
  // Error handler for AppError
  app.use((err: any, req: any, res: any, _next: any) => {
    sendErrorResponse(res, err, req.requestId);
  });
  return app;
}

// ── Tests ──

describe('auth.routes', () => {
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

  // Helper for chained Supabase queries
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

  // ────────────── GET /auth/profile ──────────────

  describe('GET /auth/profile', () => {
    it('returns user profile on success', async () => {
      const profile = {
        id: mockUser.id,
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'patient',
      };
      mockSupabaseChain({ data: profile, error: null });

      const res = await request(app).get('/auth/profile').set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('test@example.com');
    });

    it('auto-creates profile if not found (PGRST116)', async () => {
      // First call: profile not found
      const chain: any = {};
      chain.select = jest.fn<any>().mockReturnValue(chain);
      chain.insert = jest.fn<any>().mockReturnValue(chain);
      chain.eq = jest.fn<any>().mockReturnValue(chain);
      chain.single = jest
        .fn<any>()
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116', message: 'not found' } })
        .mockResolvedValueOnce({
          data: { id: mockUser.id, email: 'test@example.com', role: 'patient' },
          error: null,
        });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get('/auth/profile').set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 500 when auto-created profile insertion fails', async () => {
      const chain: any = {};
      chain.select = jest.fn<any>().mockReturnValue(chain);
      chain.insert = jest.fn<any>().mockReturnValue(chain);
      chain.eq = jest.fn<any>().mockReturnValue(chain);
      chain.single = jest
        .fn<any>()
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116', message: 'not found' } })
        .mockResolvedValueOnce({ data: null, error: { message: 'insert failed' } });
      mockFrom.mockReturnValue(chain);

      const res = await request(app).get('/auth/profile').set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });

    it('returns 500 on non-PGRST116 error', async () => {
      mockSupabaseChain({ data: null, error: { code: 'OTHER', message: 'DB error' } });

      const res = await request(app).get('/auth/profile').set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ────────────── PUT /auth/profile ──────────────

  describe('PUT /auth/profile', () => {
    it('updates profile successfully', async () => {
      const updatedProfile = {
        id: mockUser.id,
        full_name: 'Updated Name',
        phone: '+15551234567',
      };
      mockSupabaseChain({ data: updatedProfile, error: null });

      const res = await request(app)
        .put('/auth/profile')
        .set('Authorization', 'Bearer test-token')
        .send({ full_name: 'Updated Name', phone: '+15551234567' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.full_name).toBe('Updated Name');
    });

    it('returns 400 for invalid phone format', async () => {
      const res = await request(app)
        .put('/auth/profile')
        .set('Authorization', 'Bearer test-token')
        .send({ phone: 'not-a-phone' });

      expect(res.status).toBe(400);
    });

    it('returns 500 when profile update fails', async () => {
      mockSupabaseChain({ data: null, error: { message: 'update failed' } });

      const res = await request(app)
        .put('/auth/profile')
        .set('Authorization', 'Bearer test-token')
        .send({ full_name: 'New Name' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ────────────── POST /auth/login ──────────────

  describe('POST /auth/login', () => {
    it('returns session on successful login', async () => {
      const sessionData = {
        user: { id: mockUser.id, email: 'test@example.com', user_metadata: {} },
        session: { access_token: 'token123', refresh_token: 'refresh123' },
      };
      mockSignInWithPassword.mockResolvedValue({ data: sessionData, error: null });
      // For the logAndNotify call
      mockLogAndNotify.mockResolvedValue(undefined);

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.session.access_token).toBe('token123');
    });

    it('returns 401 on invalid credentials', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });
      // Mock user profile lookup for failed login logging
      mockSupabaseChain({ data: { id: 'some-user' }, error: null });

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for missing email', async () => {
      const res = await request(app).post('/auth/login').send({ password: 'password123' });

      expect(res.status).toBe(400);
    });

    it('returns 400 for missing password', async () => {
      const res = await request(app).post('/auth/login').send({ email: 'test@example.com' });

      expect(res.status).toBe(400);
    });

    it('logs security event on failed login', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });
      mockSupabaseChain({ data: { id: mockUser.id }, error: null });

      await request(app).post('/auth/login').send({ email: 'test@example.com', password: 'wrong' });

      expect(mockLogSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          eventType: 'failed_login',
        })
      );
    });

    it('returns 403 for pending email account', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: {
          user: { id: mockUser.id, email: 'test@example.com', user_metadata: {} },
          session: { access_token: 'tok', refresh_token: 'ref' },
        },
        error: null,
      });
      mockSupabaseChain({ data: { status: 'pending', role: 'patient' }, error: null });
      mockSignOut.mockResolvedValue({ error: null });

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'ValidPass1!' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('pending approval');
    });

    it('returns 403 for suspended email account', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: {
          user: { id: mockUser.id, email: 'test@example.com', user_metadata: {} },
          session: { access_token: 'tok', refresh_token: 'ref' },
        },
        error: null,
      });
      mockSupabaseChain({ data: { status: 'suspended', role: 'patient' }, error: null });
      mockSignOut.mockResolvedValue({ error: null });

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'ValidPass1!' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('suspended');
    });
  });

  // ────────────── POST /auth/register ──────────────

  describe('POST /auth/register', () => {
    it('registers a new user', async () => {
      const signUpData = {
        user: { id: 'new-user-id', email: 'new@test.com' },
        session: { access_token: 'new-token' },
      };
      mockSignUp.mockResolvedValue({ data: signUpData, error: null });
      // Mock profile creation
      mockSupabaseChain({ data: { id: 'new-user-id' }, error: null });

      const res = await request(app).post('/auth/register').send({
        email: 'new@test.com',
        password: 'Password1',
        fullName: 'New User',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 for weak password', async () => {
      const res = await request(app).post('/auth/register').send({
        email: 'new@test.com',
        password: 'short',
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid email', async () => {
      const res = await request(app).post('/auth/register').send({
        email: 'not-an-email',
        password: 'Password1',
      });

      expect(res.status).toBe(400);
    });

    it('returns error when Supabase signup fails', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already exists' },
      });

      const res = await request(app).post('/auth/register').send({
        email: 'existing@test.com',
        password: 'Password1',
      });

      expect(res.status).toBe(400);
    });
  });

  // ────────────── POST /auth/logout ──────────────

  describe('POST /auth/logout', () => {
    it('logs out successfully', async () => {
      mockSignOut.mockResolvedValue({ error: null });

      const res = await request(app).post('/auth/logout').set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 500 when signOut fails', async () => {
      mockSignOut.mockResolvedValue({ error: { message: 'session error' } });

      const res = await request(app).post('/auth/logout').set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ────────────── POST /auth/refresh ──────────────

  describe('POST /auth/refresh', () => {
    it('refreshes session with valid token', async () => {
      mockRefreshSession.mockResolvedValue({
        data: {
          session: { access_token: 'new-token', refresh_token: 'new-refresh' },
          user: mockUser,
        },
        error: null,
      });

      const res = await request(app)
        .post('/auth/refresh')
        .send({ refresh_token: 'old-refresh-token' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 when refresh_token is missing', async () => {
      const res = await request(app).post('/auth/refresh').send({});

      expect(res.status).toBe(400);
    });

    it('returns 401 on invalid refresh token', async () => {
      mockRefreshSession.mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Invalid refresh token' },
      });

      const res = await request(app).post('/auth/refresh').send({ refresh_token: 'invalid-token' });

      expect(res.status).toBe(401);
    });
  });

  // ────────────── GET /auth/session ──────────────

  describe('GET /auth/session', () => {
    it('returns current session', async () => {
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

      const res = await request(app).get('/auth/session').set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ────────────── POST /auth/forgot-password ──────────────

  describe('POST /auth/forgot-password', () => {
    it('sends password reset email', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

      const res = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Password reset email sent');
    });

    it('returns 400 for invalid email', async () => {
      const res = await request(app).post('/auth/forgot-password').send({ email: 'not-an-email' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when Supabase returns error', async () => {
      mockResetPasswordForEmail.mockResolvedValue({
        data: null,
        error: { message: 'Rate limit exceeded' },
      });

      const res = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(400);
    });
  });

  // ────────────── POST /auth/password/reset ──────────────

  describe('POST /auth/password/reset', () => {
    it('sends password reset email (same handler as forgot-password)', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

      const res = await request(app)
        .post('/auth/password/reset')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ────────────── GET /auth/csrf-token ──────────────

  describe('GET /auth/csrf-token', () => {
    it('returns a CSRF token', async () => {
      mockGenerateCsrfToken.mockResolvedValue('test-csrf-token-hex');

      const res = await request(app)
        .get('/auth/csrf-token')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.csrfToken).toBe('test-csrf-token-hex');
    });
  });

  // ────────────── PHONE AUTH ROUTES ──────────────

  describe('POST /auth/phone/signup', () => {
    it('sends OTP for phone signup', async () => {
      mockSignInWithOtp.mockResolvedValue({ data: {}, error: null });

      const res = await request(app).post('/auth/phone/signup').send({ phone: '+12025551234' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('OTP sent');
    });

    it('returns 400 on Supabase error', async () => {
      mockSignInWithOtp.mockResolvedValue({ data: null, error: { message: 'Rate limit' } });

      const res = await request(app).post('/auth/phone/signup').send({ phone: '+12025551234' });

      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid phone format', async () => {
      const res = await request(app).post('/auth/phone/signup').send({ phone: 'invalid' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/phone/signin', () => {
    it('sends OTP for phone signin', async () => {
      mockSignInWithOtp.mockResolvedValue({ data: {}, error: null });

      const res = await request(app).post('/auth/phone/signin').send({ phone: '+12025551234' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 on error', async () => {
      mockSignInWithOtp.mockResolvedValue({ data: null, error: { message: 'Error' } });

      const res = await request(app).post('/auth/phone/signin').send({ phone: '+12025551234' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/phone/verify', () => {
    it('verifies OTP and returns session for active user', async () => {
      mockVerifyOtp.mockResolvedValue({
        data: {
          user: { id: mockUser.id, phone: '+12025551234', user_metadata: { full_name: 'Test' } },
          session: { access_token: 'token-123' },
        },
        error: null,
      });

      // Profile exists and active
      mockFrom.mockReturnValue({
        select: jest.fn<any>().mockReturnValue({
          eq: jest.fn<any>().mockReturnValue({
            single: jest.fn<any>().mockResolvedValue({
              data: { status: 'active', role: 'patient' },
              error: null,
            }),
          }),
        }),
        update: jest.fn<any>().mockReturnValue({
          eq: jest.fn<any>().mockResolvedValue({ error: null }),
        }),
      });

      const res = await request(app)
        .post('/auth/phone/verify')
        .send({ phone: '+12025551234', token: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 403 for pending user', async () => {
      mockVerifyOtp.mockResolvedValue({
        data: { user: { id: mockUser.id }, session: {} },
        error: null,
      });
      mockSignOut.mockResolvedValue({ error: null });

      mockFrom.mockReturnValue({
        select: jest.fn<any>().mockReturnValue({
          eq: jest.fn<any>().mockReturnValue({
            single: jest.fn<any>().mockResolvedValue({
              data: { status: 'pending', role: 'patient' },
              error: null,
            }),
          }),
        }),
      });

      const res = await request(app)
        .post('/auth/phone/verify')
        .send({ phone: '+12025551234', token: '123456' });

      expect(res.status).toBe(403);
    });

    it('returns 403 for suspended user', async () => {
      mockVerifyOtp.mockResolvedValue({
        data: { user: { id: mockUser.id }, session: {} },
        error: null,
      });
      mockSignOut.mockResolvedValue({ error: null });

      mockFrom.mockReturnValue({
        select: jest.fn<any>().mockReturnValue({
          eq: jest.fn<any>().mockReturnValue({
            single: jest.fn<any>().mockResolvedValue({
              data: { status: 'suspended', role: 'patient' },
              error: null,
            }),
          }),
        }),
      });

      const res = await request(app)
        .post('/auth/phone/verify')
        .send({ phone: '+12025551234', token: '123456' });

      expect(res.status).toBe(403);
    });

    it('creates profile for new phone user and returns pending', async () => {
      mockVerifyOtp.mockResolvedValue({
        data: {
          user: {
            id: mockUser.id,
            phone: '+12025551234',
            user_metadata: { full_name: 'Test', role: 'patient' },
          },
          session: {},
        },
        error: null,
      });
      mockSignOut.mockResolvedValue({ error: null });

      mockFrom.mockReturnValue({
        select: jest.fn<any>().mockReturnValue({
          eq: jest.fn<any>().mockReturnValue({
            single: jest.fn<any>().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
        insert: jest.fn<any>().mockResolvedValue({ error: null }),
      });

      const res = await request(app)
        .post('/auth/phone/verify')
        .send({ phone: '+12025551234', token: '123456' });

      expect(res.status).toBe(403);
    });

    it('returns 401 on invalid OTP', async () => {
      mockVerifyOtp.mockResolvedValue({ data: {}, error: { message: 'Invalid OTP' } });

      const res = await request(app)
        .post('/auth/phone/verify')
        .send({ phone: '+12025551234', token: '000000' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/phone/resend', () => {
    it('resends OTP', async () => {
      mockResend.mockResolvedValue({ data: {}, error: null });

      const res = await request(app).post('/auth/phone/resend').send({ phone: '+12025551234' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 on error', async () => {
      mockResend.mockResolvedValue({ data: null, error: { message: 'Too fast' } });

      const res = await request(app).post('/auth/phone/resend').send({ phone: '+12025551234' });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /auth/phone', () => {
    it('updates phone number', async () => {
      mockUpdateUser.mockResolvedValue({
        data: { user: { ...mockUser, phone: '+19998887777' } },
        error: null,
      });

      const res = await request(app)
        .put('/auth/phone')
        .set('Authorization', 'Bearer test-token')
        .send({ phone: '+19998887777' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 on error', async () => {
      mockUpdateUser.mockResolvedValue({ data: null, error: { message: 'Phone taken' } });

      const res = await request(app)
        .put('/auth/phone')
        .set('Authorization', 'Bearer test-token')
        .send({ phone: '+19998887777' });

      expect(res.status).toBe(400);
    });
  });

  // ────────────── MFA ROUTES ──────────────

  describe('POST /auth/mfa/enroll', () => {
    it('enrolls TOTP factor', async () => {
      mockMfaEnroll.mockResolvedValue({
        data: { id: 'factor-1', type: 'totp', totp: { qr_code: 'data:image/png', secret: 's' } },
        error: null,
      });

      const res = await request(app)
        .post('/auth/mfa/enroll')
        .set('Authorization', 'Bearer test-token')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('factor-1');
    });

    it('returns 500 on error', async () => {
      mockMfaEnroll.mockResolvedValue({ data: null, error: { message: 'fail' } });

      const res = await request(app)
        .post('/auth/mfa/enroll')
        .set('Authorization', 'Bearer test-token')
        .send({});

      expect(res.status).toBe(500);
    });
  });

  describe('POST /auth/mfa/verify', () => {
    it('verifies and activates MFA factor', async () => {
      mockMfaChallenge.mockResolvedValue({ data: { id: 'challenge-1' }, error: null });
      mockMfaVerify.mockResolvedValue({ data: { id: 'factor-1' }, error: null });
      mockGetUser.mockResolvedValue({
        data: { user: { email: 'test@example.com', phone: null, user_metadata: {} } },
        error: null,
      });
      mockLogAndNotify.mockResolvedValue(undefined);

      const res = await request(app)
        .post('/auth/mfa/verify')
        .set('Authorization', 'Bearer test-token')
        .send({ factorId: '550e8400-e29b-41d4-a716-446655440000', code: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 on challenge error', async () => {
      mockMfaChallenge.mockResolvedValue({ data: null, error: { message: 'factor not found' } });

      const res = await request(app)
        .post('/auth/mfa/verify')
        .set('Authorization', 'Bearer test-token')
        .send({ factorId: '550e8400-e29b-41d4-a716-446655440000', code: '123456' });

      expect(res.status).toBe(400);
    });

    it('returns 401 on verify error', async () => {
      mockMfaChallenge.mockResolvedValue({ data: { id: 'challenge-1' }, error: null });
      mockMfaVerify.mockResolvedValue({ data: null, error: { message: 'invalid code' } });

      const res = await request(app)
        .post('/auth/mfa/verify')
        .set('Authorization', 'Bearer test-token')
        .send({ factorId: '550e8400-e29b-41d4-a716-446655440000', code: '000000' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/mfa/challenge', () => {
    it('challenges and verifies MFA during login', async () => {
      mockMfaChallenge.mockResolvedValue({ data: { id: 'challenge-1' }, error: null });
      mockMfaVerify.mockResolvedValue({ data: { session: {} }, error: null });

      const res = await request(app)
        .post('/auth/mfa/challenge')
        .send({ factorId: '550e8400-e29b-41d4-a716-446655440000', code: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 on challenge error', async () => {
      mockMfaChallenge.mockResolvedValue({ data: null, error: { message: 'not found' } });

      const res = await request(app)
        .post('/auth/mfa/challenge')
        .send({ factorId: '550e8400-e29b-41d4-a716-446655440000', code: '123456' });

      expect(res.status).toBe(400);
    });

    it('returns 401 on verify error', async () => {
      mockMfaChallenge.mockResolvedValue({ data: { id: 'challenge-1' }, error: null });
      mockMfaVerify.mockResolvedValue({ data: null, error: { message: 'wrong code' } });

      const res = await request(app)
        .post('/auth/mfa/challenge')
        .send({ factorId: '550e8400-e29b-41d4-a716-446655440000', code: '000000' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /auth/mfa/factors', () => {
    it('lists enrolled MFA factors', async () => {
      mockMfaListFactors.mockResolvedValue({
        data: {
          totp: [{ id: 'f1', friendly_name: 'App', factor_type: 'totp', status: 'verified' }],
          phone: [],
        },
        error: null,
      });

      const res = await request(app)
        .get('/auth/mfa/factors')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 500 on error', async () => {
      mockMfaListFactors.mockResolvedValue({ data: null, error: { message: 'fail' } });

      const res = await request(app)
        .get('/auth/mfa/factors')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(500);
    });
  });

  describe('DELETE /auth/mfa/factors/:factorId', () => {
    it('unenrolls MFA factor', async () => {
      mockMfaUnenroll.mockResolvedValue({ data: {}, error: null });
      mockLogAndNotify.mockResolvedValue(undefined);
      mockGetUser.mockResolvedValue({
        data: { user: { email: 'test@example.com', phone: null, user_metadata: {} } },
        error: null,
      });

      const res = await request(app)
        .delete('/auth/mfa/factors/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 500 on unenroll error', async () => {
      mockMfaUnenroll.mockResolvedValue({ data: null, error: { message: 'fail' } });

      const res = await request(app)
        .delete('/auth/mfa/factors/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /auth/mfa/assurance', () => {
    it('returns assurance level on success', async () => {
      mockMfaGetAssurance.mockResolvedValue({
        data: {
          currentLevel: 'aal1',
          nextLevel: 'aal2',
          currentAuthenticationMethods: [{ method: 'password', timestamp: 0 }],
        },
        error: null,
      });

      const res = await request(app)
        .get('/auth/mfa/assurance')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.currentLevel).toBe('aal1');
    });

    it('returns 500 on assurance level error', async () => {
      mockMfaGetAssurance.mockResolvedValue({ data: null, error: { message: 'fail' } });

      const res = await request(app)
        .get('/auth/mfa/assurance')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ────────────── EMAIL ROUTES ──────────────

  describe('POST /auth/email/resend-confirmation', () => {
    it('resends confirmation email', async () => {
      mockResend.mockResolvedValue({ data: {}, error: null });

      const res = await request(app)
        .post('/auth/email/resend-confirmation')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 on error', async () => {
      mockResend.mockResolvedValue({ data: null, error: { message: 'rate limited' } });

      const res = await request(app)
        .post('/auth/email/resend-confirmation')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /auth/email', () => {
    it('updates email address', async () => {
      mockUpdateUser.mockResolvedValue({
        data: { user: { ...mockUser, email: 'new@example.com' } },
        error: null,
      });

      const res = await request(app)
        .put('/auth/email')
        .set('Authorization', 'Bearer test-token')
        .send({ email: 'new@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 on error', async () => {
      mockUpdateUser.mockResolvedValue({ data: null, error: { message: 'Email taken' } });

      const res = await request(app)
        .put('/auth/email')
        .set('Authorization', 'Bearer test-token')
        .send({ email: 'taken@example.com' });

      expect(res.status).toBe(400);
    });
  });

  // ────────────── PASSWORD UPDATE ──────────────

  describe('PUT /auth/password', () => {
    it('updates password', async () => {
      mockUpdateUser.mockResolvedValue({
        data: {
          user: { ...mockUser, email: 'test@example.com', user_metadata: { full_name: 'Test' } },
        },
        error: null,
      });
      mockLogAndNotify.mockResolvedValue(undefined);

      const res = await request(app)
        .put('/auth/password')
        .set('Authorization', 'Bearer test-token')
        .send({ password: 'NewStr0ngPass!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 on error', async () => {
      mockUpdateUser.mockResolvedValue({ data: null, error: { message: 'Password too weak' } });

      const res = await request(app)
        .put('/auth/password')
        .set('Authorization', 'Bearer test-token')
        .send({ password: 'NewStr0ngPass!' });

      expect(res.status).toBe(400);
    });
  });

  // ────────────── IDENTITY ROUTES ──────────────

  describe('GET /auth/identities', () => {
    it('returns linked identities', async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            identities: [
              {
                id: 'id-1',
                provider: 'google',
                created_at: '2025-01-01',
                last_sign_in_at: '2025-06-01',
                identity_data: { email: 'test@gmail.com', full_name: 'Test', avatar_url: null },
              },
            ],
          },
        },
        error: null,
      });

      const res = await request(app)
        .get('/auth/identities')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.identities).toHaveLength(1);
      expect(res.body.data.identities[0].provider).toBe('google');
    });

    it('returns 500 on getUser error', async () => {
      mockGetUser.mockResolvedValue({ data: null, error: { message: 'fail' } });

      const res = await request(app)
        .get('/auth/identities')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(500);
    });
  });

  describe('POST /auth/identities/link', () => {
    it('returns OAuth URL for linking', async () => {
      mockLinkIdentity.mockResolvedValue({
        data: { url: 'https://accounts.google.com/o/oauth2/auth?...' },
        error: null,
      });

      const res = await request(app)
        .post('/auth/identities/link')
        .set('Authorization', 'Bearer test-token')
        .send({ provider: 'google' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.url).toContain('google');
    });

    it('returns 400 on error', async () => {
      mockLinkIdentity.mockResolvedValue({ data: null, error: { message: 'already linked' } });

      const res = await request(app)
        .post('/auth/identities/link')
        .set('Authorization', 'Bearer test-token')
        .send({ provider: 'github' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /auth/identities/:identityId', () => {
    it('unlinks an identity', async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            identities: [
              { id: '550e8400-e29b-41d4-a716-446655440000', provider: 'google', identity_data: {} },
              { id: '660e8400-e29b-41d4-a716-446655440001', provider: 'github', identity_data: {} },
            ],
          },
        },
        error: null,
      });
      mockUnlinkIdentity.mockResolvedValue({ error: null });

      const res = await request(app)
        .delete('/auth/identities/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 when trying to unlink last identity', async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            identities: [
              { id: '550e8400-e29b-41d4-a716-446655440000', provider: 'google', identity_data: {} },
            ],
          },
        },
        error: null,
      });

      const res = await request(app)
        .delete('/auth/identities/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(400);
    });

    it('returns 404 when identity not found', async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            identities: [
              { id: '660e8400-e29b-41d4-a716-446655440001', provider: 'google', identity_data: {} },
              { id: '770e8400-e29b-41d4-a716-446655440002', provider: 'github', identity_data: {} },
            ],
          },
        },
        error: null,
      });

      const res = await request(app)
        .delete('/auth/identities/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(404);
    });

    it('returns 500 when getUser fails for unlink', async () => {
      mockGetUser.mockResolvedValue({ data: null, error: { message: 'auth error' } });

      const res = await request(app)
        .delete('/auth/identities/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(500);
    });

    it('returns 500 when unlinkIdentity fails', async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            identities: [
              { id: '550e8400-e29b-41d4-a716-446655440000', provider: 'google', identity_data: {} },
              { id: '660e8400-e29b-41d4-a716-446655440001', provider: 'github', identity_data: {} },
            ],
          },
        },
        error: null,
      });
      mockUnlinkIdentity.mockResolvedValue({ error: { message: 'unlink failed' } });

      const res = await request(app)
        .delete('/auth/identities/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(500);
    });
  });

  // ────────────── RECOVERY ROUTES ──────────────

  describe('POST /auth/recovery/phone', () => {
    it('sets recovery phone', async () => {
      mockUpdateUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockSignInWithOtp.mockResolvedValue({ data: {}, error: null });

      const res = await request(app)
        .post('/auth/recovery/phone')
        .set('Authorization', 'Bearer test-token')
        .send({ phone: '+12025551234' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 on error', async () => {
      mockUpdateUser.mockResolvedValue({ data: null, error: { message: 'fail' } });

      const res = await request(app)
        .post('/auth/recovery/phone')
        .set('Authorization', 'Bearer test-token')
        .send({ phone: '+12025551234' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/recovery/phone/verify', () => {
    it('verifies recovery phone', async () => {
      mockVerifyOtp.mockResolvedValue({
        data: { session: { access_token: 'tok' } },
        error: null,
      });
      mockUpdateUser.mockResolvedValue({ data: {}, error: null });

      const res = await request(app)
        .post('/auth/recovery/phone/verify')
        .set('Authorization', 'Bearer test-token')
        .send({ phone: '+12025551234', token: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 401 on invalid OTP', async () => {
      mockVerifyOtp.mockResolvedValue({ data: null, error: { message: 'expired' } });

      const res = await request(app)
        .post('/auth/recovery/phone/verify')
        .set('Authorization', 'Bearer test-token')
        .send({ phone: '+12025551234', token: '000000' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/recovery/initiate', () => {
    it('sends recovery OTP when phone found', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn<any>().mockReturnValue({
          eq: jest.fn<any>().mockReturnValue({
            single: jest.fn<any>().mockResolvedValue({
              data: { id: mockUser.id, phone: '+12025551234', email: 'test@example.com' },
              error: null,
            }),
          }),
        }),
      });
      mockSignInWithOtp.mockResolvedValue({ data: {}, error: null });

      const res = await request(app)
        .post('/auth/recovery/initiate')
        .send({ phone: '+12025551234' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns success even when phone not found (avoid enumeration)', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn<any>().mockReturnValue({
          eq: jest.fn<any>().mockReturnValue({
            single: jest.fn<any>().mockResolvedValue({
              data: null,
              error: { message: 'not found' },
            }),
          }),
        }),
      });

      const res = await request(app)
        .post('/auth/recovery/initiate')
        .send({ phone: '+19999999999' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 500 when OTP send fails', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn<any>().mockReturnValue({
          eq: jest.fn<any>().mockReturnValue({
            single: jest.fn<any>().mockResolvedValue({
              data: { id: mockUser.id, phone: '+12025551234', email: 'test@example.com' },
              error: null,
            }),
          }),
        }),
      });
      mockSignInWithOtp.mockResolvedValue({ data: null, error: { message: 'sms failed' } });

      const res = await request(app)
        .post('/auth/recovery/initiate')
        .send({ phone: '+12025551234' });

      expect(res.status).toBe(500);
    });
  });

  describe('POST /auth/recovery/complete', () => {
    it('completes recovery with valid OTP', async () => {
      mockVerifyOtp.mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'tok' } },
        error: null,
      });

      const res = await request(app)
        .post('/auth/recovery/complete')
        .send({ phone: '+12025551234', token: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 401 on invalid OTP', async () => {
      mockVerifyOtp.mockResolvedValue({ data: null, error: { message: 'Invalid OTP' } });

      const res = await request(app)
        .post('/auth/recovery/complete')
        .send({ phone: '+12025551234', token: '000000' });

      expect(res.status).toBe(401);
    });
  });

  // ────────────── SECURITY PREFERENCES ──────────────

  describe('GET /auth/security/preferences', () => {
    it('returns security preferences with defaults', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn<any>().mockReturnValue({
          eq: jest.fn<any>().mockReturnValue({
            single: jest.fn<any>().mockResolvedValue({
              data: { security_preferences: { notifyOnLogin: true } },
              error: null,
            }),
          }),
        }),
      });

      const res = await request(app)
        .get('/auth/security/preferences')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.preferences.emailNotifications).toBe(true);
      expect(res.body.data.preferences.notifyOnLogin).toBe(true);
    });

    it('returns 500 on DB error', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn<any>().mockReturnValue({
          eq: jest.fn<any>().mockReturnValue({
            single: jest.fn<any>().mockResolvedValue({
              data: null,
              error: { message: 'db error' },
            }),
          }),
        }),
      });

      const res = await request(app)
        .get('/auth/security/preferences')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(500);
    });
  });

  describe('PUT /auth/security/preferences', () => {
    it('updates security preferences', async () => {
      mockFrom.mockReturnValue({
        update: jest.fn<any>().mockReturnValue({
          eq: jest.fn<any>().mockResolvedValue({ error: null }),
        }),
      });

      const res = await request(app)
        .put('/auth/security/preferences')
        .set('Authorization', 'Bearer test-token')
        .send({ emailNotifications: false, smsNotifications: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 500 on DB error', async () => {
      mockFrom.mockReturnValue({
        update: jest.fn<any>().mockReturnValue({
          eq: jest.fn<any>().mockResolvedValue({ error: { message: 'fail' } }),
        }),
      });

      const res = await request(app)
        .put('/auth/security/preferences')
        .set('Authorization', 'Bearer test-token')
        .send({ notifyOnLogin: false });

      expect(res.status).toBe(500);
    });
  });
});
