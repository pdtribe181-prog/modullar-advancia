import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Login } from './Login';

const mockUseAuth = vi.fn();
const mockLogin = vi.fn();
const mockSignup = vi.fn();
const mockSendPhoneOtp = vi.fn();
const mockVerifyPhoneOtp = vi.fn();
const mockSignInWithGoogle = vi.fn();

vi.mock('../providers/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockNavigate = vi.fn();
const mockNavigateComponent = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Navigate: (props: { to: string; replace?: boolean }) => {
      mockNavigateComponent(props);
      return <div data-testid="navigate">Redirecting to {props.to}</div>;
    },
  };
});

function renderLogin(
  route: string | { pathname: string; search?: string; hash?: string; state?: unknown } = '/login'
) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Login />
    </MemoryRouter>
  );
}

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      signup: mockSignup,
      sendPhoneOtp: mockSendPhoneOtp,
      verifyPhoneOtp: mockVerifyPhoneOtp,
      signInWithGoogle: mockSignInWithGoogle,
      isAuthenticated: false,
      loading: false,
    });
  });

  describe('rendering', () => {
    it('renders Sign In heading on /login', () => {
      renderLogin('/login');
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    });

    it('renders email and password fields', () => {
      renderLogin();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('renders auth method tabs', () => {
      renderLogin();
      const tabs = screen.getAllByText('Email');
      expect(tabs.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Phone')).toBeInTheDocument();
    });

    it('renders Google sign-in button', () => {
      renderLogin();
      expect(screen.getByText('Google')).toBeInTheDocument();
    });

    it('renders sign up link', () => {
      renderLogin();
      expect(screen.getByText(/Don't have an account/)).toBeInTheDocument();
    });

    it('renders Forgot Password link', () => {
      renderLogin();
      expect(screen.getByText('Forgot Password?')).toBeInTheDocument();
    });
  });

  describe('email login', () => {
    it('shows validation error for empty email', async () => {
      renderLogin();
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
      await waitFor(() => expect(screen.getByText('Email is required')).toBeInTheDocument());
    });

    it('shows validation error for invalid email', async () => {
      renderLogin();
      // "foo@bar" passes HTML5 type="email" validation but fails the app regex (requires a dot)
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'foo@bar' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pass1234' } });
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
      await waitFor(() => expect(screen.getByText(/invalid email/i)).toBeInTheDocument());
    });

    it('shows validation error for empty password', async () => {
      renderLogin();
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
      await waitFor(() => expect(screen.getByText('Password is required')).toBeInTheDocument());
    });

    it('calls login on valid submit', async () => {
      mockLogin.mockResolvedValue(undefined);
      renderLogin();

      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } });
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

      await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'password1'));
    });

    it('navigates to dashboard on successful login', async () => {
      mockLogin.mockResolvedValue(undefined);
      renderLogin();

      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } });
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'));
    });

    it('navigates to the requested protected route after successful login', async () => {
      mockLogin.mockResolvedValue(undefined);
      renderLogin({
        pathname: '/login',
        state: { from: '/appointments?tab=upcoming#today' },
      });

      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } });
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/appointments?tab=upcoming#today');
      });
    });

    it('shows error on failed login', async () => {
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));
      renderLogin();

      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } });
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
    });

    it('redirects authenticated users away from the auth page', () => {
      mockUseAuth.mockReturnValue({
        login: mockLogin,
        signup: mockSignup,
        sendPhoneOtp: mockSendPhoneOtp,
        verifyPhoneOtp: mockVerifyPhoneOtp,
        signInWithGoogle: mockSignInWithGoogle,
        isAuthenticated: true,
        loading: false,
      });

      renderLogin({
        pathname: '/login',
        state: { from: '/history?filter=open#latest' },
      });

      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(mockNavigateComponent).toHaveBeenCalledWith(
        expect.objectContaining({ to: '/history?filter=open#latest', replace: true })
      );
    });
  });

  describe('phone auth', () => {
    it('switches to phone form on tab click', async () => {
      renderLogin();
      fireEvent.click(screen.getByText('Phone'));
      expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();
    });

    it('shows error for invalid phone', async () => {
      renderLogin();
      fireEvent.click(screen.getByText('Phone'));
      fireEvent.change(screen.getByLabelText('Phone Number'), { target: { value: 'abc' } });
      fireEvent.click(screen.getByRole('button', { name: 'Send Code' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(/valid phone number/);
    });

    it('sends OTP for valid phone', async () => {
      mockSendPhoneOtp.mockResolvedValue(undefined);
      renderLogin();
      fireEvent.click(screen.getByText('Phone'));
      fireEvent.change(screen.getByLabelText('Phone Number'), {
        target: { value: '+12345678901' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Send Code' }));
      await waitFor(() => expect(mockSendPhoneOtp).toHaveBeenCalledWith('+12345678901'));
    });

    it('navigates to the requested route after successful phone verification', async () => {
      mockSendPhoneOtp.mockResolvedValue(undefined);
      mockVerifyPhoneOtp.mockResolvedValue(undefined);

      renderLogin({
        pathname: '/login',
        state: { from: '/wallet?tab=activity#recent' },
      });

      fireEvent.click(screen.getByText('Phone'));
      fireEvent.change(screen.getByLabelText('Phone Number'), {
        target: { value: '+12345678901' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Send Code' }));

      await waitFor(() => expect(mockSendPhoneOtp).toHaveBeenCalledWith('+12345678901'));

      fireEvent.change(screen.getByLabelText('Verification Code'), {
        target: { value: '123456' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Verify Code' }));

      await waitFor(() => {
        expect(mockVerifyPhoneOtp).toHaveBeenCalledWith('+12345678901', '123456');
      });
      expect(mockNavigate).toHaveBeenCalledWith('/wallet?tab=activity#recent');
    });
  });

  describe('Google sign-in', () => {
    it('calls signInWithGoogle on click', async () => {
      mockSignInWithGoogle.mockResolvedValue(undefined);
      renderLogin({
        pathname: '/login',
        state: { from: '/dashboard/claims?filter=open#today' },
      });
      fireEvent.click(screen.getByText('Google'));
      await waitFor(() =>
        expect(mockSignInWithGoogle).toHaveBeenCalledWith('/dashboard/claims?filter=open#today')
      );
    });

    it('shows error on Google sign-in failure', async () => {
      mockSignInWithGoogle.mockRejectedValue(new Error('Popup blocked'));
      renderLogin();
      fireEvent.click(screen.getByText('Google'));
      expect(await screen.findByRole('alert')).toHaveTextContent('Popup blocked');
    });
  });
});
