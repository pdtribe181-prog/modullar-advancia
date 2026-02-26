import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';

/**
 * Handles OAuth callback redirects (e.g., Google sign-in).
 * Supabase appends the session to the URL hash after OAuth:
 *   #access_token=xxx&expires_in=3600&token_type=bearer&type=bearer
 * We extract the token, hydrate auth state via setTokenFromOAuth, then
 * redirect to the dashboard.
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const { setTokenFromOAuth, refreshSession, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  useEffect(() => {
    if (error) return;

    const handleCallback = async () => {
      try {
        // Parse Supabase session from URL hash fragment
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const accessToken = hashParams.get('access_token');
        const expiresIn = parseInt(hashParams.get('expires_in') || '3600', 10);

        if (accessToken) {
          // OAuth redirect: token is in the hash — hydrate auth state
          await setTokenFromOAuth(accessToken, expiresIn);
        } else {
          // No hash token (e.g. page reload) — try restoring from localStorage
          await refreshSession();
        }

        navigate('/dashboard', { replace: true });
      } catch {
        navigate('/login?error=callback_failed', { replace: true });
      }
    };

    handleCallback();
  }, [error, navigate, setTokenFromOAuth, refreshSession]);

  if (error) {
    return (
      <div style={{ maxWidth: '480px', margin: '80px auto 0', textAlign: 'center', padding: '0 24px' }}>
        <div style={{ width: '64px', height: '64px', margin: '0 auto', borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg style={{ width: '28px', height: '28px', color: '#f87171' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 style={{ marginTop: '20px', fontSize: '22px', fontWeight: '700', color: '#e2e8f0' }}>Authentication Failed</h1>
        <p style={{ marginTop: '10px', color: '#94a3b8' }}>{errorDescription || 'Something went wrong during sign-in.'}</p>
        <button
          onClick={() => navigate('/login', { replace: true })}
          style={{ marginTop: '24px', display: 'inline-flex', alignItems: 'center', padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#6366f1', color: '#fff', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
        >
          Back to Login
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '480px', margin: '80px auto 0', textAlign: 'center', padding: '0 24px' }}>
        <div style={{ width: '32px', height: '32px', margin: '0 auto', borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#818cf8', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ marginTop: '16px', color: '#94a3b8' }}>Completing sign-in...</p>
      </div>
    );
  }

  return null;
}

export default AuthCallback;
