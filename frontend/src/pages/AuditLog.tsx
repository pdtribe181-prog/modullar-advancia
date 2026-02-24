import React, { useState, CSSProperties } from 'react';
import '../styles.css';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  category: 'auth' | 'payment' | 'admin' | 'user' | 'system' | 'security';
  actor: {
    id: string;
    email: string;
    role: string;
  };
  resource: {
    type: string;
    id: string;
  };
  details: Record<string, string | number | boolean>;
  ip_address: string;
  user_agent: string;
  status: 'success' | 'failure' | 'warning';
}

const mockLogs: AuditLogEntry[] = [
  {
    id: 'log_001',
    timestamp: '2024-12-20T14:32:15Z',
    action: 'user.login',
    category: 'auth',
    actor: { id: 'usr_001', email: 'admin@advanciapayledger.com', role: 'admin' },
    resource: { type: 'session', id: 'sess_abc123' },
    details: { method: '2fa', duration_ms: 245 },
    ip_address: '192.168.1.45',
    user_agent: 'Mozilla/5.0 Chrome/120.0',
    status: 'success',
  },
  {
    id: 'log_002',
    timestamp: '2024-12-20T14:28:10Z',
    action: 'payment.processed',
    category: 'payment',
    actor: { id: 'usr_002', email: 'jane@clinic.com', role: 'provider' },
    resource: { type: 'transaction', id: 'txn_xyz789' },
    details: { amount: 250.00, currency: 'USD', method: 'card' },
    ip_address: '10.0.0.15',
    user_agent: 'AdvanciaApp/2.1.0',
    status: 'success',
  },
  {
    id: 'log_003',
    timestamp: '2024-12-20T14:25:03Z',
    action: 'user.password_change',
    category: 'security',
    actor: { id: 'usr_003', email: 'patient@email.com', role: 'patient' },
    resource: { type: 'user', id: 'usr_003' },
    details: { initiated_by: 'user', required_reauth: true },
    ip_address: '203.45.67.89',
    user_agent: 'Mozilla/5.0 Safari/17.0',
    status: 'success',
  },
  {
    id: 'log_004',
    timestamp: '2024-12-20T14:20:45Z',
    action: 'user.login_failed',
    category: 'auth',
    actor: { id: 'unknown', email: 'test@example.com', role: 'unknown' },
    resource: { type: 'session', id: 'sess_failed_001' },
    details: { reason: 'invalid_password', attempts: 3 },
    ip_address: '198.51.100.23',
    user_agent: 'curl/7.84.0',
    status: 'failure',
  },
  {
    id: 'log_005',
    timestamp: '2024-12-20T14:15:22Z',
    action: 'admin.role_changed',
    category: 'admin',
    actor: { id: 'usr_001', email: 'admin@advanciapayledger.com', role: 'admin' },
    resource: { type: 'user', id: 'usr_004' },
    details: { old_role: 'patient', new_role: 'provider', approved: true },
    ip_address: '192.168.1.45',
    user_agent: 'Mozilla/5.0 Chrome/120.0',
    status: 'success',
  },
  {
    id: 'log_006',
    timestamp: '2024-12-20T14:10:18Z',
    action: 'payment.refund_issued',
    category: 'payment',
    actor: { id: 'usr_001', email: 'admin@advanciapayledger.com', role: 'admin' },
    resource: { type: 'transaction', id: 'txn_ref_001' },
    details: { amount: 75.00, reason: 'customer_request', original_txn: 'txn_orig_001' },
    ip_address: '192.168.1.45',
    user_agent: 'Mozilla/5.0 Chrome/120.0',
    status: 'success',
  },
  {
    id: 'log_007',
    timestamp: '2024-12-20T14:05:00Z',
    action: 'system.rate_limit',
    category: 'system',
    actor: { id: 'unknown', email: 'unknown', role: 'unknown' },
    resource: { type: 'api', id: '/api/v1/transactions' },
    details: { limit: 100, current: 150, window_seconds: 60 },
    ip_address: '198.51.100.50',
    user_agent: 'python-requests/2.28',
    status: 'warning',
  },
  {
    id: 'log_008',
    timestamp: '2024-12-20T13:55:30Z',
    action: 'user.2fa_enabled',
    category: 'security',
    actor: { id: 'usr_005', email: 'doctor@clinic.com', role: 'provider' },
    resource: { type: 'user', id: 'usr_005' },
    details: { method: 'totp', backup_codes_generated: 8 },
    ip_address: '172.16.0.55',
    user_agent: 'Mozilla/5.0 Firefox/120.0',
    status: 'success',
  },
];

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg)',
  padding: '120px 24px 80px',
};

const containerStyle: CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '24px',
  flexWrap: 'wrap',
  gap: '16px',
};

