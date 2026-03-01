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
    setToken: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(
      message: string,
      public statusCode: number = 500
    ) {
      super(message);
      this.name = 'ApiError';
      this.status = statusCode;
    }
  },
}));

// Test component that uses the auth hook
function AuthTestComponent() {
  const { user, loading, isAuthenticated, login, logout, signup } = useAuth();

  if (loading) return <div>Loading...</div>;

  const handleLogin = async () => {
    try {
      await login('test@example.com', 'password123');
    } catch {
      // Errors are expected in some test cases (login failure, MFA)
    }
  };

  const handleSignup = async () => {
    try {
      await signup('new@example.com', 'password123', 'Test User', 'patient');
    } catch {
      // Errors are expected in some test cases
    }
  };

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
          <button onClick={handleLogin}>Login</button>
          <button onClick={handleSignup}>Signup</button>
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

    it('starts with unauthenticated state', async () => {
      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      // Wait for loading to finish (validateSession runs on mount)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
      });
      expect(screen.queryByText(/User:/)).not.toBeInTheDocument();
    });

    it('restores session from localStorage if valid token exists', async () => {
      const mockToken = 'mock-jwt-token';
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        role: 'patient',
      };

      // Set up localStorage with correct key names
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user_data', JSON.stringify(mockUser));

      // Mock profile API call (validateSession calls api.get('/profile'))
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

      // Mock profile API call (called after login)
      vi.spyOn(apiService.api, 'get').mockResolvedValueOnce({
        success: true,
        data: mockUser,
      });

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      // Wait for initial loading to finish
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
      });

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

      // Verify token and user_data are stored in localStorage
      expect(localStorage.getItem('token')).toBe(mockToken);
      expect(JSON.parse(localStorage.getItem('user_data')!)).toEqual(mockUser);
    });

    it('handles login failure', async () => {
      const user = userEvent.setup();

      // Mock login API failure
      vi.spyOn(apiService.api, 'post').mockRejectedValueOnce(
        new apiService.ApiError('Invalid credentials', 401)
      );

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      // Wait for initial loading to finish
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
      });

      // Attempt login — the component's onClick calls login() which throws,
      // but the error propagates as an unhandled rejection. Catch it.
      await user.click(screen.getByRole('button', { name: /login/i }));

      // Should remain on login screen
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
      });
    });

    it('handles MFA required response', async () => {
      const user = userEvent.setup();

      // Mock login API with MFA required — session has no access_token
      vi.spyOn(apiService.api, 'post').mockResolvedValueOnce({
        success: true,
        data: {
          user: null,
          session: null,
        },
      });

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      // Wait for initial loading to finish
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
      });

      // Attempt login — extractTokenAndExpiry will throw because session is null
      await user.click(screen.getByRole('button', { name: /login/i }));

      // Login API should have been called once
      await waitFor(() => {
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

      // Mock signup API call (backend route is /auth/register)
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

      // Wait for initial loading to finish
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /signup/i })).toBeInTheDocument();
      });

      // Click signup button
      await user.click(screen.getByRole('button', { name: /signup/i }));

      // Wait for authentication
      await waitFor(() => {
        expect(screen.getByText(/User: new@example.com/)).toBeInTheDocument();
      });

      // Verify signup API was called with correct data (route: /auth/register)
      expect(apiService.api.post).toHaveBeenCalledWith('/auth/register', {
        email: 'new@example.com',
        password: 'password123',
        fullName: 'Test User',
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

      // Set up authenticated state with correct key names
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user_data', JSON.stringify(mockUser));

      // Mock profile API call (validateSession on mount)
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
      expect(localStorage.getItem('user_data')).toBeNull();
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

      // Set up localStorage with expiry that's well past (> 5 min buffer)
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user_data', JSON.stringify(mockUser));
      localStorage.setItem('token_expiry', String(Date.now() - 10 * 60 * 1000)); // Expired 10 min ago

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

      // Set up localStorage with correct key names
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user_data', JSON.stringify(mockUser));

      // Mock profile API failure (validateSession catches 401)
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
