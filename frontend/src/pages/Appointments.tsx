import React, { useState, useEffect } from 'react';
import { Elements, useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { api, ApiError } from '../services/api';
import { Spinner } from '../components/Spinner';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { stripePromise } from '../lib/stripe';

interface Provider {
  id: string;
  name: string;
  specialty: string;
  consultationFee: number;
  acceptsPayments: boolean;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface Appointment {
  id: string;
  date: string;
  time: string;
  duration: number;
  reason: string;
  status: string;
  paymentStatus: string;
  provider: {
    id: string;
    business_name: string;
    specialty: string;
  };
}

export default function Appointments() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [reason, setReason] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'list' | 'book' | 'payment'>('list');
  const [clientSecret, setClientSecret] = useState('');
  const { showToast } = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    loadProviders();
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProviders() {
    try {
      setLoadingProviders(true);
      const data = await api.get<{ providers: Provider[] }>('/appointments/providers');
      setProviders(data.providers);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load providers';
      if (import.meta.env.DEV) console.error('Failed to load providers:', err);
      showToast(message, 'error');
    } finally {
      setLoadingProviders(false);
    }
  }

  async function loadAppointments() {
    try {
      setLoadingAppointments(true);
      const data = await api.get<{ appointments: Appointment[] }>('/appointments/my-appointments?upcoming=true');
      setAppointments(data.appointments);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load appointments';
      if (import.meta.env.DEV) console.error('Failed to load appointments:', err);
      showToast(message, 'error');
    } finally {
      setLoadingAppointments(false);
    }
  }

  async function loadAvailability(providerId: string, date: string) {
    try {
      setLoading(true);
      const data = await api.get<{ slots: TimeSlot[] }>(
        `/appointments/providers/${providerId}/availability?date=${date}`
      );
      setSlots(data.slots);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load availability';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleProviderSelect(provider: Provider) {
    setSelectedProvider(provider);
    setStep('book');
    setSelectedDate('');
    setSlots([]);
    setSelectedSlot('');
  }

  function handleDateChange(date: string) {
    setSelectedDate(date);
    if (selectedProvider) {
      loadAvailability(selectedProvider.id, date);
    }
  }

  async function handleBookAppointment() {
    if (!selectedProvider || !selectedDate || !selectedSlot) return;

    try {
      setLoading(true);
      setError('');

      const data = await api.post<{
        appointment: { id: string };
        payment: { clientSecret: string; amount: number };
      }>('/appointments/book', {
        providerId: selectedProvider.id,
        date: selectedDate,
        time: selectedSlot,
        reason,
      });

      setClientSecret(data.payment.clientSecret);
      setStep('payment');
      showToast('Appointment created! Please complete payment.', 'success');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to book appointment';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelAppointment(id: string) {
    const confirmed = await confirm({
      title: 'Cancel Appointment',
      message: 'Are you sure you want to cancel this appointment? This action cannot be undone.',
      confirmText: 'Cancel Appointment',
      cancelText: 'Keep Appointment',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      await api.post(`/appointments/${id}/cancel`, { reason: 'Patient requested' });
      showToast('Appointment cancelled successfully', 'success');
      loadAppointments();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to cancel appointment';
      setError(message);
      showToast(message, 'error');
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
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
    const s = map[status] || map.completed;
    return { ...s, display: 'inline-flex', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', textTransform: 'capitalize' };
  }

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#e2e8f0', marginBottom: '28px' }}>Appointments</h1>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {step === 'list' && (
        <>
          {/* Upcoming Appointments */}
          <section style={{ marginBottom: '36px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#e2e8f0', marginBottom: '16px' }}>Your Upcoming Appointments</h2>
            {loadingAppointments ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94a3b8' }}>
                <Spinner size={20} /> Loading appointments...
              </div>
            ) : appointments.length === 0 ? (
              <p style={{ color: '#64748b' }}>No upcoming appointments</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {appointments.map((apt) => (
                  <div key={apt.id} style={{ background: '#131625', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                    <div>
                      <h3 style={{ fontWeight: '600', color: '#e2e8f0', margin: '0 0 4px' }}>{apt.provider?.business_name}</h3>
                      <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 4px' }}>{apt.provider?.specialty}</p>
                      <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>{formatDate(apt.date)} at {apt.time}</p>
                      {apt.reason && (
                        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>Reason: {apt.reason}</p>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                      <span style={getStatusColor(apt.status)}>{apt.status}</span>
                      {['scheduled', 'confirmed'].includes(apt.status) && (
                        <button onClick={() => handleCancelAppointment(apt.id)} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Cancel</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Book New Appointment */}
          <section>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#e2e8f0', marginBottom: '16px' }}>Book an Appointment</h2>
            {loadingProviders ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94a3b8' }}>
                <Spinner size={20} /> Loading providers...
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
                  {providers.map((provider) => (
                    <div key={provider.id} onClick={() => handleProviderSelect(provider)} style={{ background: '#131625', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '18px', cursor: 'pointer', transition: 'border-color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(129,140,248,0.6)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                    >
                      <h3 style={{ fontWeight: '600', color: '#e2e8f0', margin: '0 0 4px' }}>{provider.name}</h3>
                      <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 10px' }}>{provider.specialty}</p>
                      <p style={{ fontSize: '20px', fontWeight: '700', color: '#818cf8', margin: '0 0 8px' }}>${provider.consultationFee}</p>
                      {provider.acceptsPayments && (
                        <span style={{ fontSize: '12px', color: '#34d399' }}>✓ Online payments</span>
                      )}
                    </div>
                  ))}
                </div>
                {providers.length === 0 && (
                  <p style={{ color: '#64748b' }}>No providers available</p>
                )}
              </>
            )}
          </section>
        </>
      )}

      {step === 'book' && selectedProvider && (
        <div style={{ background: '#131625', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', padding: '28px' }}>
          <button onClick={() => setStep('list')} style={{ color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', marginBottom: '20px', padding: 0 }}>&larr; Back to providers</button>

          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#e2e8f0', marginBottom: '6px' }}>Book with {selectedProvider.name}</h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '4px' }}>{selectedProvider.specialty}</p>
          <p style={{ fontSize: '18px', fontWeight: '700', color: '#818cf8', marginBottom: '24px' }}>Fee: ${selectedProvider.consultationFee}</p>

          {/* Date Selection */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#94a3b8', marginBottom: '8px' }}>Select Date</label>
            <input type="date" min={today} value={selectedDate} onChange={(e) => handleDateChange(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', fontSize: '14px', width: '100%', boxSizing: 'border-box' }} />
          </div>

          {/* Time Slots */}
          {selectedDate && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#94a3b8', marginBottom: '10px' }}>Select Time</label>
              {loading ? (
                <p style={{ color: '#64748b' }}>Loading available times...</p>
              ) : slots.length === 0 ? (
                <p style={{ color: '#64748b' }}>No available slots for this date</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {slots.map((slot) => (
                    <button key={slot.time} onClick={() => setSelectedSlot(slot.time)}
                      style={{ padding: '8px', border: selectedSlot === slot.time ? '1px solid #818cf8' : '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', background: selectedSlot === slot.time ? 'rgba(129,140,248,0.15)' : 'rgba(255,255,255,0.03)', color: selectedSlot === slot.time ? '#818cf8' : '#94a3b8', cursor: slot.available ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: selectedSlot === slot.time ? '600' : '400', opacity: slot.available ? 1 : 0.4 }}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reason */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#94a3b8', marginBottom: '8px' }}>Reason for Visit (optional)</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
              placeholder="Describe the reason for your appointment..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          <button onClick={handleBookAppointment} disabled={!selectedDate || !selectedSlot || loading} className="btn btn-primary" style={{ width: '100%', opacity: (!selectedDate || !selectedSlot || loading) ? 0.5 : 1 }}>
            {loading ? 'Booking...' : `Book Appointment — $${selectedProvider.consultationFee}`}
          </button>
        </div>
      )}

      {step === 'payment' && clientSecret && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentForm
            onSuccess={() => {
              setStep('list');
              loadAppointments();
            }}
            onCancel={() => setStep('book')}
          />
        </Elements>
      )}
    </div>
  );
}

function PaymentForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError('');

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/appointments?success=true',
      },
    });

    if (submitError) {
      setError(submitError.message || 'Payment failed');
      setProcessing(false);
    } else {
      onSuccess();
    }
  }

  return (
    <div style={{ background: '#131625', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', padding: '28px' }}>
      <button onClick={onCancel} style={{ color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', marginBottom: '20px', padding: 0 }}>&larr; Back</button>

      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#e2e8f0', marginBottom: '20px' }}>Complete Payment</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <PaymentElement />
        </div>

        {error && <p style={{ color: '#f87171', marginBottom: '16px', fontSize: '14px' }}>{error}</p>}

        <button type="submit" disabled={!stripe || processing} className="btn btn-primary" style={{ width: '100%', opacity: (!stripe || processing) ? 0.6 : 1 }}>
          {processing ? 'Processing...' : 'Pay Now'}
        </button>
      </form>
    </div>
  );
}
