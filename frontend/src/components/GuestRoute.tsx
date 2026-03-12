import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { ReactNode } from 'react';

/**
 * Wrapper for login/signup: if user is already authenticated, redirect to
 * intended destination (from state) or dashboard. Prevents logged-in users
 * from seeing the login page.
 */
interface GuestRouteProps {
  children: ReactNode;
}

export function GuestRoute({ children }: GuestRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/dashboard';

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (user) {
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
}
