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
});
