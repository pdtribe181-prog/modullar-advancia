import { useState, useEffect, CSSProperties } from 'react';
import { api } from '../services/api';
import { Spinner } from '../components/Spinner';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  action_url?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

type FilterType = 'all' | 'unread' | 'high';

const NOTIFICATION_ICONS: Record<string, string> = {
  payment: '💳',
  appointment: '📅',
  wallet: '🔗',
  security: '🔐',
  system: '⚙️',
  compliance: '⚠️',
  withdrawal: '🏦',
  booking: '🏥',
  default: '🔔',
};

const PRIORITY_STYLES: Record<string, CSSProperties> = {
  urgent: { background: 'rgba(248,113,113,0.12)', color: '#f87171', borderLeft: '3px solid #f87171' },
  high: { background: 'rgba(251,191,36,0.08)', color: '#fbbf24', borderLeft: '3px solid #fbbf24' },
  normal: { background: 'transparent', color: 'var(--text-muted)', borderLeft: '3px solid transparent' },
  low: { background: 'transparent', color: 'var(--text-muted)', borderLeft: '3px solid transparent' },
};

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{ success: boolean; data: Notification[] }>('/notifications?limit=50');
      if (res.success) setNotifications(res.data || []);
      else setError('Unable to load notifications');
    } catch {
      setError('Notification service unavailable');
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}`, { is_read: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {
      // Silently ignore
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.post('/notifications/mark-all-read', {});
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {
      // Silently ignore
    } finally {
      setMarkingAll(false);
    }
  };

  const dismiss = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch {
      // Silently ignore
    }
  };

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'high') return n.priority === 'high' || n.priority === 'urgent';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const container: CSSProperties = { maxWidth: '780px', margin: '0 auto', padding: '32px 24px' };
  const card: CSSProperties = { background: '#0f1729', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={container}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--fs-h2)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)', margin: 0, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Notifications
            {unreadCount > 0 && (
              <span style={{ background: 'var(--primary)', color: 'white', fontSize: '12px', fontWeight: '700', padding: '2px 9px', borderRadius: '100px' }}>
                {unreadCount}
              </span>
            )}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Stay up-to-date with payments, security and activity</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            style={{ padding: '9px 18px', background: '#162040', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
          >
            {markingAll ? 'Marking…' : '✓ Mark all read'}
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {([['all', 'All'], ['unread', `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`], ['high', 'High Priority']] as [FilterType, string][]).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{ padding: '7px 16px', borderRadius: '100px', border: filter === f ? 'none' : '1px solid rgba(255,255,255,0.1)', background: filter === f ? 'var(--primary)' : 'transparent', color: filter === f ? 'white' : 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={card}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '48px', justifyContent: 'center' }}>
            <Spinner size={26} />
            <span style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Loading notifications…</span>
          </div>
        ) : error ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--error)' }}>
            <p style={{ marginBottom: '16px' }}>{error}</p>
            <button onClick={fetchNotifications} style={{ padding: '10px 24px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 20px' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</p>
            <p style={{ color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '6px', fontSize: '16px' }}>
              {filter === 'unread' ? 'All caught up!' : filter === 'high' ? 'No high-priority alerts' : 'No notifications yet'}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              {filter === 'unread' ? 'No unread notifications.' : "We'll notify you about payments, security events and more."}
            </p>
          </div>
        ) : (
          filtered.map((n, idx) => (
            <div
              key={n.id}
              onClick={() => !n.is_read && markRead(n.id)}
              style={{
                padding: '16px 20px',
                display: 'flex',
                gap: '14px',
                alignItems: 'flex-start',
                borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                background: !n.is_read ? 'rgba(96,128,245,0.04)' : 'transparent',
                cursor: !n.is_read ? 'pointer' : 'default',
                transition: 'background 0.15s',
                ...PRIORITY_STYLES[n.priority],
              }}
            >
              {/* Icon */}
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#162040', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                {NOTIFICATION_ICONS[n.type] || NOTIFICATION_ICONS.default}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '4px' }}>
                  <h4 style={{ color: !n.is_read ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: !n.is_read ? '600' : '500', fontSize: '14px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.title}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDate(n.created_at)}</span>
                    {!n.is_read && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }} />}
                  </div>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>{n.message}</p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {n.action_url && (
                    <a href={n.action_url} style={{ fontSize: '12px', color: 'var(--primary-light)', textDecoration: 'none', fontWeight: '500' }}>View →</a>
                  )}
                  {(n.priority === 'high' || n.priority === 'urgent') && (
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '100px', background: 'rgba(251,191,36,0.1)', color: '#fbbf24', fontWeight: '600', textTransform: 'uppercase' }}>
                      {n.priority}
                    </span>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); dismiss(n.id); }}
                    style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Settings hint */}
      {notifications.length > 0 && (
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Manage notification preferences in <a href="/security" style={{ color: 'var(--primary-light)' }}>Security Settings</a>
        </p>
      )}
    </div>
  );
}

export default Notifications;
