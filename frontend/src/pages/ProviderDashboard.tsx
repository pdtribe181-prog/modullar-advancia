import { useState, useEffect } from 'react';
import { api, ApiError } from '../services/api';
import { Spinner } from '../components/Spinner';
import { useToast } from '../components/Toast';

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  reason: string;
  status: string;
  payment_status: string;
  patient: {
    id: string;
    name: string;
    email: string;
  };
}

interface Provider {
  id: string;
  business_name: string;
  specialty: string;
  phone: string;
  email: string;
  consultation_fee: number;
  bio: string;
  stripe_onboarding_complete: boolean;
}

interface Earnings {
  period: number;
  completedAppointments: number;
  totalEarnings: number;
  stripeBalance: {
    available: number;
    pending: number;
    currency: string;
  } | null;
}

export default function ProviderDashboard() {
  const { showToast } = useToast();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [activeTab, setActiveTab] = useState<'appointments' | 'profile' | 'earnings'>('appointments');
  const [loading, setLoading] = useState(true);
  const [showNotesModal, setShowNotesModal] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadProvider();
    loadAppointments();
    loadEarnings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProvider() {
    try {
      const data = await api.get<{ provider: Provider }>('/provider/me');
      setProvider(data.provider);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load provider';
      if (message.includes('not found')) {
        setError('You are not registered as a provider');
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadAppointments() {
    try {
      const data = await api.get<{ appointments: Appointment[] }>('/provider/appointments?upcoming=true');
      setAppointments(data.appointments);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to load appointments');
    }
  }

  async function loadEarnings() {
    try {
      const data = await api.get<Earnings>('/provider/earnings?period=30');
      setEarnings(data);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to load earnings');
    }
  }

  async function handleConfirm(id: string) {
    try {
      await api.post(`/provider/appointments/${id}/confirm`, {});
      showToast('Appointment confirmed', 'success');
      loadAppointments();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to confirm';
      setError(message);
      showToast(message, 'error');
    }
  }

  async function handleComplete(id: string) {
    try {
      await api.post(`/provider/appointments/${id}/complete`, { notes: notesInput });
      showToast('Appointment marked as complete', 'success');
      setShowNotesModal(null);
      setNotesInput('');
      loadAppointments();
      loadEarnings();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to complete';
      setError(message);
      showToast(message, 'error');
    }
  }

  async function handleCancel(id: string) {
    if (!cancelReason.trim()) return;
    try {
      await api.post(`/provider/appointments/${id}/cancel`, { reason: cancelReason });
      showToast('Appointment cancelled', 'success');
      setShowCancelModal(null);
      setCancelReason('');
      loadAppointments();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to cancel';
      setError(message);
      showToast(message, 'error');
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  function getStatusColor(status: string): React.CSSProperties {
    const map: Record<string, React.CSSProperties> = {
      scheduled: { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' },
      confirmed:  { background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' },
      completed:  { background: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.2)' },
      cancelled:  { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' },
    };
    const s = map[status] || { background: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.2)' };
    return { ...s, display: 'inline-flex', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '600', textTransform: 'capitalize' };
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px' }}>
        <Spinner size={48} />
        <p style={{ color: '#94a3b8' }}>Loading dashboard...</p>
      </div>
    );
  }

  if (!provider) {
    return (
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#e2e8f0', marginBottom: '20px' }}>Provider Dashboard</h1>
        <div style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', color: '#fde047', padding: '16px', borderRadius: '10px' }}>
          {error || 'You need to register as a provider to access this dashboard.'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>Provider Dashboard</h1>
        <span style={{ color: '#94a3b8', fontSize: '14px' }}>{provider.business_name}</span>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <div style={{ background: '#131625', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', borderLeft: '4px solid #818cf8', padding: '18px' }}>
          <h3 style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 8px' }}>Upcoming Appointments</h3>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>{appointments.filter(a => ['scheduled', 'confirmed'].includes(a.status)).length}</p>
        </div>
        <div style={{ background: '#131625', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', borderLeft: '4px solid #34d399', padding: '18px' }}>
          <h3 style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 8px' }}>This Month's Earnings</h3>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>${earnings?.totalEarnings || 0}</p>
        </div>
        <div style={{ background: '#131625', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', borderLeft: '4px solid #6366f1', padding: '18px' }}>
          <h3 style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 8px' }}>Available Balance</h3>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#e2e8f0', margin: 0 }}>${earnings?.stripeBalance?.available || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px', display: 'flex', gap: '4px' }}>
        {(['appointments', 'earnings', 'profile'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: activeTab === tab ? '#818cf8' : '#94a3b8', borderBottom: activeTab === tab ? '2px solid #818cf8' : '2px solid transparent', marginBottom: '-1px', textTransform: 'capitalize' }}>
            {tab === 'appointments' ? 'Appointments' : tab === 'earnings' ? 'Earnings' : 'Profile'}
          </button>
        ))}
      </div>

      {/* Appointments Tab */}
      {activeTab === 'appointments' && (
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#e2e8f0', marginBottom: '16px' }}>Upcoming Appointments</h2>
          {appointments.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No upcoming appointments</p>
          ) : (
            <div style={{ background: '#131625', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#181b2e' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontSize: '12px', fontWeight: '600', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Date</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontSize: '12px', fontWeight: '600', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Time</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontSize: '12px', fontWeight: '600', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Patient</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontSize: '12px', fontWeight: '600', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Reason</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontSize: '12px', fontWeight: '600', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontSize: '12px', fontWeight: '600', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((apt) => (
                    <tr key={apt.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#e2e8f0' }}>{formatDate(apt.appointment_date)}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#e2e8f0' }}>{apt.appointment_time}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                        <div style={{ color: '#e2e8f0' }}>{apt.patient?.name || 'Unknown'}</div>
                        <div style={{ color: '#64748b', fontSize: '11px' }}>{apt.patient?.email}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#94a3b8' }}>{apt.reason || '-'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={getStatusColor(apt.status)}>{apt.status}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {apt.status === 'scheduled' && (
                            <button onClick={() => handleConfirm(apt.id)} style={{ color: '#34d399', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Confirm</button>
                          )}
                          {['scheduled', 'confirmed'].includes(apt.status) && (
                            <>
                              <button onClick={() => setShowNotesModal(apt.id)} style={{ color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Complete</button>
                              <button onClick={() => setShowCancelModal(apt.id)} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Cancel</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Complete Appointment Modal */}
          {showNotesModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ background: '#131625', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px', padding: '28px', maxWidth: '420px', width: '100%' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#818cf8', marginTop: 0 }}>Complete Appointment</h3>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px', color: '#e2e8f0' }}>Notes (optional)</label>
                <textarea
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Enter any notes for this appointment..."
                  rows={4}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', marginBottom: '16px', resize: 'vertical', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={() => { setShowNotesModal(null); setNotesInput(''); }} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={() => handleComplete(showNotesModal)} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#6366f1', color: 'white', cursor: 'pointer', fontWeight: '500' }}>Mark Complete</button>
                </div>
              </div>
            </div>
          )}

          {/* Cancel Appointment Modal */}
          {showCancelModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ background: '#131625', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px', padding: '28px', maxWidth: '420px', width: '100%' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#f87171', marginTop: 0 }}>Cancel Appointment</h3>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px', color: '#e2e8f0' }}>Reason for cancellation *</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Enter reason for cancellation..."
                  rows={3}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', marginBottom: '16px', resize: 'vertical', boxSizing: 'border-box' }}
                  required
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={() => { setShowCancelModal(null); setCancelReason(''); }} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', cursor: 'pointer' }}>Back</button>
                  <button onClick={() => handleCancel(showCancelModal)} disabled={!cancelReason.trim()} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: cancelReason.trim() ? '#ef4444' : '#374151', color: 'white', cursor: cancelReason.trim() ? 'pointer' : 'not-allowed', fontWeight: '500' }}>Cancel Appointment</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Earnings Tab */}
      {activeTab === 'earnings' && earnings && (
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#e2e8f0', marginBottom: '16px' }}>Earnings Summary (Last 30 Days)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div style={{ background: '#131625', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '500', color: '#e2e8f0', marginBottom: '16px', marginTop: 0 }}>Completed Appointments</h3>
              <p style={{ fontSize: '36px', fontWeight: '700', color: '#34d399', margin: 0 }}>{earnings.completedAppointments}</p>
              <p style={{ color: '#94a3b8', marginTop: '8px' }}>Total earnings: ${earnings.totalEarnings}</p>
            </div>
            {earnings.stripeBalance && (
              <div style={{ background: '#131625', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '500', color: '#e2e8f0', marginBottom: '16px', marginTop: 0 }}>Stripe Balance</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8', fontSize: '14px' }}>Available:</span>
                    <span style={{ fontWeight: '700', color: '#34d399' }}>${earnings.stripeBalance.available}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8', fontSize: '14px' }}>Pending:</span>
                    <span style={{ fontWeight: '700', color: '#e2e8f0' }}>${earnings.stripeBalance.pending}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!provider.stripe_onboarding_complete && (
            <div style={{ marginTop: '16px', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', color: '#fde047', padding: '14px 16px', borderRadius: '10px' }}>
              Complete Stripe onboarding to receive payments directly to your bank account.
              <a href="/connect/onboard" style={{ marginLeft: '8px', color: '#818cf8', textDecoration: 'underline' }}>Start Onboarding</a>
            </div>
          )}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <ProviderProfile provider={provider} onUpdate={loadProvider} />
      )}
    </div>
  );
}

function ProviderProfile({ provider, onUpdate }: { provider: Provider; onUpdate: () => void }) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    businessName: provider.business_name,
    specialty: provider.specialty,
    phone: provider.phone || '',
    email: provider.email || '',
    consultationFee: provider.consultation_fee,
    bio: provider.bio || '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    try {
      setSaving(true);
      await api.put('/provider/me', form);
      onUpdate();
      setEditing(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'An error occurred';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', fontSize: '14px', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#94a3b8' };

  return (
    <div style={{ background: '#131625', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', padding: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#e2e8f0', margin: 0 }}>Provider Profile</h2>
        {!editing && (
          <button onClick={() => setEditing(true)} style={{ color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>Edit</button>
        )}
      </div>

      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Business Name</label>
            <input type="text" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Specialty</label>
            <input type="text" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Consultation Fee ($)</label>
            <input type="number" value={form.consultationFee} onChange={(e) => setForm({ ...form, consultationFee: Number(e.target.value) })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Bio</label>
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={() => setEditing(false)} style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[
            { label: 'Business Name', value: provider.business_name, bold: true },
            { label: 'Specialty', value: provider.specialty, bold: true },
            { label: 'Phone', value: provider.phone || 'Not set' },
            { label: 'Email', value: provider.email || 'Not set' },
            { label: 'Consultation Fee', value: `$${provider.consultation_fee}`, bold: true },
          ].map(({ label, value, bold }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ color: '#64748b', fontSize: '13px', minWidth: '140px' }}>{label}:</span>
              <span style={{ color: bold ? '#e2e8f0' : '#94a3b8', fontWeight: bold ? '600' : '400' }}>{value}</span>
            </div>
          ))}
          <div>
            <span style={{ color: '#64748b', fontSize: '13px' }}>Bio:</span>
            <p style={{ color: '#94a3b8', marginTop: '6px', lineHeight: '1.6' }}>{provider.bio || 'No bio added'}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#64748b', fontSize: '13px' }}>Stripe Status:</span>
            <span style={{ color: provider.stripe_onboarding_complete ? '#34d399' : '#fde047', fontWeight: '500', fontSize: '13px' }}>
              {provider.stripe_onboarding_complete ? '✓ Connected' : '⚠ Not Connected'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
