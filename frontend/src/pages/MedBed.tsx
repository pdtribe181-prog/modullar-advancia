import { useState, useEffect, CSSProperties } from 'react';
import { api } from '../services/api';
import { Spinner } from '../components/Spinner';

interface MedBed {
  id: string;
  name: string;
  facility_name: string;
  bed_type: string;
  specialty: string;
  location: string;
  daily_rate: number;
  is_available: boolean;
  features?: string[];
}

interface Booking {
  id: string;
  bed_id: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
  total_amount: number;
  notes: string;
  created_at: string;
  med_beds?: { name: string; facility_name: string; bed_type: string };
}

type TabType = 'browse' | 'bookings';

const BED_ICONS: Record<string, string> = {
  icu: '🏥',
  standard: '🛏️',
  private: '🏡',
  semi_private: '🛌',
  pediatric: '👶',
  maternity: '🤱',
  rehabilitation: '💪',
};

const STATUS_STYLES: Record<string, CSSProperties> = {
  active: { background: 'rgba(52,211,153,0.12)', color: '#34d399' },
  confirmed: { background: 'rgba(52,211,153,0.12)', color: '#34d399' },
  pending: { background: 'rgba(251,191,36,0.12)', color: '#fbbf24' },
  cancelled: { background: 'rgba(248,113,113,0.12)', color: '#f87171' },
  completed: { background: 'rgba(148,163,184,0.12)', color: '#94a3b8' },
};

