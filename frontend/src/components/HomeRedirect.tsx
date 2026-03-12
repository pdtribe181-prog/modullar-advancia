import { Navigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import type { ReactNode } from 'react';

/**
 * Renders landing (or healthcare landing) for guests; redirects authenticated
 * users to /dashboard so the app feels like a single entry point.
 */
export function HomeRedirect({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Layout/Suspense will show loading
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
