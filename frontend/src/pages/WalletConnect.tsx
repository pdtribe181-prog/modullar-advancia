import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { api } from '../services/api';
import { LoadingButton } from '../components/Spinner';
import { useConfirm } from '../components/ConfirmDialog';

type WalletType = 'ethereum' | 'polygon' | 'base' | 'arbitrum';

interface LinkedWallet {
  id: string;
  wallet_address: string;
  wallet_type: WalletType;
  wallet_label: string | null;
  is_primary: boolean;
  is_verified: boolean;
  created_at: string;
}

interface ChallengeResponse {
  data: {
    challengeId: string;
    message: string;
    expiresAt: string;
  };
}

interface WalletListResponse {
  data: LinkedWallet[];
}

// Network configurations
const NETWORKS: Record<WalletType, { name: string; icon: string; color: string }> = {
  ethereum: { name: 'Ethereum', icon: '⟠', color: '#627EEA' },
  polygon: { name: 'Polygon', icon: '⬡', color: '#8247E5' },
  base: { name: 'Base', icon: '🔵', color: '#0052FF' },
  arbitrum: { name: 'Arbitrum', icon: '🔷', color: '#28A0F0' },
};

export function WalletConnect() {
  const [wallets, setWallets] = useState<LinkedWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<WalletType>('ethereum');
  const [walletLabel, setWalletLabel] = useState('');
  const [challenge, setChallenge] = useState<{ id: string; message: string } | null>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const confirmDialog = useConfirm();

  const loadWallets = useCallback(async () => {
    try {
      const response = await api.get<WalletListResponse>('/wallet/list');
      setWallets(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wallets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadWallets();
  }, [isAuthenticated, navigate, loadWallets]);

  // Check if MetaMask or other wallet is available
  const hasWeb3Wallet = typeof window !== 'undefined' &&
    (window as unknown as { ethereum?: unknown }).ethereum;

  const connectMetaMask = async () => {
    const ethereum = (window as unknown as { ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<string[]>;
      selectedAddress?: string;
    }}).ethereum;

    if (!ethereum) {
      setError('MetaMask not detected. Please install MetaMask extension.');
      return null;
    }

    try {
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      return accounts[0];
    } catch {
      setError('Failed to connect to MetaMask');
      return null;
    }
  };

  const signMessage = async (message: string): Promise<string | null> => {
    const ethereum = (window as unknown as { ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<string>;
    }}).ethereum;

    if (!ethereum || !walletAddress) return null;

    try {
      const signature = await ethereum.request({
        method: 'personal_sign',
        params: [message, walletAddress],
      });
      return signature;
    } catch {
      setError('Failed to sign message');
      return null;
    }
  };

  const handleStartConnect = async () => {
    setError('');
    setConnecting(true);

    try {
      // For Ethereum-based networks, connect MetaMask
      if (['ethereum', 'polygon', 'base', 'arbitrum'].includes(selectedNetwork)) {
        const address = await connectMetaMask();
        if (!address) {
          setConnecting(false);
          return;
        }
        setWalletAddress(address);

        // Get challenge from server
        const challengeResponse = await api.post<ChallengeResponse>('/wallet/challenge', {
          walletAddress: address,
          walletType: selectedNetwork,
        });

        setChallenge({
          id: challengeResponse.data.challengeId,
          message: challengeResponse.data.message,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start connection');
    } finally {
      setConnecting(false);
    }
  };

  const handleVerifyAndLink = async () => {
    if (!challenge || !walletAddress) return;

    setConnecting(true);
    setError('');

    try {
      const signature = await signMessage(challenge.message);
      if (!signature) {
        setConnecting(false);
        return;
      }

      await api.post('/wallet/verify', {
        challengeId: challenge.id,
        signature,
        walletLabel: walletLabel || undefined,
      });

      setSuccess('Wallet connected successfully!');
      setChallenge(null);
      setWalletAddress('');
      setWalletLabel('');
      await loadWallets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify wallet');
    } finally {
      setConnecting(false);
    }
  };

  const handleSetPrimary = async (walletId: string) => {
    try {
      await api.post(`/wallet/${walletId}/primary`);
      setSuccess('Primary wallet updated');
      await loadWallets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set primary wallet');
    }
  };

  const handleRemoveWallet = async (walletId: string) => {
    const confirmed = await confirmDialog({
      title: 'Remove Wallet',
      message: 'Are you sure you want to remove this wallet?',
      variant: 'danger',
      confirmText: 'Remove',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/wallet/${walletId}`);
      setSuccess('Wallet removed');
      await loadWallets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove wallet');
    }
  };

  const cancelConnection = () => {
    setChallenge(null);
    setWalletAddress('');
    setWalletLabel('');
    setError('');
  };

  const shortenAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  if (loading) {
    return (
      <div className="wallet-page">
        <div className="wallet-card">
          <p>Loading wallets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-page">
      <div className="wallet-card">
        <h2>Crypto Wallets</h2>
        <p className="subtitle">
          Connect your wallet to receive payouts in cryptocurrency.
        </p>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* Existing Wallets */}
        {wallets.length > 0 && (
          <div className="wallet-list">
            <h3>Connected Wallets</h3>
            {wallets.map((wallet) => {
              const network = NETWORKS[wallet.wallet_type];
              return (
                <div key={wallet.id} className="wallet-item">
                  <div className="wallet-info">
                    <div
                      className="wallet-icon"
                      style={{ background: network.color, color: 'white' }}
                    >
                      {network.icon}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong>{wallet.wallet_label || network.name}</strong>
                        {wallet.is_primary && <span className="wallet-badge">Primary</span>}
                      </div>
                      <div className="wallet-address">{shortenAddress(wallet.wallet_address)}</div>
                      <div className="wallet-network">{network.name}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {!wallet.is_primary && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleSetPrimary(wallet.id)}
                        style={{ padding: '8px 12px', fontSize: '0.875rem' }}
                      >
                        Set Primary
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => handleRemoveWallet(wallet.id)}
                      style={{ padding: '8px 12px', fontSize: '0.875rem' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Connect New Wallet */}
        {!challenge ? (
          <div style={{ marginTop: '24px' }}>
            <h3>Connect New Wallet</h3>

            <div className="form-group">
              <label htmlFor="network">Select Network</label>
              <select
                id="network"
                value={selectedNetwork}
                onChange={(e) => setSelectedNetwork(e.target.value as WalletType)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius)',
                  border: '2px solid var(--border)',
                  fontSize: '1rem',
                }}
              >
                {Object.entries(NETWORKS).map(([key, network]) => (
                  <option key={key} value={key}>
                    {network.icon} {network.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="walletLabel">Wallet Label (optional)</label>
              <input
                type="text"
                id="walletLabel"
                value={walletLabel}
                onChange={(e) => setWalletLabel(e.target.value)}
                placeholder="e.g., Main Wallet, Business"
                maxLength={50}
              />
            </div>

            <LoadingButton
              type="button"
              className="connect-wallet-btn"
              onClick={handleStartConnect}
              loading={connecting}
              loadingText="Connecting..."
              disabled={!hasWeb3Wallet && ['ethereum', 'polygon', 'base', 'arbitrum'].includes(selectedNetwork)}
            >
              <span style={{ fontSize: '1.25rem' }}>🔗</span>
              Connect Wallet
            </LoadingButton>

            {!hasWeb3Wallet && (
              <p style={{ marginTop: '12px', fontSize: '0.875rem', color: 'var(--secondary)' }}>
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--primary)' }}
                >
                  Install MetaMask
                </a>
                {' '}to connect Ethereum, Polygon, Base, or Arbitrum wallets.
              </p>
            )}
          </div>
        ) : (
          /* Signature Verification */
          <div style={{ marginTop: '24px' }}>
            <h3>Verify Wallet Ownership</h3>
            <p style={{ marginBottom: '16px' }}>
              Sign the message with your wallet to prove ownership.
            </p>

            <div style={{
              background: 'var(--light)',
              padding: '16px',
              borderRadius: 'var(--radius)',
              marginBottom: '16px'
            }}>
              <strong>Wallet:</strong>
              <div className="wallet-address" style={{ marginTop: '4px' }}>
                {walletAddress}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={cancelConnection}
              >
                Cancel
              </button>
              <LoadingButton
                type="button"
                className="btn btn-primary"
                onClick={handleVerifyAndLink}
                loading={connecting}
                loadingText="Signing..."
              >
                Sign & Verify
              </LoadingButton>
            </div>
          </div>
        )}

        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            className="btn-link"
            onClick={() => navigate('/provider')}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
