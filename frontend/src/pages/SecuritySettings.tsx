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
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Security Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage your account security, linked accounts, and notification preferences
        </p>
      </div>

      {/* Quick Links */}
      <div className="mb-6 flex gap-4">
        <Link
          to="/security/mfa"
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
        >
          🔐 Manage 2FA
        </Link>
        <Link
          to="/profile"
          className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          👤 Profile Settings
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          {(['preferences', 'identities', 'activity', 'recovery'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'preferences' && '🔔 Notifications'}
              {tab === 'identities' && '🔗 Linked Accounts'}
              {tab === 'activity' && '📋 Activity Log'}
              {tab === 'recovery' && '📱 Recovery'}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Notification Preferences */}
        {activeTab === 'preferences' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Security Notifications</h3>
            <p className="text-gray-600 mb-6">
              Choose how you want to be notified about security events
            </p>

            <div className="space-y-4">
              {/* Notification Channels */}
              <div className="border-b pb-4 mb-4">
                <h4 className="font-medium mb-3">Notification Channels</h4>
                <label className="flex items-center justify-between py-2">
                  <span>Email notifications</span>
                  <input
                    type="checkbox"
                    checked={preferences.emailNotifications}
                    onChange={() => handleTogglePreference('emailNotifications')}
                    className="w-5 h-5 text-teal-600 rounded"
                  />
                </label>
                <label className="flex items-center justify-between py-2">
                  <span>SMS notifications</span>
                  <input
                    type="checkbox"
                    checked={preferences.smsNotifications}
                    onChange={() => handleTogglePreference('smsNotifications')}
                    className="w-5 h-5 text-teal-600 rounded"
                  />
                </label>
              </div>

              {/* Event Types */}
              <div>
                <h4 className="font-medium mb-3">Notify me when...</h4>
                <label className="flex items-center justify-between py-2 border-b">
                  <div>
                    <span className="block">New sign-in detected</span>
                    <span className="text-sm text-gray-500">Get alerted when someone signs into your account</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.notifyOnLogin}
                    onChange={() => handleTogglePreference('notifyOnLogin')}
                    className="w-5 h-5 text-teal-600 rounded"
                  />
                </label>
                <label className="flex items-center justify-between py-2 border-b">
                  <div>
                    <span className="block">Password changed</span>
                    <span className="text-sm text-gray-500">Important security alert</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.notifyOnPasswordChange}
                    onChange={() => handleTogglePreference('notifyOnPasswordChange')}
                    className="w-5 h-5 text-teal-600 rounded"
                  />
                </label>
                <label className="flex items-center justify-between py-2 border-b">
                  <div>
                    <span className="block">Email address changed</span>
                    <span className="text-sm text-gray-500">Verify email changes</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.notifyOnEmailChange}
                    onChange={() => handleTogglePreference('notifyOnEmailChange')}
                    className="w-5 h-5 text-teal-600 rounded"
                  />
                </label>
                <label className="flex items-center justify-between py-2">
                  <div>
                    <span className="block">New device detected</span>
                    <span className="text-sm text-gray-500">Alert when signing in from an unrecognized device</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.notifyOnNewDevice}
                    onChange={() => handleTogglePreference('notifyOnNewDevice')}
                    className="w-5 h-5 text-teal-600 rounded"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t">
              <LoadingButton
                onClick={handleSavePreferences}
                loading={saving}
                className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                Save Preferences
              </LoadingButton>
            </div>
          </div>
        )}

        {/* Linked Identities */}
        {activeTab === 'identities' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Linked Accounts</h3>
            <p className="text-gray-600 mb-6">
              Connect social accounts for easier sign-in
            </p>

            {/* Existing Identities */}
            {identities.length > 0 && (
              <div className="mb-6 space-y-3">
                {identities.map((identity) => (
                  <div key={identity.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getProviderIcon(identity.provider)}</span>
                      <div>
                        <div className="font-medium capitalize">{identity.provider}</div>
                        <div className="text-sm text-gray-500">
                          {identity.identity_data?.email || identity.identity_data?.name || 'Connected'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnlinkIdentity(identity.id)}
                      className="px-3 py-1 text-red-600 border border-red-600 rounded hover:bg-red-50"
                    >
                      Unlink
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Identity */}
            <div>
              <h4 className="font-medium mb-3">Add account</h4>
              <div className="grid grid-cols-2 gap-3">
                {['google', 'github', 'facebook', 'apple'].map((provider) => {
                  const isLinked = identities.some(i => i.provider.toLowerCase() === provider);
                  return (
                    <button
                      key={provider}
                      onClick={() => !isLinked && handleLinkIdentity(provider)}
                      disabled={isLinked}
                      className={`flex items-center gap-3 p-4 border rounded-lg ${
                        isLinked
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-xl">{getProviderIcon(provider)}</span>
                      <span className="capitalize">{provider}</span>
                      {isLinked && <span className="ml-auto text-sm">✓ Linked</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Security Activity Log */}
        {activeTab === 'activity' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Security Activity</h3>
            <p className="text-gray-600 mb-6">
              Review recent security events on your account
            </p>

            {securityEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No recent security events</p>
              </div>
            ) : (
              <div className="space-y-3">
                {securityEvents.slice(0, 20).map((event) => (
                  <div key={event.id} className="flex items-start gap-4 p-4 border rounded-lg">
                    <span className="text-2xl">{getEventIcon(event.event_type)}</span>
                    <div className="flex-1">
                      <div className="font-medium">{formatEventType(event.event_type)}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(event.created_at).toLocaleString()}
                      </div>
                      {event.ip_address && (
                        <div className="text-sm text-gray-500">
                          IP: {event.ip_address}
                          {event.location?.city && ` • ${event.location.city}, ${event.location.country}`}
                        </div>
                      )}
                    </div>
                    {event.event_type === 'failed_login' && (
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
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
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Account Recovery</h3>
            <p className="text-gray-600 mb-6">
              Set up a recovery phone number in case you lose access to your email
            </p>

            {recoveryStatus.phone && recoveryStatus.verified ? (
              <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
                <span className="text-2xl">✅</span>
                <div>
                  <div className="font-medium text-green-900">Recovery phone verified</div>
                  <div className="text-sm text-green-700">
                    {recoveryStatus.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSetRecoveryPhone} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recovery Phone Number
                  </label>
                  <input
                    type="tel"
                    value={recoveryPhone}
                    onChange={(e) => setRecoveryPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    We'll send a verification code to this number
                  </p>
                </div>
                <LoadingButton
                  type="submit"
                  loading={saving}
                  className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  Set Recovery Phone
                </LoadingButton>
              </form>
            )}

            {/* Security Tips */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">💡 Security Tips</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Enable two-factor authentication for extra security</li>
                <li>• Use a unique, strong password</li>
                <li>• Keep your recovery phone number up to date</li>
                <li>• Review your security activity regularly</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SecuritySettings;
