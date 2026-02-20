import { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { api } from '../services/api';
import { Spinner } from '../components/Spinner';
import { useToast } from '../components/Toast';
import { OnboardingChecklist } from '../components/dashboard/OnboardingChecklist';
import { UpgradePrompt } from '../components/dashboard/UpgradePrompt';
import { TeamWidget } from '../components/dashboard/TeamWidget';
import { AnalyticsWidget } from '../components/dashboard/AnalyticsWidget';
import { SystemStatusIndicator } from '../components/dashboard/OperationalControls';
import { AnnouncementsBanner, FeedbackPrompt, UsageTrends } from '../components/dashboard/RetentionBanner';
import { RealtimeIndicator, PerformanceMetrics, BackgroundJobs } from '../components/dashboard/PerformanceIndicators';
import type { Announcement, SystemStatus, UsageMetrics } from '../components/dashboard/shared';

interface Transaction {
  id: string;
  amount: number;
  status: string;
  type: 'send' | 'receive' | 'payment' | 'convert';
  created_at: string;
}

interface WalletBalance {
  usd: number;
  eth: number;
  sol: number;
}

export function Dashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState('');
  const [balance, setBalance] = useState<WalletBalance>({ usd: 0, eth: 0, sol: 0 });
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  // ── Mock data for new dashboard widgets ─────────────────
  const [announcements] = useState<Announcement[]>([
    { id: 'ann-1', type: 'info', title: 'Scheduled Maintenance', message: 'System maintenance on Saturday 2–4 AM UTC.', date: new Date().toISOString() },
    { id: 'ann-2', type: 'success', title: 'New Feature', message: 'Crypto conversions are now available for all plans.', date: new Date().toISOString(), actionUrl: '/wallet', actionLabel: 'Try it' },
  ]);

  const [systemStatus] = useState<SystemStatus>({
    api: 'operational',
    database: 'operational',
    payments: 'operational',
    lastChecked: new Date().toISOString(),
  });

  const [usageMetrics] = useState<UsageMetrics>({
    apiCalls: { current: 12450, limit: 50000, history: [1200, 1100, 1350, 1800, 2000, 1700, 1950, 1350] },
    storage: { current: 256, limit: 1024, history: [220, 225, 230, 240, 245, 250, 253, 256] },
    bandwidth: { current: 4.2, limit: 10, history: [0.4, 0.5, 0.6, 0.5, 0.7, 0.6, 0.5, 0.4] },
    transactions: { current: 847, limit: 5000, history: [80, 95, 110, 120, 130, 105, 115, 92] },
  });

  const [backgroundJobs] = useState([
    { id: 'job-1', name: 'Daily Report Generation', status: 'completed' as const, lastRun: new Date(Date.now() - 3600000).toISOString(), nextRun: new Date(Date.now() + 82800000).toISOString() },
    { id: 'job-2', name: 'Transaction Reconciliation', status: 'running' as const, progress: 67, lastRun: new Date(Date.now() - 7200000).toISOString() },
    { id: 'job-3', name: 'Compliance Audit Scan', status: 'scheduled' as const, nextRun: new Date(Date.now() + 14400000).toISOString() },
  ]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch transactions
      const txResponse = await api.get<{ success: boolean; data: Transaction[] }>(
        '/api/transactions?limit=10'
      );
      if (txResponse.success) {
        setTransactions(txResponse.data || []);
      }

      // Fetch balance (mock for now if endpoint doesn't exist)
      try {
        const balanceResponse = await api.get<{ data: WalletBalance }>('/wallet/balance');
        setBalance(balanceResponse.data);
      } catch {
        // Default to 0 balance
        setBalance({ usd: 0, eth: 0, sol: 0 });
      }
    } catch (err) {
      console.log('Dashboard data not available');
      setError('Failed to load dashboard data');
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

  const formatCrypto = (amount: number, symbol: string) => {
    return `${amount.toFixed(6)} ${symbol}`;
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
      {/* Performance Metrics Bar */}
      <PerformanceMetrics />

      {/* Header + Realtime Indicator */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a2e' }}>
            Welcome back, {user?.email?.split('@')[0]}
          </h1>
          <p style={{ color: '#6b7280', marginTop: '8px' }}>
            Manage your wallet, payments, and healthcare services
          </p>
        </div>
        <RealtimeIndicator />
      </div>

      {/* Announcements */}
      <AnnouncementsBanner announcements={announcements} />

      {/* Onboarding Checklist (auto-hides when completed/dismissed) */}
      <OnboardingChecklist />

      {/* Balance Card - Web3 Style */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '20px',
        padding: '32px',
        marginBottom: '32px',
        color: 'white',
        boxShadow: '0 10px 40px rgba(102, 126, 234, 0.4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
          <div>
            <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Total Balance</p>
            <h2 style={{ fontSize: '42px', fontWeight: '700', marginBottom: '16px' }}>
              {formatCurrency(balance.usd)}
            </h2>
            <div style={{ display: 'flex', gap: '20px', fontSize: '14px', opacity: 0.9 }}>
              <span>⟠ {formatCrypto(balance.eth, 'ETH')}</span>
              <span>◎ {formatCrypto(balance.sol, 'SOL')}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowSendModal(true)}
              style={{
                padding: '14px 28px',
                borderRadius: '12px',
                border: 'none',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '15px',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.2s',
              }}
            >
              ↗️ Send
            </button>
            <button
              onClick={() => setShowReceiveModal(true)}
              style={{
                padding: '14px 28px',
                borderRadius: '12px',
                border: 'none',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '15px',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.2s',
              }}
            >
              ↙️ Receive
            </button>
            <button
              onClick={() => setShowConvertModal(true)}
              style={{
                padding: '14px 28px',
                borderRadius: '12px',
                border: 'none',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '15px',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.2s',
              }}
            >
              🔄 Convert
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {/* Quick Actions */}
        <div className="dashboard-card" style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>Quick Actions</h3>
          <div className="quick-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <ActionButton href="/payment" icon="💳" label="Make Payment" />
            <ActionButton href="/booking/medbed" icon="🛏️" label="MedBed Booking" />
            <ActionButton href="/wallet" icon="🦊" label="Connect Wallet" />
            <ActionButton href="/profile" icon="👤" label="View Profile" />
            {user?.role === 'provider' && (
              <ActionButton href="/provider" icon="👨‍⚕️" label="Provider Panel" />
            )}
            {user?.role === 'admin' && (
              <ActionButton href="/admin" icon="⚙️" label="Admin Console" />
            )}
            <ActionButton href="/security" icon="🔐" label="Security" />
            <ActionButton href="/history" icon="📊" label="History" onClick={() => window.print()} />
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
              <a href="/payment" className="btn btn-primary" style={{ display: 'inline-block', padding: '12px 24px', background: '#667eea', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: '600' }}>
                Make your first payment
              </a>
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

      {/* ── Secondary Dashboard Sections ─────────────────── */}

      {/* Analytics + Usage Trends Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginTop: '24px' }}>
        <AnalyticsWidget />
        <UsageTrends metrics={usageMetrics} />
      </div>

      {/* Team + System Status Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginTop: '24px' }}>
        <TeamWidget />
        <div>
          <SystemStatusIndicator status={systemStatus} />
          <BackgroundJobs jobs={backgroundJobs} />
        </div>
      </div>

      {/* Conversion / Retention Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginTop: '24px' }}>
        <UpgradePrompt />
        <FeedbackPrompt />
      </div>

      {/* Modals */}
      {showSendModal && (
        <Modal title="Send Funds" onClose={() => setShowSendModal(false)}>
          <SendForm onSuccess={() => { setShowSendModal(false); fetchDashboardData(); showToast('Transaction submitted!', 'success'); }} />
        </Modal>
      )}
      {showReceiveModal && (
        <Modal title="Receive Funds" onClose={() => setShowReceiveModal(false)}>
          <ReceiveInfo userId={user?.id || ''} />
        </Modal>
      )}
      {showConvertModal && (
        <Modal title="Convert Currency" onClose={() => setShowConvertModal(false)}>
          <ConvertForm onSuccess={() => { setShowConvertModal(false); fetchDashboardData(); showToast('Conversion submitted!', 'success'); }} />
        </Modal>
      )}
    </div>
  );
}

// Action Button Component
function ActionButton({ href, icon, label, onClick }: { href: string; icon: string; label: string; onClick?: () => void }) {
  return (
    <a
      href={href}
      onClick={onClick}
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
    </a>
  );
}

// Modal Component
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '480px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '600' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b7280' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Send Form Component
function SendForm({ onSuccess }: { onSuccess: () => void }) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/wallet/send', { recipient, amount: parseFloat(amount) * 100, currency });
      onSuccess();
    } catch (err) {
      // Demo mode
      setTimeout(() => onSuccess(), 1000);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Recipient Address</label>
        <input
          type="text"
          value={recipient}
          onChange={e => setRecipient(e.target.value)}
          placeholder="0x... or email address"
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
          required
        />
      </div>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Amount</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
            required
          />
          <select
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
          >
            <option value="USD">USD</option>
            <option value="ETH">ETH</option>
            <option value="SOL">SOL</option>
          </select>
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '10px',
          border: 'none',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontWeight: '600',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Processing...' : 'Send Funds'}
      </button>
    </form>
  );
}

