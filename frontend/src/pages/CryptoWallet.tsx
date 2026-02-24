import React, { useState, useEffect, useCallback } from 'react';
import '../styles.css';

declare global {
  interface Window { ethereum?: any; }
}

interface Token { symbol: string; name: string; icon: string; color: string; }
interface TxRecord { type: 'sent' | 'received'; token: string; amount: string; addr: string; date: string; status: 'confirmed' | 'pending'; }

const SUPPORTED_TOKENS: Token[] = [
  { symbol: 'ETH',  name: 'Ethereum', icon: '⟠', color: '#627eea' },
  { symbol: 'USDC', name: 'USD Coin',  icon: '💵', color: '#2775ca' },
  { symbol: 'SOL',  name: 'Solana',    icon: '◎', color: '#9945ff' },
  { symbol: 'BTC',  name: 'Bitcoin',   icon: '₿', color: '#f7931a' },
];

const MOCK_BALANCES: Record<string, string> = { ETH: '0.4521', USDC: '320.00', SOL: '12.50', BTC: '0.0082' };

const MOCK_HISTORY: TxRecord[] = [
  { type: 'received', token: 'ETH',  amount: '+0.45',   addr: '0xAbc…12d3', date: 'Feb 23, 2026', status: 'confirmed' },
  { type: 'sent',     token: 'USDC', amount: '−120.00', addr: '0xDef…56f7', date: 'Feb 22, 2026', status: 'confirmed' },
  { type: 'received', token: 'SOL',  amount: '+12.5',   addr: '9xLm…89ab', date: 'Feb 20, 2026', status: 'confirmed' },
  { type: 'sent',     token: 'ETH',  amount: '−0.10',   addr: '0xGhi…ef12', date: 'Feb 18, 2026', status: 'pending'   },
  { type: 'received', token: 'BTC',  amount: '+0.0031', addr: 'bc1q…34xy', date: 'Feb 15, 2026', status: 'confirmed' },
];

type Tab = 'send' | 'receive' | 'history';
type StatusType = 'success' | 'error' | 'info' | '';

