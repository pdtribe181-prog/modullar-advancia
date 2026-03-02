import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoadingOverlay } from './components/Spinner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuth } from './providers/AuthProvider';
import type { ReactNode } from 'react';
import { CookieConsent } from './components/CookieConsent';

// Eager load the home and login pages for fast initial render
import { LandingPage } from './pages/LandingPage';
import { HealthcareLanding } from './pages/HealthcareLanding';
import { Login } from './pages/Login';

// Lazy load other pages for better code splitting
const Features = lazy(() => import('./pages/Features').then((m) => ({ default: m.Features })));
const Policy = lazy(() => import('./pages/Policy').then((m) => ({ default: m.Policy })));
const Subscriptions = lazy(() =>
  import('./pages/Subscriptions').then((m) => ({ default: m.Subscriptions }))
);
const CryptoWallet = lazy(() =>
  import('./pages/CryptoWallet').then((m) => ({ default: m.CryptoWallet }))
);
const FAQ = lazy(() => import('./pages/FAQ').then((m) => ({ default: m.FAQ })));
const PaymentPage = lazy(() =>
  import('./pages/PaymentPage').then((m) => ({ default: m.PaymentPage }))
);
const CheckoutPage = lazy(() =>
  import('./pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage }))
);
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const PaymentHistory = lazy(() => import('./pages/PaymentHistory'));
const Profile = lazy(() => import('./pages/Profile'));
const Appointments = lazy(() => import('./pages/Appointments'));
const ProviderDashboard = lazy(() => import('./pages/ProviderDashboard'));
const MFASetup = lazy(() => import('./pages/MFASetup').then((m) => ({ default: m.MFASetup })));
const WalletConnect = lazy(() =>
  import('./pages/WalletConnect').then((m) => ({ default: m.WalletConnect }))
);
const SecuritySettings = lazy(() =>
  import('./pages/SecuritySettings').then((m) => ({ default: m.SecuritySettings }))
);
const NotFound = lazy(() => import('./pages/NotFound'));

// Admin Console
const AdminConsole = lazy(() => import('./pages/AdminConsole'));

// New feature pages
const WalletBalance = lazy(() =>
  import('./pages/WalletBalance').then((m) => ({ default: m.WalletBalance }))
);
const Withdraw = lazy(() => import('./pages/Withdraw').then((m) => ({ default: m.Withdraw })));
const MedBed = lazy(() => import('./pages/MedBed').then((m) => ({ default: m.MedBed })));
const Notifications = lazy(() =>
  import('./pages/Notifications').then((m) => ({ default: m.Notifications }))
);
const Convert = lazy(() => import('./pages/Convert').then((m) => ({ default: m.Convert })));

// Missing redirect target pages
const PaymentSuccess = lazy(() =>
  import('./pages/PaymentSuccess').then((m) => ({ default: m.PaymentSuccess }))
);
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword').then((m) => ({ default: m.ResetPassword }))
);
const AuthCallback = lazy(() =>
  import('./pages/AuthCallback').then((m) => ({ default: m.AuthCallback }))
);
const Contact = lazy(() => import('./pages/Contact').then((m) => ({ default: m.Contact })));

// Legal & Compliance pages
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const Invoices = lazy(() => import('./pages/Invoices'));
const EmailVerification = lazy(() => import('./pages/EmailVerification'));
const TwoFactorSetup = lazy(() => import('./pages/TwoFactorSetup'));
const Disputes = lazy(() => import('./pages/Disputes'));
const KYCVerification = lazy(() => import('./pages/KYCVerification'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const Onboarding = lazy(() => import('./pages/Onboarding'));

import { isHealthcareHost } from './config/domains';

const isHealthcareHostValue =
  typeof window !== 'undefined' && isHealthcareHost(window.location.hostname);

/**
 * Role-based route guard — redirects to dashboard if user lacks required role.
 */
function RoleGuard({ children, allowedRoles }: { children: ReactNode; allowedRoles: string[] }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingOverlay message="Checking permissions..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingOverlay message="Loading page..." />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route
              index
              element={isHealthcareHostValue ? <HealthcareLanding /> : <LandingPage />}
            />
            <Route path="features" element={<Features />} />
            <Route path="policy" element={<Policy />} />
            <Route path="subscriptions" element={<Subscriptions />} />
            <Route path="wallet-tools" element={<CryptoWallet />} />
            <Route path="faq" element={<FAQ />} />
            <Route path="contact" element={<Contact />} />
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Login />} />
            <Route path="payment" element={<PaymentPage />} />
            <Route path="payment/success" element={<PaymentSuccess />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="reset-password" element={<ResetPassword />} />
            <Route path="auth/callback" element={<AuthCallback />} />
            <Route
              path="dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route path="payments" element={<Navigate to="/history" replace />} />
            <Route
              path="history"
              element={
                <ProtectedRoute>
                  <PaymentHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="appointments"
              element={
                <ProtectedRoute>
                  <Appointments />
                </ProtectedRoute>
              }
            />
            <Route
              path="provider"
              element={
                <ProtectedRoute>
                  <ProviderDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="security/mfa"
              element={
                <ProtectedRoute>
                  <MFASetup />
                </ProtectedRoute>
              }
            />
            <Route
              path="security"
              element={
                <ProtectedRoute>
                  <SecuritySettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="wallet"
              element={
                <ProtectedRoute>
                  <WalletConnect />
                </ProtectedRoute>
              }
            />
            <Route
              path="convert"
              element={
                <ProtectedRoute>
                  <Convert />
                </ProtectedRoute>
              }
            />
            <Route
              path="wallet-balance"
              element={
                <ProtectedRoute>
                  <WalletBalance />
                </ProtectedRoute>
              }
            />
            <Route
              path="withdraw"
              element={
                <ProtectedRoute>
                  <Withdraw />
                </ProtectedRoute>
              }
            />
            <Route
              path="medbed"
              element={
                <ProtectedRoute>
                  <MedBed />
                </ProtectedRoute>
              }
            />
            <Route
              path="notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            {/* Public pages */}
            <Route path="terms" element={<TermsOfService />} />
            <Route path="verify-email" element={<EmailVerification />} />
            <Route path="welcome" element={<Onboarding />} />
            {/* Protected feature pages */}
            <Route
              path="invoices"
              element={
                <ProtectedRoute>
                  <Invoices />
                </ProtectedRoute>
              }
            />
            <Route
              path="disputes"
              element={
                <ProtectedRoute>
                  <Disputes />
                </ProtectedRoute>
              }
            />
            <Route
              path="kyc"
              element={
                <ProtectedRoute>
                  <KYCVerification />
                </ProtectedRoute>
              }
            />
            <Route
              path="security/2fa-setup"
              element={
                <ProtectedRoute>
                  <TwoFactorSetup />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/audit-log"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <AuditLog />
                </RoleGuard>
              }
            />
            <Route
              path="admin"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <AdminConsole />
                </RoleGuard>
              }
            />
            {/* 404 catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        <CookieConsent />
      </Suspense>
    </ErrorBoundary>
  );
}
