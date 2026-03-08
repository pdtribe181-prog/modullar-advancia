import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Login } from './Login';

const mockSignup = vi.fn();
const mockLogin = vi.fn();
const mockSendPhoneOtp = vi.fn();
const mockVerifyPhoneOtp = vi.fn();
const mockSignInWithGoogle = vi.fn();

vi.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({
    login: mockLogin,
    signup: mockSignup,
    sendPhoneOtp: mockSendPhoneOtp,
    verifyPhoneOtp: mockVerifyPhoneOtp,
    signInWithGoogle: mockSignInWithGoogle,
  }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderSignup() {
  return render(
    <MemoryRouter initialEntries={['/signup']}>
      <Login />
    </MemoryRouter>
  );
}

describe('Signup Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders Create Account heading on /signup', () => {
      renderSignup();
      expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
    });

    it('renders Full Name field', () => {
      renderSignup();
      expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    });

    it('renders email and password fields', () => {
      renderSignup();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('renders sign in link', () => {
      renderSignup();
      expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
    });

    it('does not render Forgot Password link', () => {
      renderSignup();
      expect(screen.queryByText('Forgot Password?')).not.toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('shows error for empty email', async () => {
      renderSignup();
      fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
      await waitFor(() => expect(screen.getByText('Email is required')).toBeInTheDocument());
    });

    it('shows error for short password', async () => {
      renderSignup();
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'abc' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
      await waitFor(() => expect(screen.getByText(/at least 8 characters/)).toBeInTheDocument());
    });

    it('shows error for password without number', async () => {
      renderSignup();
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'abcdefgh' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
      await waitFor(() => expect(screen.getByText(/at least one number/)).toBeInTheDocument());
    });

    it('shows error for short full name', async () => {
      renderSignup();
      fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'A' } });
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
      await waitFor(() => expect(screen.getByText(/at least 2 characters/)).toBeInTheDocument());
    });
  });

  describe('form submission', () => {
    it('calls signup with valid data', async () => {
      mockSignup.mockResolvedValue(undefined);
      renderSignup();

      fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Alice Smith' } });
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alice@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

      await waitFor(() =>
        expect(mockSignup).toHaveBeenCalledWith('alice@example.com', 'password1', 'Alice Smith')
      );
    });

    it('navigates to dashboard on success', async () => {
      mockSignup.mockResolvedValue(undefined);
      renderSignup();

      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alice@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'));
    });

    it('shows error on failed signup', async () => {
      mockSignup.mockRejectedValue(new Error('Email already registered'));
      renderSignup();

      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alice@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Email already registered');
    });
  });
});
