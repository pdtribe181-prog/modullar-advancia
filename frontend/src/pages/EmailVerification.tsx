import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { api } from '../services/api';
import '../styles.css';

type VerificationState = 'pending' | 'verifying' | 'success' | 'error';

type VerificationResponse = {
  success: boolean;
  message?: string;
};

const verificationRequests = new Map<string, Promise<VerificationResponse>>();

function verifyEmailToken(tokenHash: string, type: string): Promise<VerificationResponse> {
  const key = `${type}:${tokenHash}`;
  const existingRequest = verificationRequests.get(key);
  if (existingRequest) return existingRequest;

  const request = api.post<VerificationResponse>('/auth/email/verify', {
    token_hash: tokenHash,
    type,
  });
  verificationRequests.set(key, request);
  void request.then(
    () => {
      if (verificationRequests.get(key) === request) verificationRequests.delete(key);
    },
    () => {
      if (verificationRequests.get(key) === request) verificationRequests.delete(key);
    }
  );
  return request;
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: '20px',
  padding: '40px',
  maxWidth: '480px',
  width: '100%',
  border: '1px solid rgba(255,255,255,0.06)',
  textAlign: 'center',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 20px',
  borderRadius: '12px',
  fontSize: '16px',
  fontWeight: 600,
  cursor: 'pointer',
  border: 'none',
  marginTop: '12px',
};

export const EmailVerification = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenHash = searchParams.get('token_hash');
  const tokenType = searchParams.get('type') || 'signup';
  const [email, setEmail] = useState(searchParams.get('email') || user?.email || '');
  const [state, setState] = useState<VerificationState>(tokenHash ? 'verifying' : 'pending');
  const [message, setMessage] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = window.setTimeout(() => setResendTimer((remaining) => remaining - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendTimer]);

  useEffect(() => {
    if (!tokenHash) return;

    let active = true;
    const verify = async () => {
      try {
        const response = await verifyEmailToken(tokenHash, tokenType);
        if (!active) return;

        setMessage(response.message || 'Email confirmed. Your account is pending admin approval.');
        setState('success');
        const query = email ? `?email=${encodeURIComponent(email)}` : '';
        navigate(`/verify-email${query}`, { replace: true });
      } catch (error) {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : 'Email verification failed.');
        setState('error');
      }
    };

    void verify();
    return () => {
      active = false;
    };
  }, [email, navigate, tokenHash, tokenType]);

  const resendEmail = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResendMessage('');
    setLoading(true);

    try {
      const response = await api.post<VerificationResponse>('/auth/email/resend-confirmation', {
        email,
      });
      setResendMessage(response.message || 'Confirmation email sent. Please check your inbox.');
      setResendTimer(60);
    } catch (error) {
      setResendMessage(error instanceof Error ? error.message : 'Could not resend the confirmation email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={cardStyle}>
        {state === 'verifying' ? (
          <>
            <div style={{ fontSize: '40px', marginBottom: '20px' }}>⏳</div>
            <h1>Email confirmation</h1>
            <p role="status">Confirming your email address…</p>
          </>
        ) : state === 'success' ? (
          <>
            <div style={{ fontSize: '40px', marginBottom: '20px', color: '#10b981' }}>✓</div>
            <h1>Email confirmed</h1>
            <p role="status">{message}</p>
            <p>Your account still needs admin approval before you can sign in.</p>
            <button
              style={{ ...buttonStyle, background: 'var(--primary)', color: '#fff' }}
              onClick={() => navigate('/login')}
            >
              Go to sign in
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: '40px', marginBottom: '20px' }}>
              {state === 'error' ? '!' : '✉'}
            </div>
            <h1>{state === 'error' ? 'Confirmation link not accepted' : 'Confirm your email'}</h1>
            <p>
              {state === 'error'
                ? message
                : 'Enter the email address you registered with and we’ll send a new confirmation link.'}
            </p>
            <form onSubmit={resendEmail}>
              <label htmlFor="verification-email">Email address</label>
              <input
                id="verification-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                style={{ width: '100%', padding: '12px', marginTop: '8px' }}
              />
              <button
                type="submit"
                style={{
                  ...buttonStyle,
                  background: 'var(--primary)',
                  color: '#fff',
                  opacity: loading || resendTimer > 0 ? 0.6 : 1,
                }}
                disabled={loading || resendTimer > 0}
              >
                {loading
                  ? 'Sending…'
                  : resendTimer > 0
                    ? `Try again in ${resendTimer}s`
                    : 'Send confirmation link'}
              </button>
            </form>
            {resendMessage && <p role="status">{resendMessage}</p>}
            <Link to="/login" style={{ display: 'inline-block', marginTop: '20px' }}>
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailVerification;
