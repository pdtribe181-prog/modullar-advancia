import { useState, useEffect } from 'react';
import { cardStyle, badgeStyle } from './shared';

// ── Real-Time Connection Indicator ──────────────────────────

type ConnectionState = 'connected' | 'reconnecting' | 'disconnected';

export function RealtimeIndicator() {
  const [state, setState] = useState<ConnectionState>('connected');
  const [lastPing, setLastPing] = useState<number>(Date.now());

  useEffect(() => {
    // Simulate connectivity monitoring via visibility / online checks
    const handleOnline = () => setState('connected');
    const handleOffline = () => setState('disconnected');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      if (navigator.onLine) {
        setLastPing(Date.now());
        setState('connected');
      } else {
        setState('disconnected');
      }
    }, 30_000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const colors: Record<ConnectionState, string> = {
    connected: '#16a34a',
    reconnecting: '#d97706',
    disconnected: '#dc2626',
  };

  const labels: Record<ConnectionState, string> = {
    connected: 'Live',
    reconnecting: 'Reconnecting…',
    disconnected: 'Offline',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      padding: '6px 12px', borderRadius: '20px',
      background: colors[state] + '12', fontSize: '12px', fontWeight: '500',
    }}>
      <span style={{
        width: '8px', height: '8px', borderRadius: '50%',
        background: colors[state],
        boxShadow: `0 0 4px ${colors[state]}`,
        animation: state === 'connected' ? 'pulse 2s infinite' : 'none',
      }} />
      <span style={{ color: colors[state] }}>{labels[state]}</span>
      <span style={{ color: '#9ca3af', fontSize: '11px' }}>
        {new Date(lastPing).toLocaleTimeString()}
      </span>
    </div>
  );
}

// ── Background Jobs Status ──────────────────────────────────

export interface BackgroundJob {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'scheduled';
  progress?: number;     // 0–100
  lastRun?: string;
  nextRun?: string;
  error?: string;
}

export function BackgroundJobs({ jobs }: { jobs: BackgroundJob[] }) {
  const statusColors: Record<string, string> = {
    running: '#6366f1',
    completed: '#16a34a',
    failed: '#dc2626',
    scheduled: '#d97706',
  };

  const statusIcons: Record<string, string> = {
    running: '⏳',
    completed: '✅',
    failed: '❌',
    scheduled: '🕐',
  };

  return (
    <div style={{ ...cardStyle, marginBottom: '24px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>⚙️ Background Jobs</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {jobs.map((job) => (
          <div key={job.id} style={{
            padding: '10px 14px', borderRadius: '10px', background: '#f9fafb',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontWeight: '500', fontSize: '14px' }}>
                {statusIcons[job.status]} {job.name}
              </span>
              <span style={badgeStyle(statusColors[job.status])}>{job.status}</span>
            </div>

            {job.status === 'running' && job.progress !== undefined && (
              <div style={{ width: '100%', height: '4px', background: '#e5e7eb', borderRadius: '3px', marginBottom: '6px' }}>
                <div style={{
                  width: `${job.progress}%`, height: '100%',
                  background: '#6366f1', borderRadius: '3px',
                  transition: 'width 0.3s ease',
                }} />
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#9ca3af' }}>
              {job.lastRun && <span>Last: {new Date(job.lastRun).toLocaleString()}</span>}
              {job.nextRun && <span>Next: {new Date(job.nextRun).toLocaleString()}</span>}
            </div>

            {job.error && (
              <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', padding: '4px 8px', background: '#fef2f2', borderRadius: '6px' }}>
                {job.error}
              </p>
            )}
          </div>
        ))}
        {jobs.length === 0 && (
          <p style={{ color: '#9ca3af', textAlign: 'center', padding: '16px', fontSize: '14px' }}>
            No background jobs running.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Page Performance Metrics ────────────────────────────────

export function PerformanceMetrics() {
  const [metrics, setMetrics] = useState<{
    loadTime: number | null;
    domReady: number | null;
    memoryUsage: number | null;
  }>({ loadTime: null, domReady: null, memoryUsage: null });

  useEffect(() => {
    const measure = () => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;

      setMetrics({
        loadTime: nav ? Math.round(nav.loadEventEnd - nav.startTime) : null,
        domReady: nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : null,
        memoryUsage: mem ? Math.round((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100) : null,
      });
    };

    // Delay to allow navigation timing to settle
    setTimeout(measure, 1000);
  }, []);

  if (!metrics.loadTime && !metrics.memoryUsage) return null;

  return (
    <div style={{
      display: 'flex', gap: '16px', padding: '10px 16px', borderRadius: '12px',
      background: '#f9fafb', fontSize: '12px', color: '#6b7280', marginBottom: '16px',
    }}>
      {metrics.domReady !== null && (
        <span>DOM Ready: <strong style={{ color: metrics.domReady < 1000 ? '#16a34a' : '#d97706' }}>{metrics.domReady}ms</strong></span>
      )}
      {metrics.loadTime !== null && (
        <span>Page Load: <strong style={{ color: metrics.loadTime < 2000 ? '#16a34a' : '#d97706' }}>{metrics.loadTime}ms</strong></span>
      )}
      {metrics.memoryUsage !== null && (
        <span>Memory: <strong style={{ color: metrics.memoryUsage < 70 ? '#16a34a' : '#d97706' }}>{metrics.memoryUsage}%</strong></span>
      )}
    </div>
  );
}
