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

interface LinkedWallet {
  id: string;
  walletAddress: string;
  network: string;
  label: string;
  verificationStatus: string;
  isPrimaryPayout: boolean;
  payoutEnabled: boolean;
  payoutCurrency: string;
}

export function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<LinkedWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const fetchDashboardData = async () => {
    setFetchError(null);
    try {
      const [txResponse, walletResponse] = await Promise.allSettled([
        api.get<{ success: boolean; data: Transaction[] }>('/transactions?limit=10'),
        api.get<{ success: boolean; data: LinkedWallet[] }>('/wallet/list'),
      ]);
      if (txResponse.status === 'fulfilled' && txResponse.value.success) {
        setTransactions(txResponse.value.data || []);
      }
      if (walletResponse.status === 'fulfilled' && walletResponse.value.success) {
        setWallets(walletResponse.value.data || []);
      }
      // Mark error if both failed
      if (txResponse.status === 'rejected' && walletResponse.status === 'rejected') {
        setFetchError('Unable to load dashboard data. Please try again.');
      }
    } catch {
      setFetchError('Unable to load dashboard data. Please try again.');
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
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#e2e8f0' }}>
            Welcome back, {user?.email?.split('@')[0]}
          </h1>
          <p style={{ color: '#94a3b8', marginTop: '8px' }}>
            Manage your payments and healthcare services
          </p>
        </div>
      </div>

      {fetchError && (
        <div role="alert" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '14px 18px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fca5a5', fontSize: '0.9rem' }}>
          <span>⚠️ {fetchError}</span>
          <button onClick={fetchDashboardData} style={{ background: 'rgba(239,68,68,0.2)', border: 'none', borderRadius: '8px', padding: '6px 14px', color: '#fca5a5', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>
            Retry
          </button>
        </div>
      )}

      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {/* Wallets Card */}
        <div className="dashboard-card" style={{ background: 'linear-gradient(135deg, #4a67e8, #6080f5)', color: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 18px rgba(96,128,245,0.28)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Linked Wallets</h3>
            <button
              onClick={() => setShowBalance(!showBalance)}
              style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '16px' }}
              title={showBalance ? 'Hide addresses' : 'Show addresses'}
            >
              {showBalance ? '👁️' : '🔒'}
            </button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.8 }}><Spinner size={18} /><span style={{ fontSize: '14px' }}>Loading wallets…</span></div>
          ) : wallets.length === 0 ? (
            <div>
              <p style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>No wallets linked</p>
              <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '16px' }}>Connect MetaMask to start receiving payments</p>
              <Link to="/wallet" style={{ display: 'inline-block', padding: '8px 18px', background: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>
                Connect Wallet →
              </Link>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>{wallets.length} wallet{wallets.length !== 1 ? 's' : ''}</p>
              <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '16px' }}>
                {wallets.filter(w => w.payoutEnabled).length} payout-enabled
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {wallets.slice(0, 3).map(w => (
                  <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                    <span style={{ fontFamily: 'monospace', opacity: 0.9 }}>
                      {showBalance
                        ? `${w.walletAddress.slice(0, 8)}…${w.walletAddress.slice(-6)}`
                        : '••••••••••••'}
                    </span>
                    <span style={{ opacity: 0.75, fontSize: '11px', textTransform: 'capitalize' }}>{w.network}</span>
                  </div>
                ))}
              </div>
              <Link to="/wallet" style={{ display: 'inline-block', marginTop: '14px', padding: '8px 18px', background: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>
                Manage Wallets →
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="dashboard-card" style={{ background: '#131625', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#e2e8f0' }}>Quick Actions</h3>
          <div className="quick-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <ActionButton href="/payment" icon="💳" label="Make Payment" />
            <ActionButton href="/wallet-balance" icon="💰" label="Wallet Balance" />
            <ActionButton href="/withdraw" icon="🏦" label="Withdraw" />
            <ActionButton href="/convert" icon="🔄" label="Convert" />
            <ActionButton href="/appointments" icon="📅" label="Appointments" />
            <ActionButton href="/wallet" icon="🦊" label="Link Wallet" />
            <ActionButton href="/history" icon="📊" label="History" />
            <ActionButton href="/medbed" icon="🏥" label="MedBed" />
            <ActionButton href="/notifications" icon="🔔" label="Notifications" />
            <ActionButton href="/security" icon="🔐" label="Security" />
            <ActionButton href="/profile" icon="👤" label="Profile" />
            {user?.role === 'provider' && (
              <ActionButton href="/provider" icon="👨‍⚕️" label="Provider Panel" />
            )}
            {user?.role === 'admin' && (
              <ActionButton href="/admin" icon="⚙️" label="Admin Console" />
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="dashboard-card" style={{ background: '#131625', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#e2e8f0' }}>Recent Activity</h3>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '20px 0' }}>
              <Spinner size={24} />
              <span style={{ color: '#94a3b8' }}>Loading activity...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <p style={{ fontSize: '48px', marginBottom: '16px' }}>📭</p>
              <p style={{ marginBottom: '16px' }}>No transactions yet</p>
              <Link to="/payment" style={{ display: 'inline-block', padding: '12px 24px', background: '#667eea', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: '600' }}>
                Make your first payment
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#181b2e', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>{getTypeIcon(tx.type)}</span>
                    <div>
                      <p style={{ fontWeight: '500', fontSize: '14px', color: '#e2e8f0' }}>{tx.id.slice(0, 8)}...</p>
                      <p style={{ color: '#94a3b8', fontSize: '12px' }}>{formatDate(tx.created_at)}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: '600', color: tx.type === 'receive' ? '#34d399' : '#e2e8f0' }}>
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
        background: '#181b2e',
        borderRadius: '12px',
        textDecoration: 'none',
        color: '#e2e8f0',
        transition: 'all 0.2s',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <span style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</span>
      <span style={{ fontSize: '13px', fontWeight: '500', textAlign: 'center' }}>{label}</span>
    </Link>
  );
}

export default Dashboard;
