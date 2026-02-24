import React, { useState, CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import '../styles.css';

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg)',
  padding: '120px 24px 80px',
};

const containerStyle: CSSProperties = {
  maxWidth: '600px',
  margin: '0 auto',
};

const cardStyle: CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: '20px',
  padding: '40px',
  border: '1px solid rgba(255,255,255,0.06)',
};

const headerStyle: CSSProperties = {
  textAlign: 'center',
  marginBottom: '32px',
};

const titleStyle: CSSProperties = {
  fontSize: '28px',
  fontWeight: 800,
  color: '#ffffff',
  marginBottom: '8px',
};

const subtitleStyle: CSSProperties = {
  fontSize: '15px',
  color: 'rgba(255,255,255,0.6)',
};

const stepsContainerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: '8px',
  marginBottom: '40px',
};

const stepStyle = (active: boolean, completed: boolean): CSSProperties => ({
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '14px',
  fontWeight: 700,
  background: completed ? 'rgba(16, 185, 129, 0.2)' : active ? 'rgba(96, 128, 245, 0.2)' : 'rgba(255,255,255,0.05)',
  color: completed ? '#10b981' : active ? 'var(--primary)' : 'rgba(255,255,255,0.4)',
  border: completed
    ? '2px solid #10b981'
    : active
    ? '2px solid var(--primary)'
    : '2px solid rgba(255,255,255,0.1)',
  transition: 'all 0.3s',
});

const stepConnectorStyle = (active: boolean): CSSProperties => ({
  width: '60px',
  height: '2px',
  background: active ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
  alignSelf: 'center',
});

const sectionStyle: CSSProperties = {
  marginBottom: '32px',
};

const instructionStyle: CSSProperties = {
  fontSize: '15px',
  color: 'rgba(255,255,255,0.7)',
  lineHeight: 1.6,
  marginBottom: '24px',
};

const qrContainerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  marginBottom: '24px',
};

const qrPlaceholderStyle: CSSProperties = {
  width: '200px',
  height: '200px',
  background: '#ffffff',
  borderRadius: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
};

// Simple QR code generator (placeholder pattern)
const QRCodeDisplay: React.FC<{ data: string }> = ({ data: _data }) => {
  // In production, use a real QR library like qrcode.react
  // This is a placeholder visual
  return (
    <div style={qrPlaceholderStyle}>
      <svg viewBox="0 0 100 100" width="168" height="168">
        <rect fill="#ffffff" width="100" height="100" />
        {/* Simplified QR pattern for visual */}
        <rect fill="#000000" x="10" y="10" width="25" height="25" />
        <rect fill="#ffffff" x="15" y="15" width="15" height="15" />
        <rect fill="#000000" x="18" y="18" width="9" height="9" />

        <rect fill="#000000" x="65" y="10" width="25" height="25" />
        <rect fill="#ffffff" x="70" y="15" width="15" height="15" />
        <rect fill="#000000" x="73" y="18" width="9" height="9" />

        <rect fill="#000000" x="10" y="65" width="25" height="25" />
        <rect fill="#ffffff" x="15" y="70" width="15" height="15" />
        <rect fill="#000000" x="18" y="73" width="9" height="9" />

        {/* Data pattern */}
        <rect fill="#000000" x="40" y="10" width="5" height="5" />
        <rect fill="#000000" x="50" y="15" width="5" height="5" />
        <rect fill="#000000" x="45" y="20" width="5" height="10" />
        <rect fill="#000000" x="55" y="25" width="5" height="5" />

        <rect fill="#000000" x="10" y="40" width="5" height="5" />
        <rect fill="#000000" x="20" y="45" width="10" height="5" />
        <rect fill="#000000" x="35" y="40" width="5" height="5" />
        <rect fill="#000000" x="45" y="45" width="15" height="5" />
        <rect fill="#000000" x="65" y="42" width="10" height="5" />
        <rect fill="#000000" x="80" y="45" width="10" height="5" />

        <rect fill="#000000" x="40" y="55" width="10" height="5" />
        <rect fill="#000000" x="55" y="60" width="5" height="5" />
        <rect fill="#000000" x="65" y="55" width="5" height="10" />
        <rect fill="#000000" x="75" y="60" width="10" height="5" />

        <rect fill="#000000" x="40" y="70" width="5" height="5" />
        <rect fill="#000000" x="50" y="75" width="5" height="5" />
        <rect fill="#000000" x="60" y="70" width="10" height="5" />
        <rect fill="#000000" x="75" y="75" width="5" height="10" />
        <rect fill="#000000" x="85" y="70" width="5" height="5" />

        <rect fill="#000000" x="45" y="85" width="15" height="5" />
        <rect fill="#000000" x="65" y="85" width="10" height="5" />
      </svg>
    </div>
  );
};

const secretKeyStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  padding: '16px 20px',
  fontFamily: 'monospace',
  fontSize: '16px',
  letterSpacing: '2px',
  color: '#ffffff',
  textAlign: 'center',
  wordBreak: 'break-all',
  marginBottom: '12px',
};

const copyBtnStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--primary)',
  fontSize: '14px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  margin: '0 auto',
  padding: '8px 16px',
};

const codeInputContainerStyle: CSSProperties = {
  display: 'flex',
  gap: '10px',
  justifyContent: 'center',
  marginBottom: '24px',
};

const codeInputStyle: CSSProperties = {
  width: '48px',
  height: '56px',
  borderRadius: '10px',
  border: '2px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.03)',
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: 700,
  textAlign: 'center',
  transition: 'all 0.2s',
  outline: 'none',
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

const appLinkStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 16px',
  background: 'rgba(255,255,255,0.03)',
  borderRadius: '10px',
  textDecoration: 'none',
  marginBottom: '8px',
  transition: 'all 0.2s',
};

const appIconStyle: CSSProperties = {
  width: '40px',
  height: '40px',
  borderRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '20px',
};

const backupCodesStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '8px',
  marginBottom: '24px',
};

const backupCodeStyle: CSSProperties = {
  padding: '12px',
  background: 'rgba(255,255,255,0.03)',
  borderRadius: '8px',
  fontFamily: 'monospace',
  fontSize: '14px',
  color: 'rgba(255,255,255,0.8)',
  textAlign: 'center',
  letterSpacing: '1px',
};

const warningBoxStyle: CSSProperties = {
  background: 'rgba(245, 158, 11, 0.1)',
  border: '1px solid rgba(245, 158, 11, 0.2)',
  borderRadius: '10px',
  padding: '16px 20px',
  marginBottom: '24px',
};

const warningTextStyle: CSSProperties = {
  fontSize: '14px',
  color: '#f59e0b',
  lineHeight: 1.6,
};

const successBoxStyle: CSSProperties = {
  textAlign: 'center',
  padding: '32px',
};

const successIconStyle: CSSProperties = {
  width: '80px',
  height: '80px',
  borderRadius: '50%',
  background: 'rgba(16, 185, 129, 0.15)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '40px',
  margin: '0 auto 24px',
};

type Step = 1 | 2 | 3 | 4;

