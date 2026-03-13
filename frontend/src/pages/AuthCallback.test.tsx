import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthCallback } from './AuthCallback';

const OAUTH_RETURN_TO_KEY = 'oauth_return_to';
const mockSetTokenFromOAuth = vi.fn();
const mockRefreshSession = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({
    setTokenFromOAuth: mockSetTokenFromOAuth,
    refreshSession: mockRefreshSession,
    loading: false,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderCallback(route = '/auth/callback') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthCallback />
    </MemoryRouter>
  );
}

describe('AuthCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    // Clear hash
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, hash: '' },
    });
  });

  describe('error state', () => {
    it('shows Authentication Failed when error in search params', () => {
      renderCallback('/auth/callback?error=access_denied&error_description=User+cancelled');
      expect(screen.getByText('Authentication Failed')).toBeInTheDocument();
    });

    it('shows error description from search params', () => {
      renderCallback('/auth/callback?error=access_denied&error_description=User+cancelled');
      expect(screen.getByText('User cancelled')).toBeInTheDocument();
    });

    it('shows default error message when no description', () => {
      renderCallback('/auth/callback?error=access_denied');
      expect(screen.getByText('Something went wrong during sign-in.')).toBeInTheDocument();
    });

    it('renders Back to Login button', () => {
      renderCallback('/auth/callback?error=access_denied');
      expect(screen.getByRole('button', { name: 'Back to Login' })).toBeInTheDocument();
    });

    it('navigates to login on Back to Login click', () => {
      sessionStorage.setItem(OAUTH_RETURN_TO_KEY, '/appointments');
      renderCallback('/auth/callback?error=access_denied');
      fireEvent.click(screen.getByRole('button', { name: 'Back to Login' }));
      expect(sessionStorage.getItem(OAUTH_RETURN_TO_KEY)).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });

  describe('OAuth token handling', () => {
    it('calls setTokenFromOAuth when access_token in hash', async () => {
      mockSetTokenFromOAuth.mockResolvedValueOnce(undefined);
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...window.location, hash: '#access_token=test-token&expires_in=3600' },
      });
      renderCallback();
      await waitFor(() => {
        expect(mockSetTokenFromOAuth).toHaveBeenCalledWith('test-token', 3600);
      });
    });

    it('navigates to dashboard after successful OAuth', async () => {
      mockSetTokenFromOAuth.mockResolvedValueOnce(undefined);
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...window.location, hash: '#access_token=test-token&expires_in=3600' },
      });
      renderCallback();
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
      });
    });

    it('navigates to the stored return path after successful OAuth', async () => {
      mockSetTokenFromOAuth.mockResolvedValueOnce(undefined);
      sessionStorage.setItem(OAUTH_RETURN_TO_KEY, '/appointments?tab=upcoming#today');
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...window.location, hash: '#access_token=test-token&expires_in=3600' },
      });

      renderCallback();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/appointments?tab=upcoming#today', {
          replace: true,
        });
      });
      expect(sessionStorage.getItem(OAUTH_RETURN_TO_KEY)).toBeNull();
    });

    it('calls refreshSession when no access_token in hash', async () => {
      mockRefreshSession.mockResolvedValueOnce(true);
      renderCallback();
      await waitFor(() => {
        expect(mockRefreshSession).toHaveBeenCalled();
      });
    });

    it('navigates to login when session restore fails without an access token', async () => {
      mockRefreshSession.mockResolvedValueOnce(false);

      renderCallback();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login?error=callback_failed', {
          replace: true,
        });
      });
    });

    it('navigates to login on callback failure', async () => {
      mockRefreshSession.mockRejectedValueOnce(new Error('Session expired'));
      renderCallback();
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login?error=callback_failed', {
          replace: true,
        });
      });
    });
  });
});
