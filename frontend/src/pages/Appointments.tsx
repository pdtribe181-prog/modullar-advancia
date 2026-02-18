import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { api, ApiError } from '../services/api';
import { Spinner } from '../components/Spinner';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

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
  }, []);

  async function loadProviders() {
    try {
      setLoadingProviders(true);
      const data = await api.get<{ providers: Provider[] }>('/appointments/providers');
      setProviders(data.providers);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load providers';
      console.error('Failed to load providers:', err);
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
      console.error('Failed to load appointments:', err);
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

  function getStatusColor(status: string) {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Appointments</h1>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
          {error}
        </div>
      )}

      {step === 'list' && (
        <>
          {/* Upcoming Appointments */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Your Upcoming Appointments</h2>
            {loadingAppointments ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Spinner size={20} /> Loading appointments...
              </div>
            ) : appointments.length === 0 ? (
              <p className="text-gray-500">No upcoming appointments</p>
            ) : (
              <div className="space-y-4">
                {appointments.map((apt) => (
                  <div key={apt.id} className="border rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{apt.provider?.business_name}</h3>
                      <p className="text-sm text-gray-600">{apt.provider?.specialty}</p>
                      <p className="text-sm">
                        {formatDate(apt.date)} at {apt.time}
                      </p>
                      {apt.reason && (
                        <p className="text-sm text-gray-500 mt-1">Reason: {apt.reason}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(apt.status)}`}>
                        {apt.status}
                      </span>
                      {['scheduled', 'confirmed'].includes(apt.status) && (
                        <button
                          onClick={() => handleCancelAppointment(apt.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Book New Appointment */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Book an Appointment</h2>
            {loadingProviders ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Spinner size={20} /> Loading providers...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {providers.map((provider) => (
                    <div
                      key={provider.id}
                      className="border rounded-lg p-4 hover:border-blue-500 cursor-pointer transition"
                      onClick={() => handleProviderSelect(provider)}
                    >
                      <h3 className="font-medium">{provider.name}</h3>
                      <p className="text-sm text-gray-600">{provider.specialty}</p>
                      <p className="text-lg font-semibold mt-2">
                        ${provider.consultationFee}
                      </p>
                      {provider.acceptsPayments && (
                        <span className="text-green-600 text-sm">Online payments available</span>
                      )}
                    </div>
                  ))}
                </div>
                {providers.length === 0 && (
                  <p className="text-gray-500">No providers available</p>
                )}
              </>
            )}
          </section>
        </>
      )}

      {step === 'book' && selectedProvider && (
        <div className="bg-white rounded-lg shadow p-6">
          <button
            onClick={() => setStep('list')}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            &larr; Back to providers
          </button>

          <h2 className="text-xl font-semibold mb-4">
            Book with {selectedProvider.name}
          </h2>
          <p className="text-gray-600 mb-4">{selectedProvider.specialty}</p>
          <p className="text-lg font-semibold mb-6">
            Consultation Fee: ${selectedProvider.consultationFee}
          </p>

          {/* Date Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Date</label>
            <input
              type="date"
              min={today}
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="border rounded px-3 py-2 w-full"
            />
          </div>

          {/* Time Slots */}
          {selectedDate && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Select Time</label>
              {loading ? (
                <p>Loading available times...</p>
              ) : slots.length === 0 ? (
                <p className="text-gray-500">No available slots for this date</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => setSelectedSlot(slot.time)}
                      className={`px-3 py-2 border rounded text-sm ${
                        selectedSlot === slot.time
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'hover:border-blue-500'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reason */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Reason for Visit (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="border rounded px-3 py-2 w-full"
              rows={3}
              placeholder="Describe the reason for your appointment..."
            />
          </div>

          <button
            onClick={handleBookAppointment}
            disabled={!selectedDate || !selectedSlot || loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Booking...' : `Book Appointment - $${selectedProvider.consultationFee}`}
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
    <div className="bg-white rounded-lg shadow p-6">
      <button onClick={onCancel} className="text-blue-600 hover:text-blue-800 mb-4">
        &larr; Back
      </button>

      <h2 className="text-xl font-semibold mb-4">Complete Payment</h2>

      <form onSubmit={handleSubmit}>
        <PaymentElement className="mb-4" />

        {error && <p className="text-red-600 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={!stripe || processing}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
        >
          {processing ? 'Processing...' : 'Pay Now'}
        </button>
      </form>
    </div>
  );
}
