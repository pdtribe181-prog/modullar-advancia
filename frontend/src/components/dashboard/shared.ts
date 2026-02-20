import { useState, useEffect, useCallback } from 'react';

// ── Shared Types ────────────────────────────────────────────

export interface DateRange {
  from: string;
  to: string;
}

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'provider' | 'billing' | 'viewer';
  status: 'active' | 'invited' | 'disabled';
  lastActive?: string;
  avatar?: string;
}

export interface SystemStatus {
  api: 'operational' | 'degraded' | 'down';
  database: 'operational' | 'degraded' | 'down';
  payments: 'operational' | 'degraded' | 'down';
  lastChecked: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  date: string;
  dismissible?: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export interface OnboardingStep {
  id: string;
  label: string;
  completed: boolean;
  href: string;
  icon: string;
}

export interface UsageMetric {
  current: number;
  limit: number;
  history?: number[];
}

export interface UsageMetrics {
  apiCalls: UsageMetric;
  storage: UsageMetric;
  bandwidth: UsageMetric;
  transactions: UsageMetric;
}

export interface PlanInfo {
  name: 'free' | 'pro' | 'enterprise';
  features: string[];
  price: number;
}

// ── Shared Styles ───────────────────────────────────────────

export const cardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};

export const badgeStyle = (color: string): React.CSSProperties => ({
  display: 'inline-block',
  padding: '2px 10px',
  borderRadius: '10px',
  fontSize: '12px',
  fontWeight: '600',
  background: color + '20',
  color,
});

export const btnPrimary: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: '10px',
  border: 'none',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  fontWeight: '600',
  cursor: 'pointer',
  fontSize: '14px',
};

export const btnSecondary: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: '10px',
  border: '1px solid #e2e8f0',
  background: 'white',
  color: '#374151',
  fontWeight: '500',
  cursor: 'pointer',
  fontSize: '14px',
};

export const btnSmall: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  background: 'white',
  color: '#374151',
  fontWeight: '500',
  cursor: 'pointer',
  fontSize: '13px',
};

// ── Utility Hooks ───────────────────────────────────────────

export function useDashboardData<T>(
  fetchFn: () => Promise<T>,
  fallback: T,
  refreshInterval?: number
) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await fetchFn();
      setData(result);
      setLastUpdated(new Date());
    } catch {
      // Keep fallback
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    refresh();
    if (refreshInterval) {
      const id = setInterval(refresh, refreshInterval);
      return () => clearInterval(id);
    }
  }, [refresh, refreshInterval]);

  return { data, loading, lastUpdated, refresh };
}
