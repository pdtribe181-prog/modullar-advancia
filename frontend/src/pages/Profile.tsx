import React, { CSSProperties, useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { api, ApiError } from '../services/api';
import { Spinner, LoadingButton } from '../components/Spinner';
import { useToast } from '../components/Toast';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  stripe_customer_id: string | null;
  created_at: string;
}

export default function Profile() {
  useAuth(); // Ensures user is authenticated
  const { showToast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
  });

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get<UserProfile>('/auth/profile');
      setProfile(response);
      setFormData({
        full_name: response.full_name || '',
        phone: response.phone || '',
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load profile';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await api.put<UserProfile>('/auth/profile', formData);
      setProfile(response);
      showToast('Profile updated successfully', 'success');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update profile';
      setError(message);
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
        <Spinner size={48} />
        <p style={{ color: '#94a3b8' }}>Loading profile...</p>
      </div>
    );
  }

  const card: CSSProperties = { background: '#131625', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', overflow: 'hidden', marginBottom: '24px' };
  const cardHeader: CSSProperties = { padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' };
  const cardBody: CSSProperties = { padding: '24px' };
  const label: CSSProperties = { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.02em' };
  const input: CSSProperties = { width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9px', color: '#e2e8f0', fontSize: '0.93rem', boxSizing: 'border-box' };
  const inputDisabled: CSSProperties = { ...input, opacity: 0.5, cursor: 'not-allowed' };
  const hint: CSSProperties = { fontSize: '0.78rem', color: '#475569', marginTop: '4px' };
  const row: CSSProperties = { marginBottom: '20px' };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#e2e8f0', marginBottom: '6px' }}>Profile Settings</h1>
        <p style={{ color: '#94a3b8' }}>Manage your account information</p>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <div style={card}>
        <div style={cardHeader}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>Account Information</h2>
        </div>
        <form onSubmit={handleSubmit} style={cardBody}>
          <div style={row}>
            <label htmlFor="email" style={label}>Email Address</label>
            <input type="email" id="email" value={profile?.email || ''} disabled style={inputDisabled} />
            <p style={hint}>Email cannot be changed</p>
          </div>

          <div style={row}>
            <label htmlFor="full_name" style={label}>Full Name</label>
            <input
              type="text" id="full_name" name="full_name"
              value={formData.full_name} onChange={handleChange}
              style={input} placeholder="Enter your full name"
            />
          </div>

          <div style={row}>
            <label htmlFor="phone" style={label}>Phone Number</label>
            <input
              type="tel" id="phone" name="phone"
              value={formData.phone} onChange={handleChange}
              style={input} placeholder="+1 (555) 000-0000"
            />
          </div>

          <div style={row}>
            <label style={label}>Account Role</label>
            <span style={{ display: 'inline-block', padding: '4px 14px', fontSize: '0.82rem', fontWeight: 700, borderRadius: '999px', background: 'rgba(129,140,248,0.15)', color: '#a5b4fc', border: '1px solid rgba(129,140,248,0.3)' }}>
              {profile?.role || 'user'}
            </span>
          </div>

          {profile?.stripe_customer_id && (
            <div style={row}>
              <label style={label}>Payment Profile</label>
              <p style={{ color: '#64748b', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                Stripe: {profile.stripe_customer_id.slice(0, 20)}…
              </p>
            </div>
          )}

          <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <LoadingButton type="submit" loading={saving} loadingText="Saving…" className="btn btn-primary btn-full">
              Save Changes
            </LoadingButton>
          </div>
        </form>
      </div>

      <div style={card}>
        <div style={cardHeader}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>Account Details</h2>
        </div>
        <div style={cardBody}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Account Created</span>
              <span style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>User ID</span>
              <span style={{ fontSize: '0.85rem', color: '#e2e8f0', fontFamily: 'monospace' }}>
                {profile?.id?.slice(0, 8)}…
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
