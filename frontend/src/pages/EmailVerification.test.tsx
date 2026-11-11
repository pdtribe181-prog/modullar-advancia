import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { EmailVerification } from './EmailVerification';
import { api } from '../services/api';

vi.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({ user: { email: 'alice@example.com' } }),
}));

vi.mock('../services/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

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
  });

  it('resends a confirmation link using the configured auth endpoint', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      success: true,
      message: 'Confirmation email resent',
    });
    renderVerification('?email=alice%40example.com');

    fireEvent.click(screen.getByRole('button', { name: 'Send confirmation link' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/email/resend-confirmation', {
        email: 'alice@example.com',
      });
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Confirmation email resent');
  });

  it('requires an email address before resending', () => {
    renderVerification('?email=');
    expect(screen.getByLabelText('Email address')).toHaveAttribute('required');
    expect(screen.getByLabelText('Email address')).toHaveValue('alice@example.com');
  });

  it('verifies a Supabase signup token and leaves the account pending approval', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      success: true,
      message: 'Email confirmed. Your account is pending admin approval.',
    });
    renderVerification('?token_hash=one-time-hash&type=signup');

    expect(await screen.findByRole('heading', { name: 'Email confirmed' })).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/auth/email/verify', {
      token_hash: 'one-time-hash',
      type: 'signup',
    });
    expect(screen.getByText('Your account still needs admin approval before you can sign in.'))
      .toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /dashboard/i })).not.toBeInTheDocument();
  });

  it('only submits a confirmation token once under React StrictMode', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      success: true,
      message: 'Email confirmed. Your account is pending admin approval.',
    });
    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/verify-email?token_hash=strict-hash&type=signup']}>
          <EmailVerification />
        </MemoryRouter>
      </StrictMode>
    );

    expect(await screen.findByRole('heading', { name: 'Email confirmed' })).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('shows API errors instead of claiming verification succeeded', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('Confirmation token expired'));
    renderVerification('?token_hash=expired-hash&type=signup');

    expect(await screen.findByRole('heading', { name: 'Confirmation link not accepted' }))
      .toBeInTheDocument();
    expect(screen.getByText('Confirmation token expired')).toBeInTheDocument();
  });
});
