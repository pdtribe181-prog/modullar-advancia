import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}${location.hash}`;

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: returnTo }} replace />;
  }

  return <>{children}</>;
}
