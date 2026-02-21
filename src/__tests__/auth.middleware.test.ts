/**
 * Unit tests for authentication middleware
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

// Create mock functions at top level
const mockGetUser = jest.fn<any>();
const mockFrom = jest.fn<any>();

// Use unstable_mockModule for ESM compatibility
jest.unstable_mockModule('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  },
}));

// Dynamic import after mocks are set up
const { authenticate, authenticateWithProfile, requireRole, optionalAuth } =
  await import('../middleware/auth.middleware');

type AuthenticatedRequest = Request & { user?: any; userProfile?: any };

describe('Auth Middleware', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof jest.fn>;
  let statusMock: ReturnType<typeof jest.fn>;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockReq = {
      headers: {},
    };
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    mockNext = jest.fn() as NextFunction;

    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should return 401 when authorization header is missing', async () => {
      await authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing authorization header' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header does not start with Bearer', async () => {
      mockReq.headers = { authorization: 'Basic abc123' };

      await authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing authorization header' });
    });

    it('should return 401 when token is invalid', async () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Invalid token'),
      });

      await authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    });

    it('should return 401 when user is not found', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    });

    it('should set user on request and call next when token is valid', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockReq.headers = { authorization: 'Bearer valid-token' };
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      await authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should return 401 when getUser throws an exception', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };
      mockGetUser.mockRejectedValue(new Error('Network error'));

      await authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication failed' });
    });
  });

  describe('authenticateWithProfile', () => {
    const mockSelectMock: any = jest.fn();

    const mockEqMock: any = jest.fn();

    const mockSingleMock: any = jest.fn();

    beforeEach(() => {
      mockSingleMock.mockImplementation(() => Promise.resolve({ data: null, error: null }));
      mockEqMock.mockReturnValue({ single: mockSingleMock });
      mockSelectMock.mockReturnValue({ eq: mockEqMock });
      mockFrom.mockReturnValue({ select: mockSelectMock });
    });

    it('should return 401 when authorization header is missing', async () => {
      await authenticateWithProfile(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing authorization header' });
    });

    it('should return 401 when token is invalid', async () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Invalid token'),
      });

      await authenticateWithProfile(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    });

    it('should return 401 when profile is not found', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockReq.headers = { authorization: 'Bearer valid-token' };
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockSingleMock.mockResolvedValue({ data: null, error: { message: 'Not found' } });

      await authenticateWithProfile(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'User profile not found' });
    });

    it('should set user and profile on request when valid', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockProfile = { id: 'user-123', role: 'patient', full_name: 'Test User' };
      mockReq.headers = { authorization: 'Bearer valid-token' };
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockSingleMock.mockResolvedValue({ data: mockProfile, error: null });

      await authenticateWithProfile(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual(mockUser);
      expect(mockReq.userProfile).toEqual(mockProfile);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 when supabase throws an exception', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };
      mockGetUser.mockRejectedValue(new Error('Network error'));

      await authenticateWithProfile(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication failed' });
    });
  });

  describe('requireRole', () => {
    const mockSelectMock: any = jest.fn();

    const mockEqMock: any = jest.fn();

    const mockSingleMock: any = jest.fn();

    beforeEach(() => {
      mockSingleMock.mockImplementation(() => Promise.resolve({ data: null, error: null }));
      mockEqMock.mockReturnValue({ single: mockSingleMock });
      mockSelectMock.mockReturnValue({ eq: mockEqMock });
      mockFrom.mockReturnValue({ select: mockSelectMock });
    });

    it('should return 403 when user has no profile and no role', async () => {
      mockReq.user = { id: 'user-123' };
      mockSingleMock.mockResolvedValue({ data: null });

      const middleware = requireRole('admin');
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Insufficient permissions',
        })
      );
    });

    it('should return 403 when user role is not in allowed roles', async () => {
      mockReq.user = { id: 'user-123' };
      mockReq.userProfile = { id: 'user-123', role: 'patient' };

      const middleware = requireRole('admin', 'provider');
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Insufficient permissions',
        })
      );
    });

    it('should call next when user role is in allowed roles', async () => {
      mockReq.user = { id: 'user-123' };
      mockReq.userProfile = { id: 'user-123', role: 'admin' };

      const middleware = requireRole('admin', 'provider');
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should fetch profile if not already loaded', async () => {
      mockReq.user = { id: 'user-123' };
      const mockProfile = { id: 'user-123', role: 'admin' };
      mockSingleMock.mockResolvedValue({ data: mockProfile });

      const middleware = requireRole('admin');
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockFrom).toHaveBeenCalledWith('user_profiles');
      expect(mockSelectMock).toHaveBeenCalledWith(
        'id, role, full_name, stripe_customer_id, status'
      );
      expect(mockEqMock).toHaveBeenCalledWith('id', 'user-123');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow multiple roles', async () => {
      mockReq.user = { id: 'user-123' };
      mockReq.userProfile = { id: 'user-123', role: 'provider' };

      const middleware = requireRole('admin', 'provider', 'patient');
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should call next without setting user when no auth header', async () => {
      await optionalAuth(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
    });

    it('should call next without setting user when auth header is not Bearer', async () => {
      mockReq.headers = { authorization: 'Basic abc123' };

      await optionalAuth(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
    });

    it('should set user when valid token is provided', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockReq.headers = { authorization: 'Bearer valid-token' };
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      await optionalAuth(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toEqual(mockUser);
    });

    it('should call next without user when token is invalid', async () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Invalid token'),
      });

      await optionalAuth(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
    });

    it('should call next without user when getUser throws', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };
      mockGetUser.mockRejectedValue(new Error('Network error'));

      await optionalAuth(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty Bearer token', async () => {
      mockReq.headers = { authorization: 'Bearer ' };
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Empty token'),
      });

      await authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should handle token with extra spaces', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockReq.headers = { authorization: 'Bearer   token-with-spaces  ' };
      // The token would include the spaces after split
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      await authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      // Just verify the middleware continues to work
      expect(mockGetUser).toHaveBeenCalled();
    });

    it('should handle case-sensitive Bearer prefix', async () => {
      mockReq.headers = { authorization: 'bearer valid-token' };

      await authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      // 'bearer' (lowercase) should fail the Bearer check
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing authorization header' });
    });
  });
});
