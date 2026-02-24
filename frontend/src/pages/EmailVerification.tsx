import React, { useState, useEffect, CSSProperties } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import '../styles.css';

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
};

const cardStyle: CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: '20px',
  padding: '48px',
  maxWidth: '480px',
  width: '100%',
  border: '1px solid rgba(255,255,255,0.06)',
  textAlign: 'center',
};

const iconStyle: CSSProperties = {
  width: '80px',
  height: '80px',
  borderRadius: '50%',
  background: 'rgba(96, 128, 245, 0.15)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '40px',
  margin: '0 auto 24px',
};

const successIconStyle: CSSProperties = {
  ...iconStyle,
  background: 'rgba(16, 185, 129, 0.15)',
};

const errorIconStyle: CSSProperties = {
  ...iconStyle,
  background: 'rgba(239, 68, 68, 0.15)',
};

const titleStyle: CSSProperties = {
  fontSize: '28px',
  fontWeight: 800,
  color: '#ffffff',
  marginBottom: '12px',
};

const textStyle: CSSProperties = {
  fontSize: '15px',
  color: 'rgba(255,255,255,0.6)',
  lineHeight: 1.6,
  marginBottom: '32px',
};

const emailStyle: CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: 'var(--primary)',
  marginBottom: '32px',
};

const btnStyle: CSSProperties = {
  width: '100%',
  padding: '16px 24px',
  borderRadius: '12px',
  fontSize: '16px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  border: 'none',
  marginBottom: '12px',
};

const btnPrimaryStyle: CSSProperties = {
  ...btnStyle,
  background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
  color: '#ffffff',
};

const btnSecondaryStyle: CSSProperties = {
  ...btnStyle,
  background: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.8)',
  border: '1px solid rgba(255,255,255,0.1)',
};

const linkStyle: CSSProperties = {
  fontSize: '14px',
  color: 'var(--primary)',
  textDecoration: 'none',
};

const timerStyle: CSSProperties = {
  fontSize: '14px',
  color: 'rgba(255,255,255,0.5)',
  marginTop: '16px',
};

const codeInputContainerStyle: CSSProperties = {
  display: 'flex',
  gap: '12px',
  justifyContent: 'center',
  marginBottom: '32px',
};

const codeInputStyle: CSSProperties = {
  width: '56px',
  height: '64px',
  borderRadius: '12px',
  border: '2px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.03)',
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 700,
  textAlign: 'center',
  transition: 'all 0.2s',
  outline: 'none',
};

const progressBarStyle: CSSProperties = {
  width: '100%',
  height: '4px',
  background: 'rgba(255,255,255,0.1)',
  borderRadius: '2px',
  overflow: 'hidden',
  marginBottom: '24px',
};

const progressFillStyle = (percent: number): CSSProperties => ({
  height: '100%',
  width: `${percent}%`,
  background: 'linear-gradient(90deg, var(--primary) 0%, #10b981 100%)',
  transition: 'width 0.5s ease',
});

type VerifyState = 'pending' | 'verifying' | 'success' | 'error' | 'expired';

export const EmailVerification: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const email = searchParams.get('email') || user?.email || 'your@email.com';

  const [state, setState] = useState<VerifyState>(token ? 'verifying' : 'pending');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(0);
  const [loading, setLoading] = useState(false);

  // Auto-verify if token is in URL
  useEffect(() => {
    if (token) {
      verifyWithToken(token);
    }
  }, [token]);

  // Resend countdown timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const verifyWithToken = async (_t: string) => {
    setState('verifying');
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      // In production: await apiService.post('/auth/verify-email', { token: _t });
      setState('success');
    } catch {
      setState('error');
    }
  };

  const verifyWithCode = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) return;

    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      // In production: await apiService.post('/auth/verify-email', { code: fullCode, email });
      setState('success');
    } catch {
      setState('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newCode = [...code];
      digits.forEach((d, i) => {
        if (index + i < 6) newCode[index + i] = d;
      });
      setCode(newCode);
      const nextIndex = Math.min(index + digits.length, 5);
      const nextInput = document.getElementById(`code-${nextIndex}`);
      nextInput?.focus();
      return;
    }

    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const resendEmail = async () => {
    if (resendTimer > 0) return;

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In production: await apiService.post('/auth/resend-verification', { email });
      setResendTimer(60);
      alert('Verification email sent!');
    } catch (error) {
      console.error('Failed to resend email:', error);
    }
  };

  // Verifying state
  if (state === 'verifying') {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={iconStyle}>⏳</div>
          <h1 style={titleStyle}>Verifying...</h1>
          <p style={textStyle}>Please wait while we verify your email address.</p>
          <div style={progressBarStyle}>
            <div style={progressFillStyle(66)} />
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (state === 'success') {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={successIconStyle}>✓</div>
          <h1 style={titleStyle}>Email Verified!</h1>
          <p style={textStyle}>
            Your email has been successfully verified. You now have full access
            to all Advancia PayLedger features.
          </p>
          <button style={btnPrimaryStyle} onClick={() => navigate('/dashboard')}>
            Go to Dashboard →
          </button>
          <Link to="/" style={linkStyle}>Return to Home</Link>
        </div>
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={errorIconStyle}>✕</div>
          <h1 style={titleStyle}>Verification Failed</h1>
          <p style={textStyle}>
            The verification link is invalid or has expired. Please request a new
            verification email.
          </p>
          <button style={btnPrimaryStyle} onClick={resendEmail}>
            Resend Verification Email
          </button>
          <Link to="/login" style={linkStyle}>Back to Login</Link>
        </div>
      </div>
    );
  }

  // Pending state - waiting for verification
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={iconStyle}>📧</div>
        <h1 style={titleStyle}>Verify Your Email</h1>
        <p style={textStyle}>
          We've sent a verification code to:
        </p>
        <p style={emailStyle}>{email}</p>

        <p style={{ ...textStyle, marginBottom: '20px' }}>
          Enter the 6-digit code below:
        </p>

        <div style={codeInputContainerStyle}>
          {code.map((digit, i) => (
            <input
              key={i}
              id={`code-${i}`}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={digit}
              onChange={(e) => handleCodeChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              style={{
                ...codeInputStyle,
                borderColor: digit ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
              }}
              autoFocus={i === 0}
            />
          ))}
        </div>

        <button
          style={{
            ...btnPrimaryStyle,
            opacity: code.join('').length !== 6 || loading ? 0.6 : 1,
            cursor: code.join('').length !== 6 || loading ? 'not-allowed' : 'pointer',
          }}
          onClick={verifyWithCode}
          disabled={code.join('').length !== 6 || loading}
        >
          {loading ? 'Verifying...' : 'Verify Email'}
        </button>

        <button
          style={{
            ...btnSecondaryStyle,
            opacity: resendTimer > 0 ? 0.5 : 1,
            cursor: resendTimer > 0 ? 'not-allowed' : 'pointer',
          }}
          onClick={resendEmail}
          disabled={resendTimer > 0}
        >
          Resend Code
        </button>

        {resendTimer > 0 && (
          <p style={timerStyle}>
            Resend available in {resendTimer}s
          </p>
        )}

        <div style={{ marginTop: '24px' }}>
          <Link to="/login" style={linkStyle}>
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
