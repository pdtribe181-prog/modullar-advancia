import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';

/**
 * Handles OAuth callback redirects (e.g., Google sign-in).
 * Extracts session from URL hash/params and redirects to dashboard.
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const { refreshSession, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  useEffect(() => {
    if (error) return;

    // Supabase puts the session in the URL hash after OAuth redirects.
    // The Supabase client auto-detects it, so we just refresh the session.
    const handleCallback = async () => {
      try {
        await refreshSession();
        navigate('/dashboard', { replace: true });
      } catch {
        navigate('/login?error=callback_failed', { replace: true });
      }
    };

    handleCallback();
  }, [error, navigate, refreshSession]);

  if (error) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <div className="h-16 w-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
          <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Authentication Failed</h1>
        <p className="mt-2 text-gray-600">{errorDescription || 'Something went wrong during sign-in.'}</p>
        <button
          onClick={() => navigate('/login', { replace: true })}
          className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Back to Login
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <div className="animate-spin h-8 w-8 mx-auto border-4 border-blue-600 border-t-transparent rounded-full" />
        <p className="mt-4 text-gray-500">Completing sign-in...</p>
      </div>
    );
  }

  return null;
}

export default AuthCallback;
