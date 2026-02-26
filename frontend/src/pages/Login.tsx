import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { LoadingButton } from '../components/Spinner';
import {
  validateLoginForm,
  validateSignupForm,
  getFieldError,
  type ValidationError
} from '../utils/validation';

type AuthMethod = 'email' | 'phone';

export function Login() {
  const location = useLocation();
  const routeMode = useMemo(() => (location.pathname === '/signup' ? 'signup' : 'login'), [location.pathname]);
  const [isSignup, setIsSignup] = useState(routeMode === 'signup');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ValidationError[]>([]);
  const [loading, setLoading] = useState(false);
  const { login, signup, sendPhoneOtp, verifyPhoneOtp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const redirectTo = (location.state as { from?: string } | null)?.from || '/dashboard';
  const redirectMessage = (location.state as { message?: string } | null)?.message;

  useEffect(() => {
    setIsSignup(routeMode === 'signup');
    setFullName('');
    setFieldErrors([]);
    setError('');
    setOtpSent(false);
  }, [routeMode]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors([]);

    // Client-side validation
    const validation = isSignup
      ? validateSignupForm({ email, password, fullName: fullName || undefined })
      : validateLoginForm({ email, password });

    if (!validation.success && validation.errors) {
      setFieldErrors(validation.errors);
      return;
    }

    setLoading(true);

    try {
      if (isSignup) {
        await signup(email, password, fullName || undefined);
      } else {
        await login(email, password);
      }
      navigate(redirectTo);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone || !/^\+?[1-9]\d{1,14}$/.test(phone)) {
      setError('Please enter a valid phone number (e.g., +1234567890)');
      return;
    }

    setLoading(true);

    try {
      if (!otpSent) {
        await sendPhoneOtp(phone);
        setOtpSent(true);
      } else {
        if (!otpCode || otpCode.length !== 6) {
          setError('Please enter the 6-digit code');
          setLoading(false);
          return;
        }
        await verifyPhoneOtp(phone, otpCode);
        navigate(redirectTo);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    }
  };

  const emailError = getFieldError(fieldErrors, 'email');
  const passwordError = getFieldError(fieldErrors, 'password');
  const fullNameError = getFieldError(fieldErrors, 'fullName');

  return (
    <div className="login-page">
      <div className="login-card">
        {redirectMessage && (
          <div className="info-message" role="status" style={{ marginBottom: '16px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', color: '#a5b4fc' }}>
            ℹ️ {redirectMessage}
          </div>
        )}
        <h2>{isSignup ? 'Create Account' : 'Sign In'}</h2>

        {/* Auth Method Tabs */}
        <div className="auth-method-tabs">
          <button
            type="button"
            className={`auth-tab ${authMethod === 'email' ? 'active' : ''}`}
            onClick={() => { setAuthMethod('email'); setError(''); setOtpSent(false); }}
          >
            Email
          </button>
          <button
            type="button"
            className={`auth-tab ${authMethod === 'phone' ? 'active' : ''}`}
            onClick={() => { setAuthMethod('phone'); setError(''); setFieldErrors([]); }}
          >
            Phone
          </button>
        </div>

        {/* Email Form */}
        {authMethod === 'email' && (
          <form onSubmit={handleEmailSubmit}>
            {isSignup && (
              <div className={`form-group ${fullNameError ? 'has-error' : ''}`}>
                <label htmlFor="fullName">Full Name</label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  aria-invalid={!!fullNameError}
                  aria-describedby={fullNameError ? 'fullName-error' : undefined}
                  placeholder="Jane Doe"
                  autoComplete="name"
                />
                {fullNameError && <span id="fullName-error" className="field-error">{fullNameError}</span>}
              </div>
            )}

            <div className={`form-group ${emailError ? 'has-error' : ''}`}>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'email-error' : undefined}
                placeholder="you@example.com"
              />
              {emailError && <span id="email-error" className="field-error">{emailError}</span>}
            </div>

            <div className={`form-group ${passwordError ? 'has-error' : ''}`}>
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? 'password-error' : undefined}
                placeholder="••••••••"
              />
              {passwordError && <span id="password-error" className="field-error">{passwordError}</span>}
            </div>

            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}

            <LoadingButton
              type="submit"
              className="btn btn-primary"
              loading={loading}
              loadingText="Processing..."
            >
              {isSignup ? 'Create Account' : 'Sign In'}
            </LoadingButton>

            {!isSignup && (
              <div style={{ textAlign: 'right', marginTop: '8px' }}>
                <Link to="/reset-password" className="btn-link" style={{ fontSize: '0.85rem' }}>
                  Forgot Password?
                </Link>
              </div>
            )}
          </form>
        )}

        {/* Phone Form */}
        {authMethod === 'phone' && (
          <form onSubmit={handlePhoneSubmit}>
            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1234567890"
                disabled={otpSent}
              />
              <small className="form-hint">Include country code (e.g., +1 for US)</small>
            </div>

            {otpSent && (
              <div className="form-group">
                <label htmlFor="otp">Verification Code</label>
                <input
                  type="text"
                  id="otp"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  autoComplete="one-time-code"
                />
                <small className="form-hint">Enter the 6-digit code sent to your phone</small>
              </div>
            )}

            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}

            <LoadingButton
              type="submit"
              className="btn btn-primary"
              loading={loading}
              loadingText={otpSent ? 'Verifying...' : 'Sending code...'}
            >
              {otpSent ? 'Verify Code' : 'Send Code'}
            </LoadingButton>

            {otpSent && (
              <button
                type="button"
                className="btn-link"
                onClick={() => { setOtpSent(false); setOtpCode(''); }}
                style={{ marginTop: '8px' }}
              >
                Use a different number
              </button>
            )}
          </form>
        )}

        {/* OAuth Divider */}
        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        {/* OAuth Buttons */}
        <div className="oauth-buttons">
          <button
            type="button"
            className="btn btn-oauth btn-google"
            onClick={handleGoogleSignIn}
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>
        </div>

        <div className="login-footer">
          {isSignup ? (
            <Link className="btn-link" to="/login">
              Already have an account? Sign in
            </Link>
          ) : (
            <Link className="btn-link" to="/signup">
              Don't have an account? Sign up
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
