import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EmailVerification } from './EmailVerification';

vi.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({ user: { email: 'alice@example.com' } }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mock styles.css import
vi.mock('../styles.css', () => ({}));

function renderVerification(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/verify-email${search}`]}>
      <EmailVerification />
    </MemoryRouter>
  );
}

describe('EmailVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('pending state (no token)', () => {
    it('shows Verify Your Email heading', () => {
      renderVerification();
      expect(screen.getByText('Verify Your Email')).toBeInTheDocument();
    });

    it('displays user email from auth context', () => {
      renderVerification();
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    });

    it('displays email from search params if provided', () => {
      renderVerification('?email=bob@test.com');
      expect(screen.getByText('bob@test.com')).toBeInTheDocument();
    });

    it('renders 6 code inputs', () => {
      renderVerification();
      for (let i = 0; i < 6; i++) {
        expect(document.getElementById(`code-${i}`)).toBeInTheDocument();
      }
    });

    it('renders Verify Email button disabled initially', () => {
      renderVerification();
      expect(screen.getByRole('button', { name: 'Verify Email' })).toBeDisabled();
    });

    it('renders Resend Code button', () => {
      renderVerification();
      expect(screen.getByRole('button', { name: 'Resend Code' })).toBeInTheDocument();
    });

    it('has Back to Login link', () => {
      renderVerification();
      expect(screen.getByText('← Back to Login')).toBeInTheDocument();
    });

    it('enables Verify button when 6 digits entered', () => {
      renderVerification();
      for (let i = 0; i < 6; i++) {
        fireEvent.change(document.getElementById(`code-${i}`)!, {
          target: { value: String(i + 1) },
        });
      }
      expect(screen.getByRole('button', { name: 'Verify Email' })).not.toBeDisabled();
    });

    it('transitions to success after verification', async () => {
      renderVerification();
      for (let i = 0; i < 6; i++) {
        fireEvent.change(document.getElementById(`code-${i}`)!, {
          target: { value: String(i + 1) },
        });
      }
      fireEvent.click(screen.getByRole('button', { name: 'Verify Email' }));

      // Advance past the 1500ms simulated delay
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByText('Email Verified!')).toBeInTheDocument();
    });

    it('shows resend timer after clicking Resend Code', async () => {
      renderVerification();
      fireEvent.click(screen.getByRole('button', { name: 'Resend Code' }));

      // Advance past the 1000ms resend delay
      await act(async () => {
        vi.advanceTimersByTime(1100);
      });

      expect(screen.getByText(/Resend available in/)).toBeInTheDocument();
    });
  });

  describe('verifying state (token in URL)', () => {
    it('shows Verifying text when token provided', () => {
      renderVerification('?token=test-token-123');
      expect(screen.getByText('Verifying...')).toBeInTheDocument();
    });

    it('transitions to success after delay', async () => {
      renderVerification('?token=test-token-123');
      expect(screen.getByText('Verifying...')).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(2100);
      });

      expect(screen.getByText('Email Verified!')).toBeInTheDocument();
    });
  });

  describe('success state', () => {
    it('shows dashboard button after verification', async () => {
      renderVerification('?token=test-token-123');

      await act(async () => {
        vi.advanceTimersByTime(2100);
      });

      const dashBtn = screen.getByRole('button', { name: /Go to Dashboard/ });
      fireEvent.click(dashBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('shows Return to Home link', async () => {
      renderVerification('?token=test-token-123');

      await act(async () => {
        vi.advanceTimersByTime(2100);
      });

      expect(screen.getByText('Return to Home')).toBeInTheDocument();
    });
  });
});