const titleStyle: CSSProperties = {
  fontSize: '28px',
  fontWeight: 800,
  color: '#ffffff',
  marginBottom: '4px',
};

const subtitleStyle: CSSProperties = {
  fontSize: '15px',
  color: 'rgba(255,255,255,0.6)',
};

const filtersCardStyle: CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: '16px',
  padding: '20px',
  border: '1px solid rgba(255,255,255,0.06)',
  marginBottom: '20px',
};

const filtersRowStyle: CSSProperties = {
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap',
};

const filterGroupStyle: CSSProperties = {
  flex: '1',
  minWidth: '150px',
};

const filterLabelStyle: CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.5)',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.03)',
  color: '#ffffff',
  fontSize: '14px',
  outline: 'none',
};

const selectStyle: CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
};

const tableCardStyle: CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.06)',
  overflow: 'hidden',
};

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const thStyle: CSSProperties = {
  padding: '14px 16px',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  background: 'rgba(255,255,255,0.02)',
};

const tdStyle: CSSProperties = {
  padding: '14px 16px',
  fontSize: '14px',
  color: 'rgba(255,255,255,0.8)',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
};

const rowHoverStyle: CSSProperties = {
  cursor: 'pointer',
  transition: 'background 0.2s',
};

const badgeStyle = (type: 'success' | 'failure' | 'warning' | 'auth' | 'payment' | 'admin' | 'user' | 'system' | 'security'): CSSProperties => {
  const colors: Record<string, { bg: string; text: string }> = {
    success: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981' },
    failure: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' },
    warning: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
    auth: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' },
    payment: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981' },
    admin: { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7' },
    user: { bg: 'rgba(96, 128, 245, 0.15)', text: 'var(--primary)' },
    system: { bg: 'rgba(107, 114, 128, 0.15)', text: '#6b7280' },
    security: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' },
  };
  const c = colors[type] || colors.system;
  return {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    background: c.bg,
    color: c.text,
    textTransform: 'capitalize',
  };
};

const codeStyle: CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '12px',
  color: 'rgba(255,255,255,0.6)',
};

const modalOverlayStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '20px',
};

const modalStyle: CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: '20px',
  padding: '32px',
  width: '100%',
  maxWidth: '600px',
  maxHeight: '80vh',
  overflow: 'auto',
  border: '1px solid rgba(255,255,255,0.1)',
};

const modalHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '24px',
};

const modalTitleStyle: CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  color: '#ffffff',
};

const closeBtnStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'rgba(255,255,255,0.6)',
  fontSize: '24px',
  cursor: 'pointer',
};

const detailRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '120px 1fr',
  gap: '8px',
  padding: '12px 0',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};

const detailLabelStyle: CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.5)',
};

const detailValueStyle: CSSProperties = {
  fontSize: '14px',
  color: '#ffffff',
  wordBreak: 'break-all',
};

const jsonBoxStyle: CSSProperties = {
  background: 'rgba(0,0,0,0.3)',
  borderRadius: '8px',
  padding: '16px',
  marginTop: '16px',
  fontFamily: 'monospace',
  fontSize: '12px',
  color: '#10b981',
  whiteSpace: 'pre-wrap',
  overflow: 'auto',
};

const paginationStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px 20px',
  borderTop: '1px solid rgba(255,255,255,0.06)',
};

const paginationInfoStyle: CSSProperties = {
  fontSize: '14px',
  color: 'rgba(255,255,255,0.5)',
};

const paginationBtnsStyle: CSSProperties = {
  display: 'flex',
  gap: '8px',
};

const pageBtnStyle = (disabled: boolean): CSSProperties => ({
  padding: '8px 16px',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: disabled ? 'transparent' : 'rgba(255,255,255,0.05)',
  color: disabled ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.8)',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontWeight: 500,
  fontSize: '13px',
});

const exportBtnStyle: CSSProperties = {
  padding: '10px 20px',
  borderRadius: '10px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.8)',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
};