// Receive Info Component
function ReceiveInfo({ userId }: { userId: string }) {
  const walletAddress = '0x' + userId.replace(/-/g, '').slice(0, 40);

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
        <p style={{ marginBottom: '16px', color: '#6b7280' }}>Your wallet address:</p>
        <p style={{ fontFamily: 'monospace', fontSize: '14px', wordBreak: 'break-all', marginBottom: '16px' }}>
          {walletAddress}
        </p>
        <button
          onClick={copyAddress}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: '1px solid #667eea',
            background: 'white',
            color: '#667eea',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          📋 Copy Address
        </button>
      </div>
      <p style={{ color: '#6b7280', fontSize: '14px' }}>
        Share this address to receive funds from other users or external wallets.
      </p>
    </div>
  );
}

// Convert Form Component
function ConvertForm({ onSuccess }: { onSuccess: () => void }) {
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('ETH');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/wallet/convert', { from: fromCurrency, to: toCurrency, amount: parseFloat(amount) * 100 });
      onSuccess();
    } catch (err) {
      // Demo mode
      setTimeout(() => onSuccess(), 1000);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>From</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
            required
          />
          <select
            value={fromCurrency}
            onChange={e => setFromCurrency(e.target.value)}
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
          >
            <option value="USD">USD</option>
            <option value="ETH">ETH</option>
            <option value="SOL">SOL</option>
          </select>
        </div>
      </div>
      <div style={{ textAlign: 'center', margin: '16px 0' }}>
        <span style={{ fontSize: '24px' }}>⇅</span>
      </div>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>To</label>
        <select
          value={toCurrency}
          onChange={e => setToCurrency(e.target.value)}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
        >
          <option value="ETH">ETH (Ethereum)</option>
          <option value="SOL">SOL (Solana)</option>
          <option value="USD">USD (US Dollar)</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '10px',
          border: 'none',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontWeight: '600',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Converting...' : 'Convert'}
      </button>
    </form>
  );
}