export function MedBed() {
  const [tab, setTab] = useState<TabType>('browse');
  const [beds, setBeds] = useState<MedBed[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Booking modal
  const [selectedBed, setSelectedBed] = useState<MedBed | null>(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [bookingError, setBookingError] = useState('');

  useEffect(() => {
    fetchData();
  }, [tab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'browse') {
        const res = await api.get<{ success: boolean; data: MedBed[] }>('/medbed');
        if (res.success) setBeds(res.data || []);
        else setError('Unable to load MedBed listings');
      } else {
        const res = await api.get<{ success: boolean; data: Booking[] }>('/medbed/bookings');
        if (res.success) setBookings(res.data || []);
        else setError('Unable to load your bookings');
      }
    } catch {
      setError('Service temporarily unavailable');
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBed) return;
    setBooking(true);
    setBookingError('');
    try {
      const res = await api.post<{ success: boolean }>('/medbed/bookings', {
        bed_id: selectedBed.id,
        check_in_date: checkIn,
        check_out_date: checkOut,
        notes,
      });
      if (res.success) {
        setBookingSuccess(`Booking confirmed at ${selectedBed.facility_name}!`);
        setSelectedBed(null);
        setCheckIn(''); setCheckOut(''); setNotes('');
        setTimeout(() => { setBookingSuccess(''); setTab('bookings'); }, 2000);
      } else {
        setBookingError('Booking failed — please try again');
      }
    } catch {
      setBookingError('Booking failed — please try again');
    } finally {
      setBooking(false);
    }
  };

  const cancelBooking = async (id: string) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      await api.post(`/medbed/bookings/${id}/cancel`, {});
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
    } catch {
      alert('Failed to cancel booking');
    }
  };

  const nights = (a: string, b: string) => {
    if (!a || !b) return 0;
    const diff = new Date(b).getTime() - new Date(a).getTime();
    return Math.max(0, Math.round(diff / 86400000));
  };

  const container: CSSProperties = { maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' };
  const card: CSSProperties = { background: '#0f1729', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' };

  return (
    <div style={container}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: 'var(--fs-h2)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)', margin: 0, marginBottom: '8px' }}>
          🏥 MedBed
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
          Browse available medical beds and manage your healthcare bookings
        </p>
      </div>

      {/* Success banner */}
      {bookingSuccess && (
        <div style={{ padding: '14px 18px', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '10px', color: '#34d399', marginBottom: '20px', fontWeight: '600' }}>
          ✅ {bookingSuccess}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: '#0f1729', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '4px', marginBottom: '24px', width: 'fit-content' }}>
        {(['browse', 'bookings'] as TabType[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ padding: '9px 22px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px', background: tab === t ? 'var(--primary)' : 'transparent', color: tab === t ? 'white' : 'var(--text-muted)', transition: 'all 0.2s' }}
          >
            {t === 'browse' ? '🔍 Browse Beds' : '📋 My Bookings'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '48px', justifyContent: 'center' }}>
          <Spinner size={28} />
          <span style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Loading…</span>
        </div>
      ) : error ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--error)' }}>
          <p style={{ marginBottom: '16px' }}>{error}</p>
          <button onClick={fetchData} style={{ padding: '10px 24px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>Retry</button>
        </div>
      ) : tab === 'browse' ? (
        beds.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 20px' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>🏥</p>
            <p style={{ color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '8px', fontSize: '16px' }}>No beds available right now</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Check back soon for new listings</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {beds.map(bed => (
              <div key={bed.id} style={{ ...card, display: 'flex', flexDirection: 'column', gap: '14px', opacity: bed.is_available ? 1 : 0.55 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '32px' }}>{BED_ICONS[bed.bed_type] || '🛏️'}</span>
                  <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '100px', fontWeight: '600', ...(bed.is_available ? { background: 'rgba(52,211,153,0.12)', color: '#34d399' } : { background: 'rgba(148,163,184,0.12)', color: '#94a3b8' }) }}>
                    {bed.is_available ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                <div>
                  <h3 style={{ color: 'var(--text-primary)', fontWeight: '600', marginBottom: '4px', fontSize: '15px' }}>{bed.name}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>{bed.facility_name}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>📍 {bed.location}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ background: 'rgba(96,128,245,0.1)', color: '#8ea4f8', fontSize: '11px', padding: '3px 9px', borderRadius: '100px', textTransform: 'capitalize' }}>{bed.bed_type?.replace('_', ' ')}</span>
                  {bed.specialty && <span style={{ background: 'rgba(96,128,245,0.1)', color: '#8ea4f8', fontSize: '11px', padding: '3px 9px', borderRadius: '100px' }}>{bed.specialty}</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '18px' }}>
                    ${bed.daily_rate?.toLocaleString()}<span style={{ fontWeight: '400', fontSize: '13px', color: 'var(--text-muted)' }}>/day</span>
                  </span>
                  <button
                    onClick={() => bed.is_available && setSelectedBed(bed)}
                    disabled={!bed.is_available}
                    style={{ padding: '9px 18px', background: bed.is_available ? 'var(--primary)' : '#222', border: 'none', borderRadius: '9px', color: bed.is_available ? 'white' : '#555', cursor: bed.is_available ? 'pointer' : 'not-allowed', fontWeight: '600', fontSize: '13px' }}
                  >
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* My Bookings */
        bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 20px' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>📋</p>
            <p style={{ color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '8px', fontSize: '16px' }}>No bookings yet</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>Browse available beds to make your first booking</p>
            <button onClick={() => setTab('browse')} style={{ padding: '12px 28px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>Browse Beds</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {bookings.map(b => (
              <div key={b.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h3 style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '15px', marginBottom: '4px' }}>
                    {b.med_beds?.name || 'Medical Bed'}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>{b.med_beds?.facility_name}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {new Date(b.check_in_date).toLocaleDateString()} → {new Date(b.check_out_date).toLocaleDateString()}
                    <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>({nights(b.check_in_date, b.check_out_date)} nights)</span>
                  </p>
                  {b.notes && <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', fontStyle: 'italic' }}>{b.notes}</p>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '100px', fontWeight: '600', textTransform: 'capitalize', ...(STATUS_STYLES[b.status] || STATUS_STYLES.pending) }}>
                    {b.status}
                  </span>
                  {b.total_amount > 0 && (
                    <p style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '16px', marginTop: '8px' }}>
                      ${b.total_amount.toLocaleString()}
                    </p>
                  )}
                  {b.status === 'active' || b.status === 'confirmed' || b.status === 'pending' ? (
                    <button
                      onClick={() => cancelBooking(b.id)}
                      style={{ marginTop: '10px', padding: '6px 14px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '8px', color: '#f87171', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Booking Modal */}
      {selectedBed && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#0f1729', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '32px', maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '18px', margin: 0 }}>Book: {selectedBed.name}</h2>
              <button onClick={() => setSelectedBed(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px', padding: '4px' }}>✕</button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
              {selectedBed.facility_name} · ${selectedBed.daily_rate}/day
            </p>
            <form onSubmit={handleBook} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>Check-in Date</label>
                <input type="date" required min={new Date().toISOString().split('T')[0]} style={{ width: '100%', padding: '11px 14px', background: '#162040', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} value={checkIn} onChange={e => setCheckIn(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>Check-out Date</label>
                <input type="date" required min={checkIn || new Date().toISOString().split('T')[0]} style={{ width: '100%', padding: '11px 14px', background: '#162040', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} value={checkOut} onChange={e => setCheckOut(e.target.value)} />
              </div>
              {checkIn && checkOut && nights(checkIn, checkOut) > 0 && (
                <div style={{ padding: '12px 14px', background: '#162040', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{nights(checkIn, checkOut)} nights × ${selectedBed.daily_rate}/day</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>
                      ${(nights(checkIn, checkOut) * selectedBed.daily_rate).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>Special Requests (optional)</label>
                <textarea rows={3} placeholder="Any specific needs or medical requirements…" style={{ width: '100%', padding: '11px 14px', background: '#162040', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              {bookingError && (
                <div style={{ padding: '10px 14px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '8px', color: '#f87171', fontSize: '13px' }}>{bookingError}</div>
              )}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setSelectedBed(null)} style={{ flex: 1, padding: '12px', background: '#162040', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>Cancel</button>
                <button type="submit" disabled={booking} style={{ flex: 2, padding: '12px', background: booking ? '#333' : 'var(--primary)', border: 'none', borderRadius: '10px', color: 'white', cursor: booking ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: 'var(--shadow-primary)' }}>
                  {booking ? <><Spinner size={18} /><span>Booking…</span></> : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MedBed;