export const CryptoWallet: React.FC = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState('ETH');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [tab, setTab] = useState<Tab>('send');
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState<StatusType>('');
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  const toast = useCallback((msg: string, type: StatusType) => {
    setStatusMsg(msg);
    setStatusType(type);
  }, []);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAddress(accounts[0]);
        toast('Wallet connected successfully!', 'success');
      } catch {
        toast('Connection rejected. Please try again.', 'error');
      }
    } else {
      toast('No Web3 wallet detected. Please install MetaMask to continue.', 'error');
    }
  };

  const sendTransaction = async () => {
    if (!address || !amount || !recipient) {
      toast('Please fill in both recipient address and amount.', 'error'); return;
    }
    if (!/^0x[0-9a-fA-F]{40}$/.test(recipient)) {
      toast('Invalid Ethereum address format.', 'error'); return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast('Enter a valid amount greater than 0.', 'error'); return;
    }
    setSending(true);
    toast('Awaiting wallet confirmation…', 'info');
    try {
      const valueHex = Math.floor(amt * 1e18).toString(16);
      await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ to: recipient, from: address, value: '0x' + valueHex }],
      });
      toast(`✅ ${amount} ${selectedToken} sent to ${recipient.slice(0, 10)}…`, 'success');
      setRecipient('');
      setAmount('');
    } catch (e: any) {
      toast('Transaction failed: ' + (e?.message ?? 'Unknown error'), 'error');
    } finally {
      setSending(false);
    }
  };

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (window.ethereum?.selectedAddress) setAddress(window.ethereum.selectedAddress);
  }, []);

  const shortAddr = address ? `${address.slice(0, 8)}…${address.slice(-6)}` : '';
  const token = SUPPORTED_TOKENS.find(t => t.symbol === selectedToken)!;

  return (
    <div className="cw-page">

      {/* Hero */}
      <div className="cw-hero">
        <span className="lp-tag">Non-custodial</span>
        <h1>Crypto Wallet</h1>
        <p>Send, receive and manage digital assets — connected directly to your Web3 wallet. Your keys, your coins.</p>
      </div>

      {!address ? (
        /* ── Connect Screen ────────────────────────────────── */
        <div className="cw-connect">
          <div className="cw-connect__card">
            <div className="cw-connect__icon">🔑</div>
            <h2>Connect Your Wallet</h2>
            <p>Connect MetaMask or any EIP-1193 Web3 wallet to manage digital assets and pay for healthcare services on-chain.</p>
            <button
              onClick={connectWallet}
              className="lp-btn lp-btn--primary lp-btn--lg"
              style={{ width: '100%', marginTop: '1rem' }}
            >
              🦊 Connect MetaMask
            </button>
            {statusMsg && (
              <div className={`cw-status cw-status--${statusType}`}>{statusMsg}</div>
            )}
            <div className="cw-supported">
              {SUPPORTED_TOKENS.map(t => (
                <div key={t.symbol} className="cw-supported__token" style={{ borderColor: t.color + '55' }}>
                  <span style={{ color: t.color }}>{t.icon}</span>
                  <span>{t.symbol}</span>
                </div>
              ))}
            </div>
            <p className="cw-connect__note">🔒 Non-custodial — we never store or transmit your private keys.</p>
          </div>
        </div>
      ) : (
        /* ── Dashboard ─────────────────────────────────────── */
        <div className="cw-dashboard">

          {/* Address bar */}
          <div className="cw-address-bar">
            <span className="cw-dot" />
            <span className="cw-address-bar__addr">{shortAddr}</span>
            <button className="cw-copy" onClick={copyAddress}>{copied ? '✅ Copied' : '📋 Copy'}</button>
            <button
              className="cw-disconnect"
              onClick={() => { setAddress(null); setStatusMsg(''); }}
            >
              Disconnect
            </button>
          </div>

          {/* Token balance cards */}
          <div className="cw-balances">
            {SUPPORTED_TOKENS.map(t => (
              <button
                key={t.symbol}
                className={`cw-balance-card${selectedToken === t.symbol ? ' cw-balance-card--active' : ''}`}
                style={{ '--token-color': t.color } as React.CSSProperties}
                onClick={() => setSelectedToken(t.symbol)}
              >
                <span className="cw-balance-card__icon" style={{ color: t.color }}>{t.icon}</span>
                <div className="cw-balance-card__middle">
                  <div className="cw-balance-card__amount">{MOCK_BALANCES[t.symbol]}</div>
                  <div className="cw-balance-card__symbol">{t.symbol}</div>
                </div>
                <div className="cw-balance-card__name">{t.name}</div>
              </button>
            ))}
          </div>

          {/* Tabs */}
          <div className="cw-tabs">
            {(['send', 'receive', 'history'] as Tab[]).map(t => (
              <button
                key={t}
                className={`cw-tab${tab === t ? ' cw-tab--active' : ''}`}
                onClick={() => { setTab(t); setStatusMsg(''); }}
              >
                {t === 'send' ? '↑ Send' : t === 'receive' ? '↓ Receive' : '📋 History'}
              </button>
            ))}
          </div>

          <div className="cw-panel">

            {/* ── Send ── */}
            {tab === 'send' && (
              <div className="cw-send">
                <div className="cw-token-selector-row">
                  <label>Token to send</label>
                  <div className="cw-token-selector">
                    {SUPPORTED_TOKENS.map(t => (
                      <button
                        key={t.symbol}
                        className={`cw-token-btn${selectedToken === t.symbol ? ' cw-token-btn--active' : ''}`}
                        style={selectedToken === t.symbol ? { borderColor: t.color, color: t.color } : {}}
                        onClick={() => setSelectedToken(t.symbol)}
                      >
                        <span style={{ color: t.color }}>{t.icon}</span> {t.symbol}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="cw-field">
                  <label htmlFor="cw-recipient">Recipient Address</label>
                  <input
                    id="cw-recipient"
                    type="text"
                    className="cw-input"
                    placeholder="0x123…abc (EVM address)"
                    value={recipient}
                    onChange={e => setRecipient(e.target.value)}
                  />
                </div>

                <div className="cw-field">
                  <label htmlFor="cw-amount">Amount ({selectedToken})</label>
                  <div className="cw-amount-wrap">
                    <input
                      id="cw-amount"
                      type="number"
                      className="cw-input"
                      placeholder="0.00"
                      min="0"
                      step="any"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                    />
                    <button
                      className="cw-max-btn"
                      onClick={() => setAmount(MOCK_BALANCES[selectedToken])}
                      title="Use maximum balance"
                    >
                      MAX
                    </button>
                  </div>
                  <span className="cw-field__hint">
                    Available: {MOCK_BALANCES[selectedToken]} {selectedToken}
                  </span>
                </div>

                {statusMsg && (
                  <div className={`cw-status cw-status--${statusType}`}>{statusMsg}</div>
                )}

                <button
                  className="lp-btn lp-btn--primary lp-btn--full"
                  onClick={sendTransaction}
                  disabled={sending}
                  style={{ '--btn-accent': token.color } as React.CSSProperties}
                >
                  {sending ? 'Awaiting confirmation…' : `Send ${selectedToken}`}
                </button>

                <p className="cw-disclaimer">
                  ⚠️ Always verify recipient addresses carefully. Blockchain transactions are irreversible.
                </p>
              </div>
            )}

            {/* ── Receive ── */}
            {tab === 'receive' && (
              <div className="cw-receive">
                <div className="cw-qr-placeholder" aria-label="QR code (generate with a library in production)">
                  <span>🔲</span>
                  <p>QR Code</p>
                  <span className="cw-qr-hint">Scan with any Web3 wallet</span>
                </div>
                <div className="cw-receive__address-box">{address}</div>
                <button
                  className="lp-btn lp-btn--primary lp-btn--full"
                  onClick={copyAddress}
                >
                  {copied ? '✅ Address Copied!' : '📋 Copy Wallet Address'}
                </button>
                <p className="cw-disclaimer">
                  This address accepts ETH and all ERC-20 tokens (USDC, etc.) on Ethereum Mainnet.
                </p>
              </div>
            )}

            {/* ── History ── */}
            {tab === 'history' && (
              <div className="cw-history">
                <div className="cw-history__table-wrap">
                  <table className="cw-history__table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Token</th>
                        <th>Amount</th>
                        <th>Address</th>
                        <th>Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_HISTORY.map((tx, i) => (
                        <tr key={i}>
                          <td>
                            <span className={`cw-tx-type cw-tx-type--${tx.type}`}>
                              {tx.type === 'sent' ? '↑ Sent' : '↓ Rcvd'}
                            </span>
                          </td>
                          <td>
                            <strong style={{ color: SUPPORTED_TOKENS.find(t => t.symbol === tx.token)?.color }}>
                              {SUPPORTED_TOKENS.find(t => t.symbol === tx.token)?.icon} {tx.token}
                            </strong>
                          </td>
                          <td className={tx.type === 'sent' ? 'cw-neg' : 'cw-pos'}>{tx.amount}</td>
                          <td className="cw-addr-cell">{tx.addr}</td>
                          <td>{tx.date}</td>
                          <td>
                            <span className={`cw-status-pill cw-status-pill--${tx.status}`}>
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="cw-disclaimer">
                  Transaction history shown is illustrative. Live on-chain data requires a block explorer API (e.g. Etherscan).
                </p>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};
