import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { api } from '../services/api';
import { Spinner } from '../components/Spinner';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  status: 'pending' | 'active' | 'suspended';
  last_login: string | null;
  created_at: string;
}

interface Transaction {
  id: string;
  amount: number;
  status: string;
  user_email: string;
  created_at: string;
}

interface DashboardData {
  overview: {
    totalUsers: number;
    pendingUsers: number;
    activeUsers: number;
    totalTransactions: number;
    totalRevenue: number;
  };
  recentTransactions: Transaction[];
  onlineUsers: User[];
}

type TabType = 'dashboard' | 'users' | 'transactions' | 'webhooks' | 'logs';

export function AdminConsole() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'suspend' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'suspended'>('all');

  // Check admin access
  useEffect(() => {
    if (user?.role !== 'admin') {
      showToast('Access denied. Admin privileges required.', 'error');
      navigate('/dashboard');
    }
  }, [user, navigate, showToast]);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    try {
      const response = await api.get<{ data: DashboardData }>('/admin/dashboard');
      setDashboardData(response.data);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Dashboard fetch error:', err);
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get<{ data: User[] }>('/admin/users');
      setUsers(response.data);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Users fetch error:', err);
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchUsers();
  }, [fetchDashboard, fetchUsers]);

  // Approve user
  const handleApproveUser = async () => {
    if (!selectedUser) return;
    try {
      await api.put(`/admin/users/${selectedUser.id}/status`, { status: 'active' });
      showToast(`User ${selectedUser.email} approved successfully`, 'success');
      setUsers(prev => prev.map(u =>
        u.id === selectedUser.id ? { ...u, status: 'active' as const } : u
      ));
    } catch (err) {
      showToast('Failed to approve user', 'error');
    } finally {
      setShowConfirm(false);
      setSelectedUser(null);
    }
  };

  // Suspend user
  const handleSuspendUser = async () => {
    if (!selectedUser) return;
    try {
      await api.put(`/admin/users/${selectedUser.id}/status`, { status: 'suspended' });
      showToast(`User ${selectedUser.email} suspended`, 'warning');
      setUsers(prev => prev.map(u =>
        u.id === selectedUser.id ? { ...u, status: 'suspended' as const } : u
      ));
    } catch (err) {
      showToast('Failed to suspend user', 'error');
    } finally {
      setShowConfirm(false);
      setSelectedUser(null);
    }
  };

  const openConfirm = (user: User, action: 'approve' | 'suspend') => {
    setSelectedUser(user);
    setConfirmAction(action);
    setShowConfirm(true);
  };

  // Filter users
  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#f59e0b',
      active: '#10b981',
      suspended: '#ef4444',
    };
    return {
      backgroundColor: colors[status] || '#6b7280',
      color: 'white',
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase' as const,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <Spinner size={48} />
        <p>Loading Admin Console...</p>
      </div>
    );
  }

  return (
    <div className="admin-console" style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a2e' }}>Admin Console</h1>
        <p style={{ color: '#6b7280', marginTop: '8px' }}>
          Manage users, monitor transactions, and view system analytics
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>
        {(['dashboard', 'users', 'transactions', 'webhooks', 'logs'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: activeTab === tab ? '#0066cc' : 'transparent',
              color: activeTab === tab ? 'white' : '#6b7280',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textTransform: 'capitalize',
            }}
          >
            {tab === 'dashboard' && '📊 '}
            {tab === 'users' && '👥 '}
            {tab === 'transactions' && '💳 '}
            {tab === 'webhooks' && '🔗 '}
            {tab === 'logs' && '📋 '}
            {tab}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && dashboardData && (
        <div>
          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <StatCard
              title="Total Users"
              value={dashboardData.overview.totalUsers}
              icon="👥"
              color="#0066cc"
            />
            <StatCard
              title="Pending Approval"
              value={dashboardData.overview.pendingUsers}
              icon="⏳"
              color="#f59e0b"
            />
            <StatCard
              title="Active Users"
              value={dashboardData.overview.activeUsers}
              icon="✅"
              color="#10b981"
            />
            <StatCard
              title="Total Transactions"
              value={dashboardData.overview.totalTransactions}
              icon="💳"
              color="#8b5cf6"
            />
            <StatCard
              title="Total Revenue"
              value={formatCurrency(dashboardData.overview.totalRevenue)}
              icon="💰"
              color="#059669"
            />
          </div>

          {/* Online Users */}
          <div style={{ background: '#131625', borderRadius: '12px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#e2e8f0' }}>
              🟢 Currently Online Users
            </h3>
            {dashboardData.onlineUsers.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {dashboardData.onlineUsers.map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '20px' }}>
                    <span style={{ width: '8px', height: '8px', background: '#34d399', borderRadius: '50%' }}></span>
                    <span style={{ color: '#e2e8f0' }}>{u.email}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#94a3b8' }}>No users currently online</p>
            )}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)',
                color: '#e2e8f0',
                minWidth: '250px',
                fontSize: '14px',
              }}
            />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: '#131625',
                color: '#e2e8f0',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {/* Users Table */}
          <div style={{ background: '#131625', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#181b2e' }}>
                  <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>User</th>
                  <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>Role</th>
                  <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>Last Login</th>
                  <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>Registered</th>
                  <th style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '16px' }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#e2e8f0' }}>{u.full_name || 'No name'}</div>
                        <div style={{ color: '#94a3b8', fontSize: '14px' }}>{u.email}</div>
                      </div>
                    </td>
                    <td style={{ padding: '16px', textTransform: 'capitalize', color: '#e2e8f0' }}>{u.role}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={getStatusBadge(u.status)}>{u.status}</span>
                    </td>
                    <td style={{ padding: '16px', color: '#94a3b8', fontSize: '14px' }}>
                      {u.last_login ? formatDate(u.last_login) : 'Never'}
                    </td>
                    <td style={{ padding: '16px', color: '#94a3b8', fontSize: '14px' }}>
                      {formatDate(u.created_at)}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        {u.status === 'pending' && (
                          <button
                            onClick={() => openConfirm(u, 'approve')}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              background: '#10b981',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: '500',
                            }}
                          >
                            ✓ Approve
                          </button>
                        )}
                        {u.status !== 'suspended' && (
                          <button
                            onClick={() => openConfirm(u, 'suspend')}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              background: '#ef4444',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: '500',
                            }}
                          >
                            ✕ Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <TransactionsTab formatCurrency={formatCurrency} formatDate={formatDate} />
      )}

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <WebhooksTab formatDate={formatDate} />
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <AuditLogsTab formatDate={formatDate} />
      )}

      {/* Confirm Dialog */}
      {showConfirm && selectedUser && (
        <ConfirmDialog
          isOpen={showConfirm}
          title={confirmAction === 'approve' ? 'Approve User' : 'Suspend User'}
          message={
            confirmAction === 'approve'
              ? `Are you sure you want to approve ${selectedUser.email}? They will be able to log in and use the platform.`
              : `Are you sure you want to suspend ${selectedUser.email}? They will lose access to the platform.`
          }
          confirmText={confirmAction === 'approve' ? 'Approve' : 'Suspend'}
          variant={confirmAction === 'approve' ? 'info' : 'danger'}
          onConfirm={confirmAction === 'approve' ? handleApproveUser : handleSuspendUser}
          onCancel={() => {
            setShowConfirm(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}

// Transactions Tab Component
function TransactionsTab({ formatCurrency, formatDate }: { formatCurrency: (cents: number) => string; formatDate: (d: string) => string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const response = await api.get<{ data: Transaction[] }>('/admin/transactions');
        setTransactions(response.data || []);
      } catch (err) {
        setError('Failed to load transactions');
        if (import.meta.env.DEV) console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div style={{ padding: '24px', textAlign: 'center' }}><Spinner size={32} /></div>;
  if (error) return <div style={{ padding: '24px', color: '#ef4444' }}>{error}</div>;

  return (
    <div style={{ background: '#131625', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#181b2e' }}>
            <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>ID</th>
            <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>User</th>
            <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>Amount</th>
            <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>Status</th>
            <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 ? (
            <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No transactions found</td></tr>
          ) : transactions.map(tx => (
            <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <td style={{ padding: '16px', fontFamily: 'monospace', fontSize: '13px', color: '#a5b4fc' }}>{tx.id.slice(0, 8)}...</td>
              <td style={{ padding: '16px', fontSize: '14px', color: '#e2e8f0' }}>{tx.user_email}</td>
              <td style={{ padding: '16px', fontWeight: '600', color: '#e2e8f0' }}>{formatCurrency(tx.amount)}</td>
              <td style={{ padding: '16px' }}>
                <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', background: tx.status === 'completed' ? '#d1fae5' : tx.status === 'pending' ? '#fef3c7' : '#fee2e2', color: tx.status === 'completed' ? '#065f46' : tx.status === 'pending' ? '#92400e' : '#991b1b' }}>{tx.status}</span>
              </td>
              <td style={{ padding: '16px', color: '#94a3b8', fontSize: '14px' }}>{formatDate(tx.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Webhooks Tab Component
function WebhooksTab({ formatDate }: { formatDate: (d: string) => string }) {
  interface WebhookEvent { id: string; event_type: string; status: string; created_at: string; }
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const response = await api.get<{ data: WebhookEvent[] }>('/admin/webhooks');
        setEvents(response.data || []);
      } catch (err) {
        setError('Failed to load webhook events');
        if (import.meta.env.DEV) console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div style={{ padding: '24px', textAlign: 'center' }}><Spinner size={32} /></div>;
  if (error) return <div style={{ padding: '24px', color: '#ef4444' }}>{error}</div>;

  return (
    <div style={{ background: '#131625', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#181b2e' }}>
            <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>Event Type</th>
            <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>Status</th>
            <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {events.length === 0 ? (
            <tr><td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No webhook events found</td></tr>
          ) : events.map(evt => (
            <tr key={evt.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <td style={{ padding: '16px', fontFamily: 'monospace', fontSize: '13px', color: '#a5b4fc' }}>{evt.event_type}</td>
              <td style={{ padding: '16px' }}>
                <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', background: evt.status === 'processed' ? '#d1fae5' : '#fef3c7', color: evt.status === 'processed' ? '#065f46' : '#92400e' }}>{evt.status}</span>
              </td>
              <td style={{ padding: '16px', color: '#94a3b8', fontSize: '14px' }}>{formatDate(evt.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Audit Logs Tab Component
function AuditLogsTab({ formatDate }: { formatDate: (d: string) => string }) {
  interface AuditLog { id: string; action: string; actor_email: string; details: string; created_at: string; }
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const response = await api.get<{ data: AuditLog[] }>('/admin/audit-log');
        setLogs(response.data || []);
      } catch (err) {
        setError('Failed to load audit logs');
        if (import.meta.env.DEV) console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div style={{ padding: '24px', textAlign: 'center' }}><Spinner size={32} /></div>;
  if (error) return <div style={{ padding: '24px', color: '#ef4444' }}>{error}</div>;

  return (
    <div style={{ background: '#131625', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#181b2e' }}>
            <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>Action</th>
            <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>Actor</th>
            <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>Details</th>
            <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No audit logs found</td></tr>
          ) : logs.map(log => (
            <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <td style={{ padding: '16px', fontWeight: '500', color: '#e2e8f0' }}>{log.action}</td>
              <td style={{ padding: '16px', fontSize: '14px', color: '#e2e8f0' }}>{log.actor_email}</td>
              <td style={{ padding: '16px', color: '#94a3b8', fontSize: '14px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.details}</td>
              <td style={{ padding: '16px', color: '#94a3b8', fontSize: '14px' }}>{formatDate(log.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, icon, color }: { title: string; value: string | number; icon: string; color: string }) {
  return (
    <div style={{
      background: '#131625',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid rgba(255,255,255,0.08)',
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>{title}</p>
          <p style={{ fontSize: '24px', fontWeight: '700', color: '#e2e8f0' }}>{value}</p>
        </div>
        <span style={{ fontSize: '28px' }}>{icon}</span>
      </div>
    </div>
  );
}

export default AdminConsole;
