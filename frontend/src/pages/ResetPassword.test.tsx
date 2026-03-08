import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ResetPassword } from './ResetPassword';

const mockPut = vi.hoisted(() => vi.fn());
const mockSetToken = vi.hoisted(() => vi.fn());

vi.mock('../services/api', () => ({
  api: { put: mockPut, setToken: mockSetToken },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderReset() {
  return render(
    <MemoryRouter>
      <ResetPassword />
    </MemoryRouter>
  );
}

describe('ResetPassword', () => {
  let originalHash: string;

  beforeEach(() => {
    vi.clearAllMocks();
    originalHash = window.location.hash;
  });

  afterEach(() => {
    window.location.hash = originalHash;
  });

  describe('no token (invalid link)', () => {
    it('shows Invalid Reset Link heading', () => {
      window.location.hash = '';
      renderReset();
      expect(screen.getByText('Invalid Reset Link')).toBeInTheDocument();
    });

    it('shows explanation text', () => {
      window.location.hash = '';
      renderReset();
      expect(screen.getByText(/invalid or has expired/)).toBeInTheDocument();
    });

    it('has Back to Login button that navigates', () => {
      window.location.hash = '';
      renderReset();
      fireEvent.click(screen.getByRole('button', { name: 'Back to Login' }));
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('valid token (form displayed)', () => {
    beforeEach(() => {
      window.location.hash = '#access_token=test-recovery-token&type=recovery';
    });

    it('shows Reset Your Password heading', () => {
      renderReset();
      expect(screen.getByText('Reset Your Password')).toBeInTheDocument();
    });

    it('renders password and confirm password fields', () => {
      renderReset();
      expect(screen.getByLabelText('New Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    });

    it('renders Reset Password submit button', () => {
      renderReset();
      expect(screen.getByRole('button', { name: 'Reset Password' })).toBeInTheDocument();
    });

    it('shows error for password under 8 characters', async () => {
      renderReset();
      fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'short' } });
      fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'short' } });
      fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));
      await waitFor(() =>
        expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument()
      );
    });

    it('shows error when passwords do not match', async () => {
      renderReset();
      fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'password1' } });
      fireEvent.change(screen.getByLabelText('Confirm Password'), {
        target: { value: 'password2' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));
      await waitFor(() => expect(screen.getByText('Passwords do not match.')).toBeInTheDocument());
    });

    it('calls api.setToken and api.put on valid submit', async () => {
      mockPut.mockResolvedValue({});
      renderReset();
      fireEvent.change(screen.getByLabelText('New Password'), {
        target: { value: 'newpassword1' },
      });
      fireEvent.change(screen.getByLabelText('Confirm Password'), {
        target: { value: 'newpassword1' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

      await waitFor(() => {
        expect(mockSetToken).toHaveBeenCalledWith('test-recovery-token');
        expect(mockPut).toHaveBeenCalledWith('/auth/password', { password: 'newpassword1' });
      });
    });

    it('shows success state after successful reset', async () => {
      mockPut.mockResolvedValue({});
      renderReset();
      fireEvent.change(screen.getByLabelText('New Password'), {
        target: { value: 'newpassword1' },
      });
      fireEvent.change(screen.getByLabelText('Confirm Password'), {
        target: { value: 'newpassword1' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

      expect(await screen.findByText('Password Updated')).toBeInTheDocument();
      expect(screen.getByText(/successfully reset/)).toBeInTheDocument();
    });

    it('shows Sign In button after success', async () => {
      mockPut.mockResolvedValue({});
      renderReset();
      fireEvent.change(screen.getByLabelText('New Password'), {
        target: { value: 'newpassword1' },
      });
      fireEvent.change(screen.getByLabelText('Confirm Password'), {
        target: { value: 'newpassword1' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

      const signInBtn = await screen.findByRole('button', { name: 'Sign In' });
      fireEvent.click(signInBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('shows error on failed api call', async () => {
      mockPut.mockRejectedValue(new Error('Token expired'));
      renderReset();
      fireEvent.change(screen.getByLabelText('New Password'), {
        target: { value: 'newpassword1' },
      });
      fireEvent.change(screen.getByLabelText('Confirm Password'), {
        target: { value: 'newpassword1' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

      expect(await screen.findByText('Token expired')).toBeInTheDocument();
    });
  });
});
