import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoadingOverlay } from './components/Spinner';
import { ErrorBoundary } from './components/ErrorBoundary';

// Eager load the home and login pages for fast initial render
import { Home } from './pages/Home';
import { Login } from './pages/Login';

// Lazy load other pages for better code splitting
const PaymentPage = lazy(() => import('./pages/PaymentPage').then(m => ({ default: m.PaymentPage })));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then(m => ({ default: m.CheckoutPage })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const PaymentHistory = lazy(() => import('./pages/PaymentHistory'));
const Profile = lazy(() => import('./pages/Profile'));
const Appointments = lazy(() => import('./pages/Appointments'));
const ProviderDashboard = lazy(() => import('./pages/ProviderDashboard'));
const MFASetup = lazy(() => import('./pages/MFASetup').then(m => ({ default: m.MFASetup })));
const WalletConnect = lazy(() => import('./pages/WalletConnect').then(m => ({ default: m.WalletConnect })));
const SecuritySettings = lazy(() => import('./pages/SecuritySettings').then(m => ({ default: m.SecuritySettings })));
const NotFound = lazy(() => import('./pages/NotFound'));

// Add Admin Console
const AdminConsole = lazy(() => import('./pages/AdminConsole'));

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingOverlay message="Loading page..." />}>
        <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="payment" element={<PaymentPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route
            path="dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
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
            path="admin"
            element={
              <ProtectedRoute>
                <AdminConsole />
              </ProtectedRoute>
            }
          />
          {/* 404 catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
