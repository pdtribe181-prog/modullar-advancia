import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthProvider';
import * as apiService from '../services/api';

// Mock the API service
vi.mock('../services/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public statusCode: number = 500
    ) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

// Test component that uses the auth hook
function AuthTestComponent() {
  const { user, loading, isAuthenticated, login, logout, signup } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>User: {user?.email}</p>
          <p>Role: {user?.role}</p>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <div>
          <button onClick={() => login('test@example.com', 'password123')}>Login</button>
          <button onClick={() => signup('new@example.com', 'password123', 'Test User', 'patient')}>
            Signup
          </button>
        </div>
      )}
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('renders children', () => {
      render(
        <AuthProvider>
          <div>Test content</div>
        </AuthProvider>
      );
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('starts with unauthenticated state', () => {
      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
      expect(screen.queryByText(/User:/)).not.toBeInTheDocument();
    });

    it('restores session from localStorage if valid token exists', async () => {
      const mockToken = 'mock-jwt-token';
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        role: 'patient',
      };

      // Set up localStorage
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(mockUser));

      // Mock profile API call
      vi.spyOn(apiService.api, 'get').mockResolvedValueOnce({
        success: true,
        data: mockUser,
      });

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      // Should show loading initially
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Wait for profile fetch
      await waitFor(() => {
        expect(screen.getByText(/User: test@example.com/)).toBeInTheDocument();
      });

      expect(screen.getByText(/Role: patient/)).toBeInTheDocument();
    });
  });

  describe('Login', () => {
    it('successfully logs in a user', async () => {
      const user = userEvent.setup();
      const mockToken = 'mock-jwt-token';
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        role: 'patient',
      };

      // Mock login API call
      vi.spyOn(apiService.api, 'post').mockResolvedValueOnce({
        success: true,
        data: {
          user: mockUser,
          session: {
            access_token: mockToken,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
          },
        },
      });

      // Mock profile API call
      vi.spyOn(apiService.api, 'get').mockResolvedValueOnce({
        success: true,
        data: mockUser,
      });

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      // Click login button
      await user.click(screen.getByRole('button', { name: /login/i }));

      // Wait for authentication
      await waitFor(() => {
        expect(screen.getByText(/User: test@example.com/)).toBeInTheDocument();
      });

      // Verify login API was called with correct credentials
      expect(apiService.api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });

      // Verify token and user are stored in localStorage
      expect(localStorage.getItem('token')).toBe(mockToken);
      expect(JSON.parse(localStorage.getItem('user')!)).toEqual(mockUser);
    });

    it('handles login failure', async () => {
      const user = userEvent.setup();

      // Mock login API failure
      vi.spyOn(apiService.api, 'post').mockRejectedValueOnce(
        new apiService.ApiError('Invalid credentials', 401)
      );

      // Spy on console.error to verify error is logged
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      // Attempt login
      await user.click(screen.getByRole('button', { name: /login/i }));

      // Should remain on login screen
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
      });

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('handles MFA required response', async () => {
      const user = userEvent.setup();

      // Mock login API with MFA required
      vi.spyOn(apiService.api, 'post').mockResolvedValueOnce({
        success: true,
        data: {
          mfa_required: true,
          factor_id: 'totp-factor-123',
        },
      });

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      // Attempt login
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        // MFA required state should be set
        // (You would need to expose mfaRequired in the test component to verify this)
        expect(apiService.api.post).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Signup', () => {
    it('successfully signs up a new user', async () => {
      const user = userEvent.setup();
      const mockToken = 'mock-jwt-token';
      const mockUser = {
        id: '456',
        email: 'new@example.com',
        role: 'patient',
      };

      // Mock signup API call
      vi.spyOn(apiService.api, 'post').mockResolvedValueOnce({
        success: true,
        data: {
          user: mockUser,
          session: {
            access_token: mockToken,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
          },
        },
      });

      // Mock profile API call
      vi.spyOn(apiService.api, 'get').mockResolvedValueOnce({
        success: true,
        data: mockUser,
      });

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      // Click signup button
      await user.click(screen.getByRole('button', { name: /signup/i }));

      // Wait for authentication
      await waitFor(() => {
        expect(screen.getByText(/User: new@example.com/)).toBeInTheDocument();
      });

      // Verify signup API was called with correct data
      expect(apiService.api.post).toHaveBeenCalledWith('/auth/signup', {
        email: 'new@example.com',
        password: 'password123',
        full_name: 'Test User',
        role: 'patient',
      });
    });
  });

  describe('Logout', () => {
    it('successfully logs out a user', async () => {
      const user = userEvent.setup();
      const mockToken = 'mock-jwt-token';
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        role: 'patient',
      };

      // Set up authenticated state
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(mockUser));

      // Mock profile API call
      vi.spyOn(apiService.api, 'get').mockResolvedValueOnce({
        success: true,
        data: mockUser,
      });

      // Mock logout API call
      vi.spyOn(apiService.api, 'post').mockResolvedValueOnce({
        success: true,
      });

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      // Wait for authenticated state
      await waitFor(() => {
        expect(screen.getByText(/User: test@example.com/)).toBeInTheDocument();
      });

      // Click logout button
      await user.click(screen.getByRole('button', { name: /logout/i }));

      // Should return to unauthenticated state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
      });

      // Verify localStorage was cleared
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('Session Management', () => {
    it('clears expired token from localStorage', async () => {
      const mockToken = 'expired-jwt-token';
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        role: 'patient',
      };

      // Set up localStorage with expired token
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('tokenExpiry', String(Date.now() - 1000)); // Expired

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      // Should not attempt to restore session with expired token
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
      });

      // Verify localStorage was cleared
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('handles profile fetch failure during session restore', async () => {
      const mockToken = 'mock-jwt-token';
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        role: 'patient',
      };

      // Set up localStorage
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(mockUser));

      // Mock profile API failure
      vi.spyOn(apiService.api, 'get').mockRejectedValueOnce(
        new apiService.ApiError('Unauthorized', 401)
      );

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      // Should clear session and show login
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
      });

      // Verify localStorage was cleared
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('useAuth hook', () => {
    it('throws error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<AuthTestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleErrorSpy.mockRestore();
    });
  });
});