export const AuditLog: React.FC = () => {
  const [logs] = useState<AuditLogEntry[]>(mockLogs);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });

  const filteredLogs = logs.filter(log => {
    if (filters.search && !log.action.toLowerCase().includes(filters.search.toLowerCase()) &&
        !log.actor.email.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.category && log.category !== filters.category) return false;
    if (filters.status && log.status !== filters.status) return false;
    return true;
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleExport = () => {
    const data = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <div>
            <h1 style={titleStyle}>Audit Log</h1>
            <p style={subtitleStyle}>View all system activity and security events</p>
          </div>
          <button style={exportBtnStyle} onClick={handleExport}>
            ⬇️ Export JSON
          </button>
        </div>

        {/* Filters */}
        <div style={filtersCardStyle}>
          <div style={filtersRowStyle}>
            <div style={{ ...filterGroupStyle, minWidth: '200px' }}>
              <label style={filterLabelStyle}>Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
                placeholder="Action or email..."
                style={inputStyle}
              />
            </div>
            <div style={filterGroupStyle}>
              <label style={filterLabelStyle}>Category</label>
              <select
                value={filters.category}
                onChange={e => setFilters({ ...filters, category: e.target.value })}
                style={selectStyle}
              >
                <option value="">All Categories</option>
                <option value="auth">Authentication</option>
                <option value="payment">Payment</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
                <option value="system">System</option>
                <option value="security">Security</option>
              </select>
            </div>
            <div style={filterGroupStyle}>
              <label style={filterLabelStyle}>Status</label>
              <select
                value={filters.status}
                onChange={e => setFilters({ ...filters, status: e.target.value })}
                style={selectStyle}
              >
                <option value="">All Statuses</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
                <option value="warning">Warning</option>
              </select>
            </div>
            <div style={filterGroupStyle}>
              <label style={filterLabelStyle}>From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={e => setFilters({ ...filters, dateFrom: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div style={filterGroupStyle}>
              <label style={filterLabelStyle}>To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={e => setFilters({ ...filters, dateTo: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={tableCardStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Timestamp</th>
                <th style={thStyle}>Action</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Actor</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr
                  key={log.id}
                  style={rowHoverStyle}
                  onClick={() => setSelectedLog(log)}
                  onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={tdStyle}>{formatDate(log.timestamp)}</td>
                  <td style={tdStyle}>
                    <span style={codeStyle}>{log.action}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={badgeStyle(log.category)}>{log.category}</span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: '14px', color: '#ffffff' }}>{log.actor.email}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{log.actor.role}</div>
                  </td>
                  <td style={tdStyle}>
                    <span style={badgeStyle(log.status)}>{log.status}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={codeStyle}>{log.ip_address}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={paginationStyle}>
            <span style={paginationInfoStyle}>
              Showing {filteredLogs.length} of {logs.length} entries
            </span>
            <div style={paginationBtnsStyle}>
              <button style={pageBtnStyle(true)}>← Previous</button>
              <button style={pageBtnStyle(true)}>Next →</button>
            </div>
          </div>
        </div>

        {/* Detail Modal */}
        {selectedLog && (
          <div style={modalOverlayStyle} onClick={() => setSelectedLog(null)}>
            <div style={modalStyle} onClick={e => e.stopPropagation()}>
              <div style={modalHeaderStyle}>
                <h2 style={modalTitleStyle}>Log Details</h2>
                <button style={closeBtnStyle} onClick={() => setSelectedLog(null)}>×</button>
              </div>

              <div style={detailRowStyle}>
                <span style={detailLabelStyle}>ID</span>
                <span style={{ ...detailValueStyle, fontFamily: 'monospace' }}>{selectedLog.id}</span>
              </div>
              <div style={detailRowStyle}>
                <span style={detailLabelStyle}>Timestamp</span>
                <span style={detailValueStyle}>{new Date(selectedLog.timestamp).toLocaleString()}</span>
              </div>
              <div style={detailRowStyle}>
                <span style={detailLabelStyle}>Action</span>
                <span style={{ ...detailValueStyle, fontFamily: 'monospace' }}>{selectedLog.action}</span>
              </div>
              <div style={detailRowStyle}>
                <span style={detailLabelStyle}>Category</span>
                <span style={badgeStyle(selectedLog.category)}>{selectedLog.category}</span>
              </div>
              <div style={detailRowStyle}>
                <span style={detailLabelStyle}>Status</span>
                <span style={badgeStyle(selectedLog.status)}>{selectedLog.status}</span>
              </div>
              <div style={detailRowStyle}>
                <span style={detailLabelStyle}>Actor</span>
                <div>
                  <div style={detailValueStyle}>{selectedLog.actor.email}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    {selectedLog.actor.role} • {selectedLog.actor.id}
                  </div>
                </div>
              </div>
              <div style={detailRowStyle}>
                <span style={detailLabelStyle}>Resource</span>
                <div>
                  <div style={detailValueStyle}>{selectedLog.resource.type}</div>
                  <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}>
                    {selectedLog.resource.id}
                  </div>
                </div>
              </div>
              <div style={detailRowStyle}>
                <span style={detailLabelStyle}>IP Address</span>
                <span style={{ ...detailValueStyle, fontFamily: 'monospace' }}>{selectedLog.ip_address}</span>
              </div>
              <div style={detailRowStyle}>
                <span style={detailLabelStyle}>User Agent</span>
                <span style={{ ...detailValueStyle, fontSize: '13px' }}>{selectedLog.user_agent}</span>
              </div>

              <div style={{ marginTop: '16px' }}>
                <span style={detailLabelStyle}>Details</span>
                <div style={jsonBoxStyle}>
                  {JSON.stringify(selectedLog.details, null, 2)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLog;
