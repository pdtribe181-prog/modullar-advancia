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
      console.error('Failed to load appointments');
    }
  }

  async function loadEarnings() {
    try {
      const data = await api.get<Earnings>('/provider/earnings?period=30');
      setEarnings(data);
    } catch (err) {
      console.error('Failed to load earnings');
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

  function getStatusColor(status: string) {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  if (loading) {
    return (
      <div className="p-6" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px' }}>
        <Spinner size={48} />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Provider Dashboard</h1>
        <div className="bg-yellow-100 text-yellow-800 p-4 rounded">
          {error || 'You need to register as a provider to access this dashboard.'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Provider Dashboard</h1>
        <span className="text-gray-600">{provider.business_name}</span>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
          {error}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-gray-500 text-sm">Upcoming Appointments</h3>
          <p className="text-3xl font-bold">{appointments.filter(a => ['scheduled', 'confirmed'].includes(a.status)).length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-gray-500 text-sm">This Month's Earnings</h3>
          <p className="text-3xl font-bold">${earnings?.totalEarnings || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-gray-500 text-sm">Available Balance</h3>
          <p className="text-3xl font-bold">${earnings?.stripeBalance?.available || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('appointments')}
            className={`pb-2 px-1 ${activeTab === 'appointments' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
          >
            Appointments
          </button>
          <button
            onClick={() => setActiveTab('earnings')}
            className={`pb-2 px-1 ${activeTab === 'earnings' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
          >
            Earnings
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2 px-1 ${activeTab === 'profile' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
          >
            Profile
          </button>
        </nav>
      </div>

      {/* Appointments Tab */}
      {activeTab === 'appointments' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Upcoming Appointments</h2>
          {appointments.length === 0 ? (
            <p className="text-gray-500">No upcoming appointments</p>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Time</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Patient</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Reason</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {appointments.map((apt) => (
                    <tr key={apt.id}>
                      <td className="px-4 py-3 text-sm">{formatDate(apt.appointment_date)}</td>
                      <td className="px-4 py-3 text-sm">{apt.appointment_time}</td>
                      <td className="px-4 py-3 text-sm">
                        <div>{apt.patient?.name || 'Unknown'}</div>
                        <div className="text-gray-500 text-xs">{apt.patient?.email}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">{apt.reason || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(apt.status)}`}>
                          {apt.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          {apt.status === 'scheduled' && (
                            <button
                              onClick={() => handleConfirm(apt.id)}
                              className="text-green-600 hover:text-green-800"
                            >
                              Confirm
                            </button>
                          )}
                          {['scheduled', 'confirmed'].includes(apt.status) && (
                            <>
                              <button
                                onClick={() => setShowNotesModal(apt.id)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                Complete
                              </button>
                              <button
                                onClick={() => setShowCancelModal(apt.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                Cancel
                              </button>
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
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ background: 'white', borderRadius: '12px', padding: '24px', maxWidth: '420px', width: '100%' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Complete Appointment</h3>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>Notes (optional)</label>
                <textarea
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Enter any notes for this appointment..."
                  rows={4}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '16px', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={() => { setShowNotesModal(null); setNotesInput(''); }} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={() => handleComplete(showNotesModal)} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer', fontWeight: '500' }}>Mark Complete</button>
                </div>
              </div>
            </div>
          )}

          {/* Cancel Appointment Modal */}
          {showCancelModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ background: 'white', borderRadius: '12px', padding: '24px', maxWidth: '420px', width: '100%' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#dc2626' }}>Cancel Appointment</h3>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>Reason for cancellation *</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Enter reason for cancellation..."
                  rows={3}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '16px', resize: 'vertical' }}
                  required
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={() => { setShowCancelModal(null); setCancelReason(''); }} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer' }}>Back</button>
                  <button onClick={() => handleCancel(showCancelModal)} disabled={!cancelReason.trim()} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: cancelReason.trim() ? '#dc2626' : '#d1d5db', color: 'white', cursor: cancelReason.trim() ? 'pointer' : 'not-allowed', fontWeight: '500' }}>Cancel Appointment</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Earnings Tab */}
      {activeTab === 'earnings' && earnings && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Earnings Summary (Last 30 Days)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Completed Appointments</h3>
              <p className="text-4xl font-bold text-green-600">{earnings.completedAppointments}</p>
              <p className="text-gray-500 mt-2">Total earnings: ${earnings.totalEarnings}</p>
            </div>
            {earnings.stripeBalance && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium mb-4">Stripe Balance</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Available:</span>
                    <span className="font-bold text-green-600">${earnings.stripeBalance.available}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Pending:</span>
                    <span className="font-bold">${earnings.stripeBalance.pending}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!provider.stripe_onboarding_complete && (
            <div className="mt-4 bg-yellow-100 text-yellow-800 p-4 rounded">
              Complete Stripe onboarding to receive payments directly to your bank account.
              <a href="/connect/onboard" className="ml-2 text-blue-600 hover:underline">
                Start Onboarding
              </a>
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
      alert(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Provider Profile</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-blue-600 hover:text-blue-800"
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Business Name</label>
            <input
              type="text"
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Specialty</label>
            <input
              type="text"
              value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Consultation Fee ($)</label>
            <input
              type="number"
              value={form.consultationFee}
              onChange={(e) => setForm({ ...form, consultationFee: Number(e.target.value) })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={4}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="border px-4 py-2 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <span className="text-gray-500">Business Name:</span>
            <span className="ml-2 font-medium">{provider.business_name}</span>
          </div>
          <div>
            <span className="text-gray-500">Specialty:</span>
            <span className="ml-2 font-medium">{provider.specialty}</span>
          </div>
          <div>
            <span className="text-gray-500">Phone:</span>
            <span className="ml-2">{provider.phone || 'Not set'}</span>
          </div>
          <div>
            <span className="text-gray-500">Email:</span>
            <span className="ml-2">{provider.email || 'Not set'}</span>
          </div>
          <div>
            <span className="text-gray-500">Consultation Fee:</span>
            <span className="ml-2 font-medium">${provider.consultation_fee}</span>
          </div>
          <div>
            <span className="text-gray-500">Bio:</span>
            <p className="mt-1">{provider.bio || 'No bio added'}</p>
          </div>
          <div>
            <span className="text-gray-500">Stripe Status:</span>
            <span className={`ml-2 ${provider.stripe_onboarding_complete ? 'text-green-600' : 'text-yellow-600'}`}>
              {provider.stripe_onboarding_complete ? 'Connected' : 'Not Connected'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
