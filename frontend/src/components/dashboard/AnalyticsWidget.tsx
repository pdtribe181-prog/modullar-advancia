import { useState } from 'react';
import { cardStyle, btnSmall, badgeStyle, type DateRange } from './shared';

// ── Date Range Picker ───────────────────────────────────────

const PRESETS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: 'YTD', days: -1 },
];

function toISODate(d: Date) {
  return d.toISOString().split('T')[0];
}

export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const applyPreset = (days: number) => {
    const to = new Date();
    let from: Date;
    if (days === -1) {
      from = new Date(to.getFullYear(), 0, 1); // YTD
    } else {
      from = new Date(to.getTime() - days * 86400000);
    }
    onChange({ from: toISODate(from), to: toISODate(to) });
  };

  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
      {PRESETS.map((p) => (
        <button key={p.label} onClick={() => applyPreset(p.days)} style={btnSmall}>
          {p.label}
        </button>
      ))}
      <input
        type="date"
        value={value.from}
        onChange={(e) => onChange({ ...value, from: e.target.value })}
        style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}
      />
      <span style={{ color: '#9ca3af' }}>—</span>
      <input
        type="date"
        value={value.to}
        onChange={(e) => onChange({ ...value, to: e.target.value })}
        style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}
      />
    </div>
  );
}

// ── Analytics Chart (mini bar chart in pure CSS) ────────────

interface DataPoint {
  label: string;
  value: number;
}

export function MiniBarChart({ data, height = 100 }: { data: DataPoint[]; height?: number }) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height, padding: '4px 0' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div
            style={{
              width: '100%',
              maxWidth: '32px',
              height: `${(d.value / max) * height * 0.85}px`,
              background: 'linear-gradient(180deg, #667eea, #764ba2)',
              borderRadius: '4px 4px 0 0',
              transition: 'height 0.4s ease',
              minHeight: '2px',
            }}
            title={`${d.label}: ${d.value}`}
          />
          <span style={{ fontSize: '10px', color: '#9ca3af', whiteSpace: 'nowrap' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Analytics Dashboard Widget ──────────────────────────────

interface MetricCard {
  label: string;
  value: string | number;
  change?: number; // percentage change
  icon: string;
}

interface AnalyticsProps {
  metrics?: MetricCard[];
  chartData?: DataPoint[];
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange) => void;
  onViewDetailed?: () => void;
}

const defaultMetrics: MetricCard[] = [
  { label: 'Revenue', value: '$12,340', change: 8, icon: '💰' },
  { label: 'Transactions', value: 847, change: 12, icon: '📊' },
  { label: 'Patients', value: 156, change: 3, icon: '👥' },
  { label: 'Disputes', value: 2, change: -50, icon: '⚠️' },
];

const defaultChartData: DataPoint[] = [
  { label: 'Mon', value: 120 }, { label: 'Tue', value: 145 },
  { label: 'Wed', value: 98 }, { label: 'Thu', value: 175 },
  { label: 'Fri', value: 160 }, { label: 'Sat', value: 80 },
  { label: 'Sun', value: 65 },
];

/**
 * Analytics widget with date filtering, metric cards, and mini chart.
 */
export function AnalyticsWidget({
  metrics = defaultMetrics,
  chartData = defaultChartData,
  dateRange: externalDateRange,
  onDateRangeChange: externalOnChange,
  onViewDetailed,
}: AnalyticsProps = {}) {
  const today = toISODate(new Date());
  const weekAgo = toISODate(new Date(Date.now() - 7 * 86400000));
  const [internalRange, setInternalRange] = useState<DateRange>({ from: weekAgo, to: today });

  const dateRange = externalDateRange ?? internalRange;
  const onDateRangeChange = externalOnChange ?? setInternalRange;
  return (
    <div style={{ ...cardStyle, marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600' }}>📈 Analytics</h3>
        <DateRangePicker value={dateRange} onChange={onDateRangeChange} />
      </div>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {metrics.map((m) => (
          <div key={m.label} style={{ padding: '14px', background: '#f9fafb', borderRadius: '12px', textAlign: 'center' }}>
            <span style={{ fontSize: '22px' }}>{m.icon}</span>
            <p style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a2e', marginTop: '4px' }}>{m.value}</p>
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{m.label}</p>
            {m.change !== undefined && (
              <span style={{
                ...badgeStyle(m.change >= 0 ? '#16a34a' : '#dc2626'),
                marginTop: '4px',
              }}>
                {m.change >= 0 ? '↑' : '↓'} {Math.abs(m.change)}%
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Chart */}
      <MiniBarChart data={chartData} height={80} />

      {onViewDetailed && (
        <button onClick={onViewDetailed} style={{ ...btnSmall, width: '100%', marginTop: '16px', textAlign: 'center' }}>
          View Detailed Analytics →
        </button>
      )}
    </div>
  );
}
