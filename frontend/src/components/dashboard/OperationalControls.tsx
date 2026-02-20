import { useState } from 'react';
import { cardStyle, btnSmall, btnPrimary, badgeStyle, type SystemStatus } from './shared';

// ── System Status Indicator ─────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  operational: '#16a34a',
  degraded: '#d97706',
  down: '#dc2626',
};

const STATUS_LABELS: Record<string, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  down: 'Down',
};

export function SystemStatusIndicator({ status }: { status: SystemStatus }) {
  const overallStatus =
    status.api === 'down' || status.database === 'down' || status.payments === 'down'
      ? 'down'
      : status.api === 'degraded' || status.database === 'degraded' || status.payments === 'degraded'
        ? 'degraded'
        : 'operational';

  return (
    <div style={{ ...cardStyle, marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600' }}>🟢 System Status</h3>
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>
          Updated {new Date(status.lastChecked).toLocaleTimeString()}
        </span>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px',
        padding: '10px 14px', borderRadius: '10px',
        background: STATUS_COLORS[overallStatus] + '10',
      }}>
        <span style={{
          width: '10px', height: '10px', borderRadius: '50%',
          background: STATUS_COLORS[overallStatus],
          boxShadow: `0 0 6px ${STATUS_COLORS[overallStatus]}`,
        }} />
        <span style={{ fontWeight: '600', fontSize: '14px', color: STATUS_COLORS[overallStatus] }}>
          All Systems {STATUS_LABELS[overallStatus]}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {([['api', 'API Server', status.api], ['database', 'Database', status.database], ['payments', 'Payment Gateway', status.payments]] as const).map(([key, label, s]) => (
          <div key={key} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 12px', borderRadius: '8px', background: '#f9fafb',
          }}>
            <span style={{ fontSize: '13px', fontWeight: '500' }}>{label}</span>
            <span style={badgeStyle(STATUS_COLORS[s])}>{STATUS_LABELS[s]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── API Key Management ──────────────────────────────────────

interface ApiKeyInfo {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed?: string;
  status: 'active' | 'revoked';
}

export function ApiKeyManager({ keys: initialKeys }: { keys: ApiKeyInfo[] }) {
  const [keys] = useState(initialKeys);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');

  return (
    <div style={{ ...cardStyle, marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600' }}>🔑 API Keys</h3>
        <button onClick={() => setShowCreate(!showCreate)} style={btnSmall}>
          {showCreate ? 'Cancel' : '+ Create Key'}
        </button>
      </div>

      {showCreate && (
        <div style={{
          padding: '14px', background: '#f9fafb', borderRadius: '10px',
          marginBottom: '14px', display: 'flex', gap: '8px',
        }}>
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g., Production)"
            style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }}
          />
          <button style={btnPrimary}>Generate</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {keys.map((key) => (
          <div key={key.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 14px', borderRadius: '10px', background: '#f9fafb',
          }}>
            <div>
              <p style={{ fontWeight: '500', fontSize: '14px' }}>{key.name}</p>
              <p style={{ fontFamily: 'monospace', fontSize: '12px', color: '#6b7280' }}>{key.prefix}•••••••</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={badgeStyle(key.status === 'active' ? '#16a34a' : '#dc2626')}>{key.status}</span>
              <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                {key.lastUsed ? `Used ${new Date(key.lastUsed).toLocaleDateString()}` : 'Never used'}
              </p>
            </div>
          </div>
        ))}
        {keys.length === 0 && (
          <p style={{ color: '#9ca3af', textAlign: 'center', padding: '16px', fontSize: '14px' }}>
            No API keys yet. Create one to integrate with external tools.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Integration / Webhook Management ────────────────────────

interface WebhookInfo {
  id: string;
  url: string;
  events: string[];
  status: 'active' | 'paused' | 'failing';
  lastTriggered?: string;
}

export function WebhookManager({ webhooks: initialWebhooks }: { webhooks: WebhookInfo[] }) {
  const [webhooks] = useState(initialWebhooks);

  return (
    <div style={{ ...cardStyle, marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600' }}>🔗 Integrations & Webhooks</h3>
        <button style={btnSmall}>+ Add Webhook</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {webhooks.map((wh) => (
          <div key={wh.id} style={{
            padding: '12px 14px', borderRadius: '10px', background: '#f9fafb',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <p style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                {wh.url}
              </p>
              <span style={badgeStyle(wh.status === 'active' ? '#16a34a' : wh.status === 'paused' ? '#d97706' : '#dc2626')}>
                {wh.status}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {wh.events.map((ev) => (
                <span key={ev} style={{ padding: '2px 8px', background: '#e5e7eb', borderRadius: '6px', fontSize: '11px', color: '#374151' }}>
                  {ev}
                </span>
              ))}
            </div>
          </div>
        ))}
        {webhooks.length === 0 && (
          <p style={{ color: '#9ca3af', textAlign: 'center', padding: '16px', fontSize: '14px' }}>
            No webhooks configured. Add one to receive real-time event notifications.
          </p>
        )}
      </div>
    </div>
  );
}
