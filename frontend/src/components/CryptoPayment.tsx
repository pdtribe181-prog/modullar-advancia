import { useState, useEffect } from 'react';
import { LoadingButton } from './Spinner';
import { api } from '../services/api';

interface CryptoPaymentProps {
  amount: number;
  appointmentId?: string;
  onSuccess: (hostedUrl: string) => void;
  onError: (error: string) => void;
}

interface CryptoStatusResponse {
  success: boolean;
  data: {
    enabled: boolean;
    supportedCurrencies: string[];
    features: {
      instantSettlement: boolean;
      noChargebacks: boolean;
      lowFees: boolean;
    };
  };
}

interface CryptoChargeResponse {
  success: boolean;
  data: {
    id: string;
    code: string;
    hostedUrl: string;
    expiresAt: string;
    addresses: {
      bitcoin?: string;
      ethereum?: string;
      usdc?: string;
    };
    pricing: {
      local: { amount: string; currency: string };
      bitcoin?: { amount: string; currency: string };
      ethereum?: { amount: string; currency: string };
    };
  };
}

export function CryptoPaymentOption({ amount, appointmentId, onSuccess, onError }: CryptoPaymentProps) {
  const [loading, setLoading] = useState(false);
  const [cryptoEnabled, setCryptoEnabled] = useState<boolean | null>(null);

  // Check if crypto payments are enabled — inside useEffect, not during render
  useEffect(() => {
    let cancelled = false;
    const checkStatus = async () => {
      try {
        const data = await api.get<CryptoStatusResponse>('/crypto/status');
        if (!cancelled) setCryptoEnabled(data.success && data.data.enabled);
      } catch {
        if (!cancelled) setCryptoEnabled(false);
      }
    };
    checkStatus();
    return () => { cancelled = true; };
  }, []);

  const handleCryptoPayment = async () => {
    setLoading(true);
    try {
      const data = await api.post<CryptoChargeResponse>('/crypto/charges', {
        amount,
        currency: 'USD',
        appointmentId,
        description: `Healthcare payment - ${new Date().toLocaleDateString()}`,
      });

      if (data.success && data.data.hostedUrl) {
        onSuccess(data.data.hostedUrl);
        // Redirect to Coinbase Commerce hosted checkout
        window.location.href = data.data.hostedUrl;
      } else {
        onError('Failed to create crypto payment');
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Crypto payment failed');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  // Don't render if crypto is not enabled
  if (cryptoEnabled === false) {
    return null;
  }

  // Loading state
  if (cryptoEnabled === null) {
    return (
      <div className="crypto-payment-option loading">
        <div className="spinner-small" />
        <span>Checking crypto payment availability...</span>
      </div>
    );
  }

  return (
    <div className="crypto-payment-option">
      <div className="crypto-header">
        <div className="crypto-icons">
          <span className="crypto-icon" title="Bitcoin">₿</span>
          <span className="crypto-icon" title="Ethereum">Ξ</span>
          <span className="crypto-icon" title="USDC">$</span>
        </div>
        <h4>Pay with Cryptocurrency</h4>
      </div>

      <div className="crypto-benefits">
        <div className="benefit">
          <span className="benefit-icon">⚡</span>
          <span>Instant settlement</span>
        </div>
        <div className="benefit">
          <span className="benefit-icon">🔒</span>
          <span>Secure blockchain payment</span>
        </div>
        <div className="benefit">
          <span className="benefit-icon">💰</span>
          <span>Low 0.5% fee</span>
        </div>
      </div>

      <div className="crypto-currencies">
        <span className="currency-badge">BTC</span>
        <span className="currency-badge">ETH</span>
        <span className="currency-badge">USDC</span>
        <span className="currency-badge">DAI</span>
      </div>

      <LoadingButton
        onClick={handleCryptoPayment}
        disabled={loading}
        className="crypto-pay-button"
        loading={loading}
        loadingText="Creating payment..."
      >
        Pay {formatAmount(amount)} with Crypto
      </LoadingButton>

      <p className="crypto-note">
        You'll be redirected to a secure payment page to complete your transaction.
      </p>
    </div>
  );
}
