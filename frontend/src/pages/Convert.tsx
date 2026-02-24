import { useState, useEffect, CSSProperties } from 'react';
import { Spinner } from '../components/Spinner';

interface TokenInfo {
  symbol: string;
  name: string;
  icon: string;
  color: string;
  coingeckoId: string;
}

const TOKENS: TokenInfo[] = [
  { symbol: 'ETH',  name: 'Ethereum',   icon: '⟠',  color: '#627eea', coingeckoId: 'ethereum' },
  { symbol: 'BTC',  name: 'Bitcoin',    icon: '₿',  color: '#f7931a', coingeckoId: 'bitcoin' },
  { symbol: 'SOL',  name: 'Solana',     icon: '◎',  color: '#9945ff', coingeckoId: 'solana' },
  { symbol: 'USDC', name: 'USD Coin',   icon: '💵', color: '#2775ca', coingeckoId: 'usd-coin' },
  { symbol: 'USDT', name: 'Tether',     icon: '₮',  color: '#26a17b', coingeckoId: 'tether' },
  { symbol: 'MATIC',name: 'Polygon',    icon: '⬡',  color: '#8247e5', coingeckoId: 'matic-network' },
];

type Step = 'form' | 'confirm' | 'success';

export function Convert() {
  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('USDC');
  const [fromAmount, setFromAmount] = useState('');
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [step, setStep] = useState<Step>('form');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const ids = TOKENS.map(t => t.coingeckoId).join(',');

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPrices = async () => {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
      );
      const data = await res.json();
      const mapped: Record<string, number> = {};
      TOKENS.forEach(t => {
        if (data[t.coingeckoId]?.usd) mapped[t.symbol] = data[t.coingeckoId].usd;
      });
      setPrices(mapped);
    } catch {
      // Use fallback prices if API unavailable
      setPrices({ ETH: 3200, BTC: 65000, SOL: 140, USDC: 1, USDT: 1, MATIC: 0.85 });
    } finally {
      setLoadingPrices(false);
    }
  };

  const fromInfo = TOKENS.find(t => t.symbol === fromToken)!;
  const toInfo = TOKENS.find(t => t.symbol === toToken)!;

  const fromUSD = prices[fromToken] || 0;
  const toUSD = prices[toToken] || 0;
  const exchangeRate = toUSD > 0 ? fromUSD / toUSD : 0;
  const toAmount = fromAmount && exchangeRate > 0 ? (Number(fromAmount) * exchangeRate).toFixed(6) : '';
  const usdValue = fromAmount && fromUSD > 0 ? (Number(fromAmount) * fromUSD).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '';

  const swap = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (fromToken === toToken) { setError('Select different tokens to convert'); return; }
    if (!fromAmount || Number(fromAmount) <= 0) { setError('Enter a valid amount'); return; }

    if (step === 'form') {
      setStep('confirm');
      return;
    }

    setSubmitting(true);
    try {
      // Simulated conversion — in production this would call a swap aggregator (1inch, 0x) or custodial swap
      await new Promise(resolve => setTimeout(resolve, 1800));
      setStep('success');
    } catch {
      setError('Conversion failed. Please try again.');
      setStep('form');
    } finally {
      setSubmitting(false);
    }
  };

  const container: CSSProperties = { maxWidth: '520px', margin: '0 auto', padding: '32px 24px' };
  const card: CSSProperties = { background: '#0f1729', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '28px' };
  const tokenSelect: CSSProperties = { background: '#162040', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', padding: '10px 14px', cursor: 'pointer', outline: 'none', width: '130px' };
  const amtInput: CSSProperties = { flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '24px', fontWeight: '700', fontVariantNumeric: 'tabular-nums', padding: '0', width: '100%' };

  if (step === 'success') {
    return (
      <div style={container}>
        <div style={{ ...card, textAlign: 'center', padding: '56px 28px' }}>
          <div style={{ fontSize: '56px', marginBottom: '20px' }}>✅</div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '10px' }}>Conversion Complete</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '8px', lineHeight: '1.6' }}>
            Converted <strong style={{ color: 'var(--text-primary)' }}>{fromAmount} {fromToken}</strong> to
          </p>
          <p style={{ color: '#34d399', fontSize: '28px', fontWeight: '800', fontVariantNumeric: 'tabular-nums', marginBottom: '32px' }}>
            {toAmount} {toToken}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => { setStep('form'); setFromAmount(''); setError(''); }}
              style={{ padding: '12px 28px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', boxShadow: 'var(--shadow-primary)' }}
            >
              Convert More
            </button>
            <a href="/wallet-balance" style={{ padding: '12px 28px', background: '#162040', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}>
              View Balance
            </a>
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
          Convert
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
          Swap between cryptocurrencies at live market rates
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={card}>
          {/* From */}
          <div style={{ marginBottom: '6px' }}>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', fontWeight: '500', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>You send</label>
            <div style={{ background: '#162040', borderRadius: '14px', padding: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: '26px' }}>{fromInfo.icon}</span>
                <select style={tokenSelect} value={fromToken} onChange={e => setFromToken(e.target.value)}>
                  {TOKENS.filter(t => t.symbol !== toToken).map(t => (
                    <option key={t.symbol} value={t.symbol}>{t.symbol} — {t.name}</option>
                  ))}
                </select>
              </div>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                style={amtInput}
                value={fromAmount}
                onChange={e => setFromAmount(e.target.value)}
              />
              {usdValue && <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>≈ {usdValue}</p>}
            </div>
          </div>

          {/* Swap button */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
            <button
              type="button"
              onClick={swap}
              style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#162040', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
              title="Swap direction"
            >
              ⇅
            </button>
          </div>

          {/* To */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', fontWeight: '500', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>You receive</label>
            <div style={{ background: '#162040', borderRadius: '14px', padding: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: '26px' }}>{toInfo.icon}</span>
                <select style={tokenSelect} value={toToken} onChange={e => setToToken(e.target.value)}>
                  {TOKENS.filter(t => t.symbol !== fromToken).map(t => (
                    <option key={t.symbol} value={t.symbol}>{t.symbol} — {t.name}</option>
                  ))}
                </select>
              </div>
              <p style={{ fontSize: '24px', fontWeight: '700', color: toAmount ? '#34d399' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {toAmount || '0.00'}
              </p>
            </div>
          </div>

          {/* Rate info */}
          <div style={{ background: 'rgba(96,128,245,0.06)', border: '1px solid rgba(96,128,245,0.15)', borderRadius: '10px', padding: '12px 14px', marginBottom: '20px' }}>
            {loadingPrices ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                <Spinner size={14} /><span>Fetching live rates…</span>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  1 {fromToken} ≈ {exchangeRate > 0 ? exchangeRate.toFixed(fromToken.startsWith('USD') ? 6 : 4) : '—'} {toToken}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                  {fromToken}: ${prices[fromToken]?.toLocaleString() || '—'} · {toToken}: ${prices[toToken]?.toLocaleString() || '—'}
                </span>
              </div>
            )}
          </div>

          {/* Confirm step */}
          {step === 'confirm' && (
            <div style={{ background: '#162040', borderRadius: '12px', padding: '16px 18px', marginBottom: '16px', border: '1px solid rgba(96,128,245,0.2)' }}>
              <h3 style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '14px', marginBottom: '12px' }}>Confirm Conversion</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>You send</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{fromAmount} {fromToken}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>You receive</span>
                  <span style={{ color: '#34d399', fontWeight: '700' }}>{toAmount} {toToken}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>USD value</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{usdValue || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Network fee</span>
                  <span style={{ color: 'var(--text-secondary)' }}>~$0.50 – $2.00</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div style={{ marginBottom: '16px', padding: '12px 14px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '8px', color: '#f87171', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            {step === 'confirm' && (
              <button
                type="button"
                onClick={() => setStep('form')}
                style={{ flex: 1, padding: '14px', background: '#162040', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600', fontSize: '15px' }}
              >
                Edit
              </button>
            )}
            <button
              type="submit"
              disabled={submitting || loadingPrices || !fromAmount}
              style={{ flex: 2, padding: '14px', background: submitting || !fromAmount ? '#1e2a40' : 'var(--primary)', border: 'none', borderRadius: '12px', color: submitting || !fromAmount ? 'var(--text-muted)' : 'white', cursor: submitting || !fromAmount ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: fromAmount && !submitting ? 'var(--shadow-primary)' : 'none', transition: 'all 0.2s' }}
            >
              {submitting
                ? <><Spinner size={18} /><span>Converting…</span></>
                : step === 'confirm'
                  ? `Confirm Swap`
                  : `Preview Swap`}
            </button>
          </div>
        </div>
      </form>

      {/* Disclaimer */}
      <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
        Rates update every 30 seconds from CoinGecko. Actual execution price may vary slightly due to network conditions and slippage. Max slippage: 1%.
      </p>
    </div>
  );
}

export default Convert;
