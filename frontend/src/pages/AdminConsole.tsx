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
      console.error('Dashboard fetch error:', err);
      // Use mock data for demo
      setDashboardData({
        overview: {
          totalUsers: 156,
          pendingUsers: 12,
          activeUsers: 142,
          totalTransactions: 1847,
          totalRevenue: 284500,
        },
        recentTransactions: [],
        onlineUsers: [],
      });
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
      // Mock data
      setUsers([
        {
          id: '1',
          email: 'john@example.com',
          full_name: 'John Doe',
          phone: '+1234567890',
          role: 'patient',
          status: 'pending',
          last_login: null,
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          email: 'jane@example.com',
          full_name: 'Jane Smith',
          phone: '+1987654321',
          role: 'patient',
          status: 'active',
          last_login: new Date().toISOString(),
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ]);
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
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              🟢 Currently Online Users
            </h3>
            {dashboardData.onlineUsers.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {dashboardData.onlineUsers.map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#f0fdf4', borderRadius: '20px' }}>
                    <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></span>
                    <span>{u.email}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#6b7280' }}>No users currently online</p>
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
                border: '1px solid #e5e7eb',
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
                border: '1px solid #e5e7eb',
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
          <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>User</th>
                  <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Role</th>
                  <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                  <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Last Login</th>
                  <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Registered</th>
                  <th style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '16px' }}>
                      <div>
                        <div style={{ fontWeight: '600' }}>{u.full_name || 'No name'}</div>
                        <div style={{ color: '#6b7280', fontSize: '14px' }}>{u.email}</div>
                      </div>
                    </td>
                    <td style={{ padding: '16px', textTransform: 'capitalize' }}>{u.role}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={getStatusBadge(u.status)}>{u.status}</span>
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
                      {u.last_login ? formatDate(u.last_login) : 'Never'}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
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
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Recent Transactions</h3>
          <p style={{ color: '#6b7280' }}>Transaction monitoring and management coming soon...</p>
        </div>
      )}

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Webhook Events</h3>
          <p style={{ color: '#6b7280' }}>Stripe webhook event logs coming soon...</p>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Audit Logs</h3>
          <p style={{ color: '#6b7280' }}>Compliance and security audit logs coming soon...</p>
        </div>
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

// Stat Card Component
function StatCard({ title, value, icon, color }: { title: string; value: string | number; icon: string; color: string }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>{title}</p>
          <p style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a2e' }}>{value}</p>
        </div>
        <span style={{ fontSize: '28px' }}>{icon}</span>
      </div>
    </div>
  );
}

export default AdminConsole;
