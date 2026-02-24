import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Spinner } from '../components/Spinner';

interface LinkedWallet {
  id: string;
  walletAddress: string;
  network: string;
  label: string;
  verificationStatus: string;
  isPrimaryPayout: boolean;
  payoutEnabled: boolean;
  minPayoutAmount: number;
  payoutCurrency: string;
  createdAt: string;
}

const NETWORK_ICONS: Record<string, string> = {
  ethereum: '⟠',
  polygon: '⬡',
  base: '🔵',
  arbitrum: '🔷',
  solana: '◎',
};

const NETWORK_COLORS: Record<string, string> = {
  ethereum: '#627eea',
  polygon: '#8247e5',
  base: '#0052ff',
  arbitrum: '#28a0f0',
  solana: '#9945ff',
};

const STATUS_COLORS: Record<string, string> = {
  verified: '#34d399',
  pending: '#fbbf24',
  failed: '#f87171',
  revoked: '#94a3b8',
};

export function WalletBalance() {
  const [wallets, setWallets] = useState<LinkedWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddresses, setShowAddresses] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      const res = await api.get<{ success: boolean; data: LinkedWallet[] }>('/wallet/list');
      if (res.success) setWallets(res.data || []);
      else setError('Failed to load wallets');
    } catch {
      setError('Unable to reach wallet service');
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = (id: string, address: string) => {
    navigator.clipboard.writeText(address).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const container: React.CSSProperties = {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '32px 24px',
  };

  const card: React.CSSProperties = {
    background: '#0f1729',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '20px',
  };

  return (
    <div style={container}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--fs-h2)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)', margin: 0 }}>
            Wallet Balance
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '15px' }}>
            Manage and monitor your linked blockchain wallets
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setShowAddresses(a => !a)}
            style={{ padding: '8px 16px', background: '#162040', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}
          >
            {showAddresses ? '🔒 Hide' : '👁️ Show'} Addresses
          </button>
          <Link to="/wallet" style={{ padding: '10px 20px', background: 'var(--primary)', color: 'white', borderRadius: '10px', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
            + Link New Wallet
          </Link>
        </div>
      </div>

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Total Wallets', value: loading ? '–' : String(wallets.length) },
          { label: 'Verified', value: loading ? '–' : String(wallets.filter(w => w.verificationStatus === 'verified').length) },
          { label: 'Payout Enabled', value: loading ? '–' : String(wallets.filter(w => w.payoutEnabled).length) },
          { label: 'Primary Payout', value: loading ? '–' : (wallets.find(w => w.isPrimaryPayout)?.network || 'None') },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#0f1729', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '18px 20px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>{stat.label}</p>
            <p style={{ color: 'var(--text-primary)', fontSize: '22px', fontWeight: '700' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Wallets list */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Linked Wallets</h2>
          {!loading && wallets.length > 0 && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{wallets.length} wallet{wallets.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '24px 0' }}>
            <Spinner size={24} />
            <span style={{ color: 'var(--text-muted)' }}>Loading wallets…</span>
          </div>
        ) : error ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--error)' }}>
            <p style={{ marginBottom: '12px' }}>{error}</p>
            <button onClick={fetchWallets} style={{ padding: '8px 20px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>Retry</button>
          </div>
        ) : wallets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <p style={{ fontSize: '40px', marginBottom: '16px' }}>🔗</p>
            <p style={{ color: 'var(--text-primary)', fontWeight: '600', marginBottom: '8px', fontSize: '16px' }}>No wallets linked yet</p>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '14px' }}>Connect MetaMask or another Web3 wallet to get started</p>
            <Link to="/wallet" style={{ display: 'inline-block', padding: '12px 28px', background: 'var(--primary)', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
              Connect Wallet
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {wallets.map(wallet => (
              <div key={wallet.id} style={{ background: '#162040', borderRadius: '12px', padding: '18px 20px', border: wallet.isPrimaryPayout ? '1px solid rgba(96,128,245,0.5)' : '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `${NETWORK_COLORS[wallet.network] || '#6080f5'}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', border: `1px solid ${NETWORK_COLORS[wallet.network] || '#6080f5'}44` }}>
                      {NETWORK_ICONS[wallet.network] || '🔗'}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '15px' }}>
                          {wallet.label || `${wallet.network.charAt(0).toUpperCase() + wallet.network.slice(1)} Wallet`}
                        </span>
                        {wallet.isPrimaryPayout && (
                          <span style={{ background: 'rgba(96,128,245,0.15)', color: '#8ea4f8', fontSize: '10px', padding: '2px 8px', borderRadius: '100px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Primary</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-muted)' }}>
                          {showAddresses
                            ? `${wallet.walletAddress.slice(0, 10)}…${wallet.walletAddress.slice(-8)}`
                            : '••••••••••••••••••'}
                        </span>
                        {showAddresses && (
                          <button
                            onClick={() => copyAddress(wallet.id, wallet.walletAddress)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px', padding: '2px 4px' }}
                            title="Copy address"
                          >
                            {copiedId === wallet.id ? '✓' : '⎘'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '12px', padding: '3px 10px', borderRadius: '100px', fontWeight: '500',
                      background: `${STATUS_COLORS[wallet.verificationStatus] || '#94a3b8'}18`,
                      color: STATUS_COLORS[wallet.verificationStatus] || '#94a3b8',
                    }}>
                      {wallet.verificationStatus}
                    </span>
                    {wallet.payoutEnabled && (
                      <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '100px', fontWeight: '500', background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>
                        Payout: {wallet.payoutCurrency}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ marginTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <Link to="/withdraw" style={{ padding: '7px 16px', background: 'var(--primary)', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>
                    Withdraw
                  </Link>
                  <Link to="/wallet" style={{ padding: '7px 16px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', borderRadius: '8px', textDecoration: 'none', fontSize: '13px' }}>
                    Manage
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info box */}
      <div style={{ background: 'rgba(96,128,245,0.08)', border: '1px solid rgba(96,128,245,0.2)', borderRadius: '12px', padding: '16px 20px' }}>
        <p style={{ color: '#8ea4f8', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
          <strong>Non-custodial:</strong> Advancia PayLedger does not hold your funds. Your linked wallets remain fully in your control. We only use your wallet address for identity verification and to route payout settlements.
        </p>
      </div>
    </div>
  );
}

export default WalletBalance;