export const TwoFactorSetup: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [secret] = useState('JBSWY3DPEHPK3PXP'); // In production, generate new secret via API
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [backupCodes] = useState([
    'A1B2-C3D4', 'E5F6-G7H8', 'I9J0-K1L2', 'M3N4-O5P6',
    'Q7R8-S9T0', 'U1V2-W3X4', 'Y5Z6-A7B8', 'C9D0-E1F2',
  ]);

  const otpAuthUrl = `otpauth://totp/Advancia:${user?.email || 'user@example.com'}?secret=${secret}&issuer=Advancia`;

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      alert(`Manual copy: ${secret}`);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newCode = [...code];
      digits.forEach((d, i) => {
        if (index + i < 6) newCode[index + i] = d;
      });
      setCode(newCode);
      return;
    }

    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      document.getElementById(`totp-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      document.getElementById(`totp-${index - 1}`)?.focus();
    }
  };

  const verifyCode = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) return;

    setLoading(true);
    try {
      // Simulate API verification
      await new Promise(resolve => setTimeout(resolve, 1500));
      // In production: await apiService.post('/auth/2fa/verify', { code: fullCode, secret });
      setStep(4);
    } catch {
      alert('Invalid code. Please try again.');
      setCode(['', '', '', '', '', '']);
    } finally {
      setLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    const content = `Advancia PayLedger - Backup Codes
Generated: ${new Date().toISOString()}
Account: ${user?.email || 'user@example.com'}

Keep these codes in a safe place. Each code can only be used once.

${backupCodes.join('\n')}

If you lose access to your authenticator app, you can use one of these codes to sign in.
`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'advancia-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={headerStyle}>
            <h1 style={titleStyle}>Set Up 2FA</h1>
            <p style={subtitleStyle}>Secure your account with two-factor authentication</p>
          </div>

          {/* Progress Steps */}
          <div style={stepsContainerStyle}>
            <div style={stepStyle(step === 1, step > 1)}>{step > 1 ? '✓' : '1'}</div>
            <div style={stepConnectorStyle(step > 1)} />
            <div style={stepStyle(step === 2, step > 2)}>{step > 2 ? '✓' : '2'}</div>
            <div style={stepConnectorStyle(step > 2)} />
            <div style={stepStyle(step === 3, step > 3)}>{step > 3 ? '✓' : '3'}</div>
            <div style={stepConnectorStyle(step > 3)} />
            <div style={stepStyle(step === 4, false)}>4</div>
          </div>

          {/* Step 1: Download App */}
          {step === 1 && (
            <div style={sectionStyle}>
              <p style={instructionStyle}>
                First, download an authenticator app on your phone if you don't have one:
              </p>

              <a
                href="https://apps.apple.com/app/google-authenticator/id388497605"
                target="_blank"
                rel="noopener noreferrer"
                style={appLinkStyle}
              >
                <div style={{ ...appIconStyle, background: '#4285F4' }}>G</div>
                <div>
                  <div style={{ color: '#ffffff', fontWeight: 600 }}>Google Authenticator</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>iOS & Android</div>
                </div>
              </a>

              <a
                href="https://authy.com/download/"
                target="_blank"
                rel="noopener noreferrer"
                style={appLinkStyle}
              >
                <div style={{ ...appIconStyle, background: '#EC1C24' }}>A</div>
                <div>
                  <div style={{ color: '#ffffff', fontWeight: 600 }}>Authy</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>iOS, Android, Desktop</div>
                </div>
              </a>

              <a
                href="https://www.microsoft.com/en-us/security/mobile-authenticator-app"
                target="_blank"
                rel="noopener noreferrer"
                style={appLinkStyle}
              >
                <div style={{ ...appIconStyle, background: '#00A4EF' }}>M</div>
                <div>
                  <div style={{ color: '#ffffff', fontWeight: 600 }}>Microsoft Authenticator</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>iOS & Android</div>
                </div>
              </a>

              <button style={{ ...btnPrimaryStyle, marginTop: '24px' }} onClick={() => setStep(2)}>
                I have an app installed →
              </button>
            </div>
          )}

          {/* Step 2: Scan QR */}
          {step === 2 && (
            <div style={sectionStyle}>
              <p style={instructionStyle}>
                Open your authenticator app and scan this QR code:
              </p>

              <div style={qrContainerStyle}>
                <QRCodeDisplay data={otpAuthUrl} />
              </div>

              <p style={{ ...instructionStyle, textAlign: 'center', marginBottom: '12px' }}>
                Can't scan? Enter this code manually:
              </p>

              <div style={secretKeyStyle}>{secret}</div>

              <button style={copyBtnStyle} onClick={copySecret}>
                {copied ? '✓ Copied!' : '📋 Copy code'}
              </button>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button style={btnSecondaryStyle} onClick={() => setStep(1)}>
                  ← Back
                </button>
                <button style={btnPrimaryStyle} onClick={() => setStep(3)}>
                  Next: Verify →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Verify */}
          {step === 3 && (
            <div style={sectionStyle}>
              <p style={instructionStyle}>
                Enter the 6-digit code from your authenticator app to verify setup:
              </p>

              <div style={codeInputContainerStyle}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    id={`totp-${i}`}
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

              <div style={{ display: 'flex', gap: '12px' }}>
                <button style={btnSecondaryStyle} onClick={() => setStep(2)}>
                  ← Back
                </button>
                <button
                  style={{
                    ...btnPrimaryStyle,
                    opacity: code.join('').length !== 6 || loading ? 0.6 : 1,
                  }}
                  onClick={verifyCode}
                  disabled={code.join('').length !== 6 || loading}
                >
                  {loading ? 'Verifying...' : 'Verify & Enable 2FA'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Backup Codes */}
          {step === 4 && (
            <div style={sectionStyle}>
              <div style={successBoxStyle}>
                <div style={successIconStyle}>🔐</div>
                <h2 style={{ ...titleStyle, fontSize: '24px' }}>2FA Enabled!</h2>
                <p style={{ ...subtitleStyle, marginBottom: '24px' }}>
                  Your account is now protected with two-factor authentication.
                </p>
              </div>

              <div style={warningBoxStyle}>
                <p style={warningTextStyle}>
                  ⚠️ <strong>Important:</strong> Save these backup codes in a secure location.
                  You'll need them if you lose access to your authenticator app.
                </p>
              </div>

              <div style={backupCodesStyle}>
                {backupCodes.map((code, i) => (
                  <div key={i} style={backupCodeStyle}>{code}</div>
                ))}
              </div>

              <button style={btnSecondaryStyle} onClick={downloadBackupCodes}>
                📥 Download Backup Codes
              </button>

              <button style={btnPrimaryStyle} onClick={() => navigate('/security')}>
                Done - Go to Security Settings
              </button>
            </div>
          )}

          {step !== 4 && (
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <Link to="/security" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', textDecoration: 'none' }}>
                Cancel Setup
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TwoFactorSetup;
