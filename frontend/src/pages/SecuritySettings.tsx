import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { api, ApiError } from '../services/api';
import { Spinner, LoadingButton } from '../components/Spinner';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

interface SecurityPreferences {
  emailNotifications: boolean;
  smsNotifications: boolean;
  notifyOnLogin: boolean;
  notifyOnPasswordChange: boolean;
  notifyOnEmailChange: boolean;
  notifyOnNewDevice: boolean;
}

interface LinkedIdentity {
  id: string;
  provider: string;
  createdAt: string;
  lastSignInAt: string;
  identity_data: {
    email?: string;
    name?: string;
    avatar?: string;
  };
}

interface SecurityEvent {
  id: string;
  event_type: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  location?: {
    city?: string;
    country?: string;
  };
}

interface RecoveryStatus {
  phone?: string;
  verified: boolean;
}

export function SecuritySettings() {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const confirmDialog = useConfirm();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<SecurityPreferences>({
    emailNotifications: true,
    smsNotifications: false,
    notifyOnLogin: false,
    notifyOnPasswordChange: true,
    notifyOnEmailChange: true,
    notifyOnNewDevice: true,
  });
  const [identities, setIdentities] = useState<LinkedIdentity[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [recoveryStatus, setRecoveryStatus] = useState<RecoveryStatus>({ verified: false });
  const [activeTab, setActiveTab] = useState<'preferences' | 'identities' | 'activity' | 'recovery'>('preferences');

  useEffect(() => {
    if (isAuthenticated) {
      loadSecurityData();
    }
  }, [isAuthenticated]);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      const [prefsResponse, identitiesResponse, eventsResponse] = await Promise.all([
        api.get<{ preferences: SecurityPreferences }>('/auth/security/preferences').catch(() => ({ preferences })),
        api.get<{ identities: LinkedIdentity[] }>('/auth/identities').catch(() => ({ identities: [] })),
        api.get<SecurityEvent[]>('/auth/security/events').catch(() => []),
      ]);

      setPreferences(prefsResponse.preferences);
      setIdentities(identitiesResponse.identities);
      setSecurityEvents(Array.isArray(eventsResponse) ? eventsResponse : []);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to load security data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      await api.put('/auth/security/preferences', preferences);
      showToast('Security preferences saved', 'success');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to save preferences';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePreference = (key: keyof SecurityPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleLinkIdentity = async (provider: string) => {
    try {
      const response = await api.post<{ url: string }>('/auth/identities/link', { provider });
      // Redirect to OAuth provider
      window.location.href = response.url;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to link identity';
      showToast(message, 'error');
    }
  };

  const handleUnlinkIdentity = async (identityId: string) => {
    const confirmed = await confirmDialog({
      title: 'Unlink Account',
      message: 'Are you sure you want to unlink this account?',
      variant: 'warning',
      confirmText: 'Unlink',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/auth/identities/${identityId}`);
      showToast('Account unlinked', 'success');
      setIdentities(prev => prev.filter(i => i.id !== identityId));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to unlink account';
      showToast(message, 'error');
    }
  };

  const handleSetRecoveryPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryPhone || recoveryPhone.length < 10) {
      showToast('Please enter a valid phone number', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.post('/auth/recovery/phone', { phone: recoveryPhone });
      showToast('Verification code sent to your phone', 'success');
      setRecoveryStatus({ phone: recoveryPhone, verified: false });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to set recovery phone';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const formatEventType = (type: string) => {
    const labels: Record<string, string> = {
      login: 'Sign In',
      logout: 'Sign Out',
      password_changed: 'Password Changed',
      email_changed: 'Email Changed',
      mfa_enabled: 'MFA Enabled',
      mfa_disabled: 'MFA Disabled',
      failed_login: 'Failed Login',
      identity_linked: 'Account Linked',
      identity_unlinked: 'Account Unlinked',
    };
    return labels[type] || type.replace(/_/g, ' ');
  };

  const getEventIcon = (type: string) => {
    const icons: Record<string, string> = {
      login: '🔓',
      logout: '🚪',
      password_changed: '🔑',
      email_changed: '📧',
      mfa_enabled: '🔐',
      mfa_disabled: '⚠️',
      failed_login: '❌',
      identity_linked: '🔗',
      identity_unlinked: '🔓',
    };
    return icons[type] || '📋';
  };

  const getProviderIcon = (provider: string) => {
    const icons: Record<string, string> = {
      google: '🔵',
      github: '⚫',
      facebook: '🔷',
      apple: '🍎',
    };
    return icons[provider.toLowerCase()] || '🔗';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
        <Spinner size={48} />
        <p>Loading security settings...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>Security Settings</h1>
        <p style={{ marginTop: '8px', color: '#94a3b8' }}>
          Manage your account security, linked accounts, and notification preferences
        </p>
      </div>

      {/* Quick Links */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <Link
          to="/security/mfa"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#6366f1', color: '#fff', borderRadius: '9px', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}
        >
          🔐 Manage 2FA
        </Link>
        <Link
          to="/profile"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9px', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}
        >
          👤 Profile Settings
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px', display: 'flex', gap: '4px' }}>
        {(['preferences', 'identities', 'activity', 'recovery'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              color: activeTab === tab ? '#818cf8' : '#94a3b8',
              borderBottom: activeTab === tab ? '2px solid #818cf8' : '2px solid transparent',
              marginBottom: '-1px',
              transition: 'color 0.15s',
            }}
          >
            {tab === 'preferences' && '🔔 Notifications'}
            {tab === 'identities' && '🔗 Linked Accounts'}
            {tab === 'activity' && '📋 Activity Log'}
            {tab === 'recovery' && '📱 Recovery'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ background: '#131625', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        {/* Notification Preferences */}
        {activeTab === 'preferences' && (
          <div style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#e2e8f0', marginTop: 0, marginBottom: '8px' }}>Security Notifications</h3>
            <p style={{ color: '#94a3b8', marginBottom: '24px', marginTop: 0 }}>
              Choose how you want to be notified about security events
            </p>

            <div>
              {/* Notification Channels */}
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0', marginBottom: '12px', marginTop: 0 }}>Notification Channels</h4>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', cursor: 'pointer' }}>
                  <span style={{ color: '#e2e8f0', fontSize: '14px' }}>Email notifications</span>
                  <input type="checkbox" checked={preferences.emailNotifications} onChange={() => handleTogglePreference('emailNotifications')} style={{ width: '18px', height: '18px', accentColor: '#818cf8', cursor: 'pointer' }} />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', cursor: 'pointer' }}>
                  <span style={{ color: '#e2e8f0', fontSize: '14px' }}>SMS notifications</span>
                  <input type="checkbox" checked={preferences.smsNotifications} onChange={() => handleTogglePreference('smsNotifications')} style={{ width: '18px', height: '18px', accentColor: '#818cf8', cursor: 'pointer' }} />
                </label>
              </div>

              {/* Event Types */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0', marginBottom: '12px', marginTop: 0 }}>Notify me when...</h4>
                {[
                  { key: 'notifyOnLogin' as const, label: 'New sign-in detected', sub: 'Get alerted when someone signs into your account' },
                  { key: 'notifyOnPasswordChange' as const, label: 'Password changed', sub: 'Important security alert' },
                  { key: 'notifyOnEmailChange' as const, label: 'Email address changed', sub: 'Verify email changes' },
                  { key: 'notifyOnNewDevice' as const, label: 'New device detected', sub: 'Alert when signing in from an unrecognized device' },
                ].map(({ key, label, sub }, i, arr) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', cursor: 'pointer' }}>
                    <div>
                      <span style={{ display: 'block', color: '#e2e8f0', fontSize: '14px' }}>{label}</span>
                      <span style={{ color: '#64748b', fontSize: '12px' }}>{sub}</span>
                    </div>
                    <input type="checkbox" checked={preferences[key]} onChange={() => handleTogglePreference(key)} style={{ width: '18px', height: '18px', accentColor: '#818cf8', cursor: 'pointer', flexShrink: 0, marginLeft: '16px' }} />
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <LoadingButton
                onClick={handleSavePreferences}
                loading={saving}
                className="btn btn-primary"
              >
                Save Preferences
              </LoadingButton>
            </div>
          </div>
        )}

        {/* Linked Identities */}
        {activeTab === 'identities' && (
          <div style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#e2e8f0', marginTop: 0, marginBottom: '8px' }}>Linked Accounts</h3>
            <p style={{ color: '#94a3b8', marginBottom: '24px', marginTop: 0 }}>
              Connect social accounts for easier sign-in
            </p>

            {identities.length > 0 && (
              <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {identities.map((identity) => (
                  <div key={identity.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', background: '#181b2e' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '24px' }}>{getProviderIcon(identity.provider)}</span>
                      <div>
                        <div style={{ fontWeight: '600', color: '#e2e8f0', textTransform: 'capitalize' }}>{identity.provider}</div>
                        <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                          {identity.identity_data?.email || identity.identity_data?.name || 'Connected'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnlinkIdentity(identity.id)}
                      style={{ padding: '6px 14px', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '7px', background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                    >
                      Unlink
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0', marginBottom: '12px', marginTop: 0 }}>Add account</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {['google', 'github', 'facebook', 'apple'].map((provider) => {
                  const isLinked = identities.some(i => i.provider.toLowerCase() === provider);
                  return (
                    <button
                      key={provider}
                      onClick={() => !isLinked && handleLinkIdentity(provider)}
                      disabled={isLinked}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', background: isLinked ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)', color: isLinked ? '#475569' : '#e2e8f0', cursor: isLinked ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '500' }}
                    >
                      <span style={{ fontSize: '20px' }}>{getProviderIcon(provider)}</span>
                      <span style={{ textTransform: 'capitalize' }}>{provider}</span>
                      {isLinked && <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#34d399' }}>✓ Linked</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Security Activity Log */}
        {activeTab === 'activity' && (
          <div style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#e2e8f0', marginTop: 0, marginBottom: '8px' }}>Recent Security Activity</h3>
            <p style={{ color: '#94a3b8', marginBottom: '24px', marginTop: 0 }}>
              Review recent security events on your account
            </p>

            {securityEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                <p>No recent security events</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {securityEvents.slice(0, 20).map((event) => (
                  <div key={event.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '14px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', background: '#181b2e' }}>
                    <span style={{ fontSize: '22px', flexShrink: 0 }}>{getEventIcon(event.event_type)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', color: '#e2e8f0', fontSize: '14px' }}>{formatEventType(event.event_type)}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                        {new Date(event.created_at).toLocaleString()}
                      </div>
                      {event.ip_address && (
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          IP: {event.ip_address}
                          {event.location?.city && ` • ${event.location.city}, ${event.location.country}`}
                        </div>
                      )}
                    </div>
                    {event.event_type === 'failed_login' && (
                      <span style={{ padding: '3px 10px', fontSize: '11px', background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '999px', flexShrink: 0, fontWeight: '600' }}>
                        Failed
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recovery Phone */}
        {activeTab === 'recovery' && (
          <div style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#e2e8f0', marginTop: 0, marginBottom: '8px' }}>Account Recovery</h3>
            <p style={{ color: '#94a3b8', marginBottom: '24px', marginTop: 0 }}>
              Set up a recovery phone number in case you lose access to your email
            </p>

            {recoveryStatus.phone && recoveryStatus.verified ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '10px', marginBottom: '24px' }}>
                <span style={{ fontSize: '24px' }}>✅</span>
                <div>
                  <div style={{ fontWeight: '600', color: '#34d399', fontSize: '14px' }}>Recovery phone verified</div>
                  <div style={{ fontSize: '13px', color: '#6ee7b7', marginTop: '2px' }}>
                    {recoveryStatus.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSetRecoveryPhone} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#e2e8f0', marginBottom: '6px' }}>
                    Recovery Phone Number
                  </label>
                  <input
                    type="tel"
                    value={recoveryPhone}
                    onChange={(e) => setRecoveryPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                  <p style={{ marginTop: '6px', fontSize: '12px', color: '#64748b' }}>
                    We'll send a verification code to this number
                  </p>
                </div>
                <LoadingButton
                  type="submit"
                  loading={saving}
                  className="btn btn-primary"
                >
                  Set Recovery Phone
                </LoadingButton>
              </form>
            )}

            {/* Security Tips */}
            <div style={{ marginTop: '32px', padding: '16px 20px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px' }}>
              <h4 style={{ fontWeight: '600', color: '#a5b4fc', fontSize: '14px', marginBottom: '10px', marginTop: 0 }}>💡 Security Tips</h4>
              <ul style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.8', paddingLeft: '16px', margin: 0 }}>
                <li>Enable two-factor authentication for extra security</li>
                <li>Use a unique, strong password</li>
                <li>Keep your recovery phone number up to date</li>
                <li>Review your security activity regularly</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SecuritySettings;
