import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { api } from '../services/api';
import { Spinner } from '../components/Spinner';

interface Transaction {
  id: string;
  amount: number;
  status: string;
  type: 'send' | 'receive' | 'payment' | 'convert';
  created_at: string;
}

export function Dashboard() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const txResponse = await api.get<{ success: boolean; data: Transaction[] }>(
        '/transactions?limit=10'
      );
      if (txResponse.success) {
        setTransactions(txResponse.data || []);
      }
    } catch {
      console.log('Dashboard data not available');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      completed: 'badge-success',
      pending: 'badge-warning',
      failed: 'badge-error',
      refunded: 'badge-info',
    };
    return statusClasses[status] || 'badge-default';
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      send: '↗️',
      receive: '↙️',
      payment: '💳',
      convert: '🔄',
    };
    return icons[type] || '💰';
  };

  return (
    <div className="dashboard-page" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a2e' }}>
            Welcome back, {user?.email?.split('@')[0]}
          </h1>
          <p style={{ color: '#6b7280', marginTop: '8px' }}>
            Manage your payments and healthcare services
          </p>
        </div>
      </div>

      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {/* Quick Actions */}
        <div className="dashboard-card" style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>Quick Actions</h3>
          <div className="quick-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <ActionButton href="/payment" icon="💳" label="Make Payment" />
            <ActionButton href="/appointments" icon="📅" label="Appointments" />
            <ActionButton href="/wallet" icon="🦊" label="Connect Wallet" />
            <ActionButton href="/profile" icon="👤" label="View Profile" />
            {user?.role === 'provider' && (
              <ActionButton href="/provider" icon="👨‍⚕️" label="Provider Panel" />
            )}
            {user?.role === 'admin' && (
              <ActionButton href="/admin" icon="⚙️" label="Admin Console" />
            )}
            <ActionButton href="/security" icon="🔐" label="Security" />
            <ActionButton href="/history" icon="📊" label="History" />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="dashboard-card" style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>Recent Activity</h3>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '20px 0' }}>
              <Spinner size={24} />
              <span style={{ color: '#6b7280' }}>Loading activity...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
              <p style={{ fontSize: '48px', marginBottom: '16px' }}>📭</p>
              <p style={{ marginBottom: '16px' }}>No transactions yet</p>
              <Link to="/payment" style={{ display: 'inline-block', padding: '12px 24px', background: '#667eea', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: '600' }}>
                Make your first payment
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f9fafb', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>{getTypeIcon(tx.type)}</span>
                    <div>
                      <p style={{ fontWeight: '500', fontSize: '14px' }}>{tx.id.slice(0, 8)}...</p>
                      <p style={{ color: '#6b7280', fontSize: '12px' }}>{formatDate(tx.created_at)}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: '600', color: tx.type === 'receive' ? '#10b981' : '#1a1a2e' }}>
                      {tx.type === 'receive' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </p>
                    <span className={`badge ${getStatusBadge(tx.status)}`} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px' }}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Action Button Component
function ActionButton({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      to={href}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 12px',
        background: '#f8fafc',
        borderRadius: '12px',
        textDecoration: 'none',
        color: '#1a1a2e',
        transition: 'all 0.2s',
        border: '1px solid #e2e8f0',
      }}
    >
      <span style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</span>
      <span style={{ fontSize: '13px', fontWeight: '500', textAlign: 'center' }}>{label}</span>
    </Link>
  );
}

export default Dashboard;
