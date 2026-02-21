import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { LoadingButton } from '../components/Spinner';
import { useConfirm } from '../components/ConfirmDialog';

interface MFAFactor {
  id: string;
  type: 'totp' | 'phone';
  friendlyName?: string;
  status: 'verified' | 'unverified';
}

interface EnrollmentData {
  id: string;
  type: 'totp';
  totp: {
    qr_code: string;
    secret: string;
    uri: string;
  };
}

export function MFASetup() {
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [friendlyName, setFriendlyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { enrollMFA, verifyMFA, listMFAFactors, unenrollMFA, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const confirmDialog = useConfirm();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadFactors();
  }, [isAuthenticated, navigate]);

  const loadFactors = async () => {
    setLoading(true);
    try {
      const factorList = await listMFAFactors();
      setFactors(factorList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load MFA factors');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEnrollment = async () => {
    setError('');
    setEnrolling(true);
    try {
      const data = await enrollMFA(friendlyName || 'Authenticator App');
      setEnrollment(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start enrollment');
    } finally {
      setEnrolling(false);
    }
  };

  const handleVerifyEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollment) return;

    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await verifyMFA(enrollment.id, verificationCode);
      setSuccess('MFA enabled successfully!');
      setEnrollment(null);
      setVerificationCode('');
      setFriendlyName('');
      await loadFactors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFactor = async (factorId: string) => {
    const confirmed = await confirmDialog({
      title: 'Remove MFA Factor',
      message: 'Are you sure you want to remove this MFA factor?',
      variant: 'danger',
      confirmText: 'Remove',
    });
    if (!confirmed) return;

    setError('');
    setLoading(true);
    try {
      await unenrollMFA(factorId);
      setSuccess('MFA factor removed');
      await loadFactors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove factor');
    } finally {
      setLoading(false);
    }
  };

  const cancelEnrollment = () => {
    setEnrollment(null);
    setVerificationCode('');
    setFriendlyName('');
    setError('');
  };

  return (
    <div className="mfa-setup-page">
      <div className="mfa-setup-card">
        <h2>Two-Factor Authentication</h2>
        <p className="subtitle">
          Add an extra layer of security to your account with 2FA.
        </p>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* Enrollment Flow */}
        {!enrollment ? (
          <>
            {/* Existing Factors */}
            {factors.length > 0 && (
              <div className="mfa-factors-list">
                <h3>Your Authentication Methods</h3>
                {factors.map((factor) => (
                  <div key={factor.id} className="mfa-factor-item">
                    <div className="mfa-factor-info">
                      <div className="mfa-factor-icon">
                        {factor.type === 'totp' ? '🔐' : '📱'}
                      </div>
                      <div>
                        <strong>{factor.friendlyName || 'Authenticator App'}</strong>
                        <span className={`mfa-factor-status ${factor.status}`}>
                          {factor.status}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => handleRemoveFactor(factor.id)}
                      disabled={loading}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Factor */}
            <div style={{ marginTop: '24px' }}>
              <h3>Add Authenticator App</h3>
              <p style={{ marginBottom: '16px', color: 'var(--secondary)' }}>
                Use an app like Google Authenticator, Authy, or 1Password to generate verification codes.
              </p>

              <div className="form-group">
                <label htmlFor="friendlyName">Device Name (optional)</label>
                <input
                  type="text"
                  id="friendlyName"
                  value={friendlyName}
                  onChange={(e) => setFriendlyName(e.target.value)}
                  placeholder="e.g., iPhone, Work Phone"
                  maxLength={50}
                />
              </div>

              <LoadingButton
                type="button"
                className="btn btn-primary"
                onClick={handleStartEnrollment}
                loading={enrolling}
                loadingText="Setting up..."
              >
                Set Up Authenticator
              </LoadingButton>
            </div>
          </>
        ) : (
          /* QR Code & Verification */
          <div>
            <h3>Scan QR Code</h3>
            <p style={{ marginBottom: '16px' }}>
              Scan this QR code with your authenticator app:
            </p>

            <div className="mfa-qr-container">
              <img
                src={enrollment.totp.qr_code}
                alt="QR Code for authenticator app"
              />
              <p style={{ marginBottom: '8px', fontSize: '0.875rem' }}>
                Can't scan? Enter this code manually:
              </p>
              <code className="mfa-secret">{enrollment.totp.secret}</code>
            </div>

            <form onSubmit={handleVerifyEnrollment}>
              <div className="form-group">
                <label htmlFor="verificationCode">Verification Code</label>
                <input
                  type="text"
                  id="verificationCode"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  autoComplete="one-time-code"
                  style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em' }}
                />
                <small className="form-hint">
                  Enter the 6-digit code from your authenticator app
                </small>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={cancelEnrollment}
                >
                  Cancel
                </button>
                <LoadingButton
                  type="submit"
                  className="btn btn-primary"
                  loading={loading}
                  loadingText="Verifying..."
                >
                  Verify & Enable
                </LoadingButton>
              </div>
            </form>
          </div>
        )}

        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            className="btn-link"
            onClick={() => navigate('/profile')}
          >
            ← Back to Profile
          </button>
        </div>
      </div>
    </div>
  );
}
