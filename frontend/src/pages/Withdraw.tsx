import { useState, useEffect, CSSProperties } from 'react';
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
  payoutCurrency: string;
}

type WithdrawMethod = 'crypto' | 'bank';
type Step = 'form' | 'confirm' | 'success';

export function Withdraw() {
  const [wallets, setWallets] = useState<LinkedWallet[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(true);
  const [method, setMethod] = useState<WithdrawMethod>('crypto');
  const [step, setStep] = useState<Step>('form');

  // Crypto form
  const [selectedWallet, setSelectedWallet] = useState('');
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [cryptoCurrency, setCryptoCurrency] = useState('USDC');

  // Bank form
  const [bankAmount, setBankAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountType, setAccountType] = useState('checking');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    api.get<{ success: boolean; data: LinkedWallet[] }>('/wallet/list')
      .then(res => { if (res.success) setWallets(res.data || []); })
      .catch(() => {})
      .finally(() => setLoadingWallets(false));
  }, []);

  const container: CSSProperties = { maxWidth: '680px', margin: '0 auto', padding: '32px 24px' };
  const card: CSSProperties = { background: '#0f1729', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px' };
  const label: CSSProperties = { display: 'block', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', marginBottom: '6px' };
  const input: CSSProperties = { width: '100%', padding: '11px 14px', background: '#162040', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' };
  const select: CSSProperties = { ...input, cursor: 'pointer' };

  const payoutWallets = wallets.filter(w => w.payoutEnabled && w.verificationStatus === 'verified');
  const selectedWalletObj = wallets.find(w => w.id === selectedWallet);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (step === 'form') {
      if (method === 'crypto' && !selectedWallet) { setErrorMsg('Select a payout wallet'); return; }
      if (method === 'crypto' && (!cryptoAmount || Number(cryptoAmount) <= 0)) { setErrorMsg('Enter a valid amount'); return; }
      if (method === 'bank' && !bankAmount) { setErrorMsg('Enter withdrawal amount'); return; }
      if (method === 'bank' && (!bankName || !accountNumber || !routingNumber)) { setErrorMsg('Complete all bank details'); return; }
      setStep('confirm');
      return;
    }
    if (step === 'confirm') {
      setSubmitting(true);
      try {
        // Withdrawal request — sent as a support/compliance ticket since no direct payout endpoint exists
        await api.post('/transactions', {
          type: method === 'crypto' ? 'crypto_withdrawal' : 'bank_withdrawal',
          amount: method === 'crypto' ? Number(cryptoAmount) : Number(bankAmount),
          currency: method === 'crypto' ? cryptoCurrency : 'USD',
          walletId: method === 'crypto' ? selectedWallet : undefined,
          bankDetails: method === 'bank' ? { bankName, accountNumber: accountNumber.slice(-4), accountType } : undefined,
          status: 'pending',
        });
        setStep('success');
      } catch {
        setErrorMsg('Withdrawal request failed. Please try again or contact support.');
        setStep('form');
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (step === 'success') {
    return (
      <div style={container}>
        <div style={{ ...card, textAlign: 'center', padding: '56px 28px' }}>
          <div style={{ fontSize: '56px', marginBottom: '20px' }}>✅</div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '10px' }}>Withdrawal Requested</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '32px', lineHeight: '1.6' }}>
            Your withdrawal request has been submitted and is pending review. <br />
            Processing typically takes 1–3 business days.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/dashboard" style={{ padding: '12px 28px', background: 'var(--primary)', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
              Back to Dashboard
            </Link>
            <button onClick={() => { setStep('form'); setErrorMsg(''); setCryptoAmount(''); setBankAmount(''); }} style={{ padding: '12px 28px', background: '#162040', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px' }}>
              New Withdrawal
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={container}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: 'var(--fs-h2)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)', margin: 0, marginBottom: '8px' }}>
          Withdraw Funds
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
          Send funds to your crypto wallet or bank account
        </p>
      </div>

      {/* Method selector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        {(['crypto', 'bank'] as WithdrawMethod[]).map(m => (
          <button
            key={m}
            onClick={() => { setMethod(m); setErrorMsg(''); }}
            style={{
              padding: '16px',
              background: method === m ? 'rgba(96,128,245,0.12)' : '#0f1729',
              border: method === m ? '1.5px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              color: method === m ? 'var(--primary-light)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              textAlign: 'center',
            }}
          >
            {m === 'crypto' ? '⛓️ Crypto Wallet' : '🏦 Bank Transfer'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div style={card}>
          {method === 'crypto' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={label}>Payout Wallet</label>
                {loadingWallets ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '12px', color: 'var(--text-muted)', fontSize: '13px' }}><Spinner size={16} /><span>Loading wallets…</span></div>
                ) : payoutWallets.length === 0 ? (
                  <div style={{ padding: '14px', background: '#162040', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '10px' }}>No payout-enabled wallets found.</p>
                    <Link to="/wallet" style={{ color: 'var(--primary-light)', fontSize: '13px' }}>Link and enable a wallet →</Link>
                  </div>
                ) : (
                  <select
                    style={select}
                    value={selectedWallet}
                    onChange={e => setSelectedWallet(e.target.value)}
                    required
                  >
                    <option value="">Select wallet…</option>
                    {payoutWallets.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.label || w.network} — {w.walletAddress.slice(0, 8)}…{w.walletAddress.slice(-6)} ({w.payoutCurrency})
                        {w.isPrimaryPayout ? ' ★ Primary' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedWalletObj && (
                <div style={{ background: '#162040', borderRadius: '10px', padding: '12px 14px', border: '1px solid rgba(255,255,255,0.06)', fontSize: '13px', color: 'var(--text-muted)' }}>
                  <span>Network: <strong style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{selectedWalletObj.network}</strong></span>
                  <span style={{ marginLeft: '16px' }}>Currency: <strong style={{ color: 'var(--text-secondary)' }}>{selectedWalletObj.payoutCurrency}</strong></span>
                </div>
              )}

              <div>
                <label style={label}>Currency</label>
                <select style={select} value={cryptoCurrency} onChange={e => setCryptoCurrency(e.target.value)}>
                  {['USDC', 'USDT', 'ETH', 'SOL'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={label}>Amount</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  placeholder="0.00"
                  style={input}
                  value={cryptoAmount}
                  onChange={e => setCryptoAmount(e.target.value)}
                  required
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={label}>Amount (USD)</label>
                <input type="number" min="10" step="0.01" placeholder="0.00" style={input} value={bankAmount} onChange={e => setBankAmount(e.target.value)} required />
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Minimum withdrawal: $10.00</p>
              </div>
              <div>
                <label style={label}>Bank Name</label>
                <input type="text" placeholder="e.g. Chase Bank" style={input} value={bankName} onChange={e => setBankName(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={label}>Account Number</label>
                  <input type="text" placeholder="••••••••" style={input} value={accountNumber} onChange={e => setAccountNumber(e.target.value)} required />
                </div>
                <div>
                  <label style={label}>Routing Number</label>
                  <input type="text" placeholder="9 digits" style={input} value={routingNumber} onChange={e => setRoutingNumber(e.target.value)} required />
                </div>
              </div>
              <div>
                <label style={label}>Account Type</label>
                <select style={select} value={accountType} onChange={e => setAccountType(e.target.value)}>
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                </select>
              </div>
            </div>
          )}

          {errorMsg && (
            <div style={{ marginTop: '16px', padding: '12px 14px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '8px', color: '#f87171', fontSize: '13px' }}>
              {errorMsg}
            </div>
          )}

          {/* Confirm step overlay */}
          {step === 'confirm' && (
            <div style={{ marginTop: '20px', padding: '18px', background: '#162040', borderRadius: '12px', border: '1px solid rgba(96,128,245,0.25)' }}>
              <h3 style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '15px', marginBottom: '14px' }}>Confirm Withdrawal</h3>
              {method === 'crypto' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Amount</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{cryptoAmount} {cryptoCurrency}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Destination</span>
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '12px' }}>
                      {selectedWalletObj?.walletAddress.slice(0, 10)}…{selectedWalletObj?.walletAddress.slice(-8)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Network</span>
                    <span style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{selectedWalletObj?.network}</span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Amount</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>${Number(bankAmount).toFixed(2)} USD</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Bank</span>
                    <span style={{ color: 'var(--text-primary)' }}>{bankName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Account</span>
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>••••{accountNumber.slice(-4)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            {step === 'confirm' ? (
              <>
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  style={{ flex: 1, padding: '13px', background: '#162040', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}
                >
                  Edit
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ flex: 2, padding: '13px', background: submitting ? '#333' : 'var(--primary)', border: 'none', borderRadius: '10px', color: 'white', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {submitting ? <><Spinner size={18} /><span>Processing…</span></> : 'Confirm Withdrawal'}
                </button>
              </>
            ) : (
              <button
                type="submit"
                style={{ flex: 1, padding: '13px', background: 'var(--primary)', border: 'none', borderRadius: '10px', color: 'white', cursor: 'pointer', fontWeight: '700', fontSize: '14px', boxShadow: 'var(--shadow-primary)' }}
              >
                Review Withdrawal
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Info */}
      <div style={{ marginTop: '20px', background: 'rgba(96,128,245,0.06)', border: '1px solid rgba(96,128,245,0.15)', borderRadius: '12px', padding: '14px 18px' }}>
        <p style={{ color: '#8ea4f8', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
          <strong>Processing time:</strong> Crypto withdrawals settle in 10–30 minutes. ACH bank transfers take 1–3 business days. For support, contact <a href="mailto:support@advanciapayledger.com" style={{ color: '#8ea4f8' }}>support@advanciapayledger.com</a>
        </p>
      </div>
    </div>
  );
}

export default Withdraw;
