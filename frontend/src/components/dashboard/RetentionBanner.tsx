import { useState, useEffect } from 'react';
import { cardStyle, btnSmall, type Announcement, type UsageMetrics } from './shared';

// ── Usage Trends Snapshot ───────────────────────────────────

export function UsageTrends({ metrics }: { metrics: UsageMetrics }) {
  const { apiCalls, storage, bandwidth, transactions } = metrics;

  const agg = (m: typeof apiCalls) => {
    if (!m.history || m.history.length < 2) return 0;
    const recent = m.history.slice(-7).reduce((a, b) => a + b, 0);
    const prev = m.history.slice(-14, -7).reduce((a, b) => a + b, 0);
    if (prev === 0) return 100;
    return Math.round(((recent - prev) / prev) * 100);
  };

  const rows = [
    { label: 'API Calls', current: apiCalls.current, limit: apiCalls.limit, trend: agg(apiCalls) },
    { label: 'Storage', current: storage.current, limit: storage.limit, trend: agg(storage), unit: 'MB' },
    { label: 'Bandwidth', current: bandwidth.current, limit: bandwidth.limit, trend: agg(bandwidth), unit: 'GB' },
    { label: 'Transactions', current: transactions.current, limit: transactions.limit, trend: agg(transactions) },
  ];

  return (
    <div style={{ ...cardStyle, marginBottom: '24px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>📊 Usage Trends</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {rows.map((r) => {
          const pct = r.limit ? Math.min((r.current / r.limit) * 100, 100) : 0;
          const barColor = pct > 90 ? '#dc2626' : pct > 70 ? '#d97706' : '#6366f1';
          return (
            <div key={r.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: '500' }}>{r.label}</span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  {r.current.toLocaleString()}{r.unit ? ` ${r.unit}` : ''} / {r.limit.toLocaleString()}{r.unit ? ` ${r.unit}` : ''}
                  {r.trend !== 0 && (
                    <span style={{ marginLeft: '6px', color: r.trend > 0 ? '#dc2626' : '#16a34a', fontWeight: '600' }}>
                      {r.trend > 0 ? '↑' : '↓'}{Math.abs(r.trend)}%
                    </span>
                  )}
                </span>
              </div>
              <div style={{ width: '100%', height: '6px', background: '#e5e7eb', borderRadius: '4px' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '4px', transition: 'width 0.5s ease' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Feedback Prompt ─────────────────────────────────────────

export function FeedbackPrompt() {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('adv_feedback_dismissed') === 'true'; } catch { return false; }
  });
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');

  if (dismissed) return null;

  const handleSubmit = () => {
    // In a real app this would call an API
    setSubmitted(true);
    setTimeout(() => {
      localStorage.setItem('adv_feedback_dismissed', 'true');
      setDismissed(true);
    }, 2000);
  };

  const handleDismiss = () => {
    localStorage.setItem('adv_feedback_dismissed', 'true');
    setDismissed(true);
  };

  return (
    <div style={{
      ...cardStyle, marginBottom: '24px',
      background: 'linear-gradient(135deg, #eef2ff, #faf5ff)',
      border: '1px solid #c7d2fe',
    }}>
      {submitted ? (
        <p style={{ textAlign: 'center', padding: '12px', fontSize: '14px', fontWeight: '500', color: '#6366f1' }}>
          ✨ Thank you for your feedback!
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600' }}>💬 How&apos;s your experience?</h3>
            <button onClick={handleDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '18px' }}>×</button>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} onClick={() => setRating(v)} style={{
                width: '40px', height: '40px', borderRadius: '10px', border: 'none',
                cursor: 'pointer', fontSize: '18px',
                background: rating === v ? '#6366f1' : '#f3f4f6',
                color: rating === v ? '#fff' : '#374151',
                transition: 'all 0.15s ease',
              }}>
                {v}
              </button>
            ))}
          </div>

          {rating && (
            <>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us more (optional)..."
                rows={2}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid #d1d5db', fontSize: '14px', resize: 'vertical',
                  marginBottom: '10px', boxSizing: 'border-box',
                }}
              />
              <button onClick={handleSubmit} style={btnSmall}>Submit Feedback</button>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Announcements Banner ────────────────────────────────────

export function AnnouncementsBanner({ announcements }: { announcements: Announcement[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('adv_dismissed_announcements');
      return raw ? new Set(JSON.parse(raw)) : new Set<string>();
    } catch { return new Set<string>(); }
  });

  const active = announcements.filter((a) => !dismissed.has(a.id));
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (active.length <= 1) return;
    const t = setInterval(() => setCurrentIndex((i) => (i + 1) % active.length), 6000);
    return () => clearInterval(t);
  }, [active.length]);

  if (active.length === 0) return null;

  const current = active[currentIndex % active.length];
  const typeColors: Record<string, { bg: string; border: string; icon: string }> = {
    info: { bg: '#eff6ff', border: '#93c5fd', icon: 'ℹ️' },
    warning: { bg: '#fefce8', border: '#fcd34d', icon: '⚠️' },
    success: { bg: '#f0fdf4', border: '#86efac', icon: '✅' },
    error: { bg: '#fef2f2', border: '#fca5a5', icon: '🚨' },
  };
  const colors = typeColors[current.type] || typeColors.info;

  const handleDismiss = () => {
    const next = new Set(dismissed);
    next.add(current.id);
    setDismissed(next);
    localStorage.setItem('adv_dismissed_announcements', JSON.stringify([...next]));
  };

  return (
    <div style={{
      padding: '12px 16px', borderRadius: '12px', marginBottom: '20px',
      background: colors.bg, border: `1px solid ${colors.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
        <span style={{ fontSize: '18px' }}>{colors.icon}</span>
        <div>
          <p style={{ fontWeight: '600', fontSize: '14px' }}>{current.title}</p>
          <p style={{ fontSize: '13px', color: '#6b7280' }}>{current.message}</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {current.actionUrl && (
          <a href={current.actionUrl} style={{ ...btnSmall, textDecoration: 'none' }}>
            {current.actionLabel || 'Learn more'}
          </a>
        )}
        <button onClick={handleDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '16px' }}>×</button>
      </div>
      {active.length > 1 && (
        <div style={{ position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '4px' }}>
          {active.map((_, i) => (
            <span key={_.id} style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: i === currentIndex % active.length ? '#6366f1' : '#d1d5db',
            }} />
          ))}
        </div>
      )}
    </div>
  );
}
