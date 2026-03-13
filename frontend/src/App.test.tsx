/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet } from 'react-router-dom';
import App from './App';

const mockUseAuth = vi.hoisted(() => vi.fn());
const mockNavigateComponent = vi.hoisted(() => vi.fn());

vi.mock('./providers/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('./config/domains', () => ({
  isHealthcareHost: () => false,
}));

vi.mock('./components/Layout', () => ({
  Layout: () => (
    <div data-testid="layout-shell">
      <Outlet />
    </div>
  ),
}));

vi.mock('./components/Spinner', () => ({
  LoadingOverlay: ({ message }: { message?: string }) => <div>{message || 'Loading...'}</div>,
}));

vi.mock('./components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./components/CookieConsent', () => ({
  CookieConsent: () => <div data-testid="cookie-consent" />,
}));

vi.mock('./pages/LandingPage', () => ({
  LandingPage: () => <div>Landing Page</div>,
}));

vi.mock('./pages/HealthcareLanding', () => ({
  HealthcareLanding: () => <div>Healthcare Landing</div>,
}));

vi.mock('./pages/Login', () => ({
  Login: () => <div>Login Page</div>,
}));

vi.mock('./pages/Dashboard', () => ({
  Dashboard: () => <div>Dashboard Page</div>,
}));

vi.mock('./pages/AdminConsole', () => ({
  default: () => <div>Admin Console Page</div>,
}));

vi.mock('./pages/AuditLog', () => ({
  default: () => <div>Audit Log Page</div>,
}));

vi.mock('./pages/Features', () => ({ Features: () => <div>Features</div> }));
vi.mock('./pages/Policy', () => ({ Policy: () => <div>Policy</div> }));
vi.mock('./pages/Subscriptions', () => ({ Subscriptions: () => <div>Subscriptions</div> }));
vi.mock('./pages/CryptoWallet', () => ({ CryptoWallet: () => <div>CryptoWallet</div> }));
vi.mock('./pages/FAQ', () => ({ FAQ: () => <div>FAQ</div> }));
vi.mock('./pages/PaymentPage', () => ({ PaymentPage: () => <div>PaymentPage</div> }));
vi.mock('./pages/CheckoutPage', () => ({ CheckoutPage: () => <div>CheckoutPage</div> }));
vi.mock('./pages/PaymentHistory', () => ({ default: () => <div>PaymentHistory</div> }));
vi.mock('./pages/Profile', () => ({ default: () => <div>Profile</div> }));
vi.mock('./pages/Appointments', () => ({ default: () => <div>Appointments</div> }));
vi.mock('./pages/ProviderDashboard', () => ({ default: () => <div>ProviderDashboard</div> }));
vi.mock('./pages/MFASetup', () => ({ MFASetup: () => <div>MFASetup</div> }));
vi.mock('./pages/WalletConnect', () => ({ WalletConnect: () => <div>WalletConnect</div> }));
vi.mock('./pages/SecuritySettings', () => ({
  SecuritySettings: () => <div>SecuritySettings</div>,
}));
vi.mock('./pages/NotFound', () => ({ default: () => <div>NotFound</div> }));
vi.mock('./pages/WalletBalance', () => ({ WalletBalance: () => <div>WalletBalance</div> }));
vi.mock('./pages/Withdraw', () => ({ Withdraw: () => <div>Withdraw</div> }));
vi.mock('./pages/MedBed', () => ({ MedBed: () => <div>MedBed</div> }));
vi.mock('./pages/Notifications', () => ({ Notifications: () => <div>Notifications</div> }));
vi.mock('./pages/Convert', () => ({ Convert: () => <div>Convert</div> }));
vi.mock('./pages/PaymentSuccess', () => ({ PaymentSuccess: () => <div>PaymentSuccess</div> }));
vi.mock('./pages/ResetPassword', () => ({ ResetPassword: () => <div>ResetPassword</div> }));
vi.mock('./pages/AuthCallback', () => ({ AuthCallback: () => <div>AuthCallback</div> }));
vi.mock('./pages/Contact', () => ({ Contact: () => <div>Contact</div> }));
vi.mock('./pages/TermsOfService', () => ({ default: () => <div>TermsOfService</div> }));
vi.mock('./pages/Invoices', () => ({ default: () => <div>Invoices</div> }));
vi.mock('./pages/EmailVerification', () => ({ default: () => <div>EmailVerification</div> }));
vi.mock('./pages/TwoFactorSetup', () => ({ default: () => <div>TwoFactorSetup</div> }));
vi.mock('./pages/Disputes', () => ({ default: () => <div>Disputes</div> }));
vi.mock('./pages/KYCVerification', () => ({ default: () => <div>KYCVerification</div> }));
vi.mock('./pages/Onboarding', () => ({ default: () => <div>Onboarding</div> }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Navigate: (props: { to: string; state?: unknown; replace?: boolean }) => {
      mockNavigateComponent(props);
      return <div data-testid="navigate">Redirecting to {props.to}</div>;
    },
  };
});

function renderApp(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <App />
    </MemoryRouter>
  );
}

describe('App auth routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
  });

  it('preserves full admin URL when redirecting unauthenticated users to login', async () => {
    renderApp('/admin?tab=users#pending');

    expect(await screen.findByTestId('navigate')).toBeInTheDocument();
    expect(mockNavigateComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/login',
        replace: true,
        state: expect.objectContaining({ from: '/admin?tab=users#pending' }),
      })
    );
  });

  it('redirects authenticated non-admin users from admin routes to dashboard', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', email: 'patient@example.com', role: 'patient' },
      loading: false,
    });

    renderApp('/admin');

    expect(await screen.findByTestId('navigate')).toBeInTheDocument();
    expect(mockNavigateComponent).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/dashboard', replace: true })
    );
  });

  it('renders admin route content for admin users', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'admin1', email: 'admin@example.com', role: 'admin' },
      loading: false,
    });

    renderApp('/admin');

    expect(await screen.findByText('Admin Console Page')).toBeInTheDocument();
    expect(screen.getByTestId('layout-shell')).toBeInTheDocument();
  });
});
