import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

const mockNavigate = vi.hoisted(() => vi.fn());
const mockConfirm = vi.hoisted(() => vi.fn());
const mockGet = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());
const mockUseAuth = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../providers/AuthProvider', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('../services/api', () => ({
  api: { get: mockGet, post: mockPost, delete: mockDelete },
}));

vi.mock('../components/Spinner', () => ({
  LoadingButton: ({
    children,
    loading,
    loadingText,
    ...props
  }: {
    children: React.ReactNode;
    loading?: boolean;
    loadingText?: string;
    [key: string]: unknown;
  }) => (
    <button {...props} disabled={loading || (props.disabled as boolean)}>
      {loading ? loadingText : children}
    </button>
  ),
}));

vi.mock('../components/ConfirmDialog', () => ({
  useConfirm: () => mockConfirm,
}));

vi.mock('../styles.css', () => ({}));

import { WalletConnect } from './WalletConnect';

const mockWallets = [
  {
    id: 'w1',
    wallet_address: '0xabcdef1234567890abcdef1234567890abcdef12',
    wallet_type: 'ethereum' as const,
    wallet_label: 'Main Wallet',
    is_primary: true,
    is_verified: true,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'w2',
    wallet_address: '0x9876543210fedcba9876543210fedcba98765432',
    wallet_type: 'polygon' as const,
    wallet_label: null,
    is_primary: false,
    is_verified: true,
    created_at: '2025-02-01T00:00:00Z',
  },
];

function renderComponent() {
  return render(
    <MemoryRouter>
      <WalletConnect />
    </MemoryRouter>
  );
}

describe('WalletConnect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    mockGet.mockResolvedValue({ data: mockWallets });
    // Default: no MetaMask
    (window as unknown as { ethereum?: unknown }).ethereum = undefined;
  });

  describe('loading state', () => {
    it('shows loading text', () => {
      mockGet.mockReturnValue(new Promise(() => {})); // never resolves
      renderComponent();
      expect(screen.getByText('Loading wallets...')).toBeInTheDocument();
    });
  });

  describe('wallet list', () => {
    it('shows page title', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('Crypto Wallets')).toBeInTheDocument());
    });

    it('shows subtitle', async () => {
      renderComponent();
      await waitFor(() =>
        expect(screen.getByText(/Connect your wallet to receive payouts/)).toBeInTheDocument()
      );
    });

    it('shows connected wallets heading', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('Connected Wallets')).toBeInTheDocument());
    });

    it('displays wallet labels', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('Main Wallet')).toBeInTheDocument());
    });

    it('displays network name for unlabeled wallet', async () => {
      renderComponent();
      // Second wallet has null label → shows network name "Polygon" in both label and network info
      await waitFor(() => expect(screen.getAllByText('Polygon').length).toBeGreaterThanOrEqual(1));
    });

    it('shows primary badge', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('Primary')).toBeInTheDocument());
    });

    it('shows shortened addresses', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('0xabcd...ef12')).toBeInTheDocument();
        expect(screen.getByText('0x9876...5432')).toBeInTheDocument();
      });
    });

    it('shows Set Primary button for non-primary wallet', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('Set Primary')).toBeInTheDocument());
    });

    it('shows Remove buttons', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getAllByText('Remove').length).toBe(2);
      });
    });

    it('shows back to dashboard link', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('← Back to Dashboard')).toBeInTheDocument());
    });
  });

  describe('connect new wallet form', () => {
    it('shows connect new wallet heading', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('Connect New Wallet')).toBeInTheDocument());
    });

    it('shows network select', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByLabelText('Select Network')).toBeInTheDocument();
      });
    });

    it('shows wallet label input', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByLabelText(/Wallet Label/)).toBeInTheDocument();
      });
    });

    it('shows Connect Wallet button', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
      });
    });

    it('shows install MetaMask link when no web3', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Install MetaMask')).toBeInTheDocument();
      });
    });

    it('hides install link when MetaMask present', async () => {
      (window as unknown as { ethereum?: unknown }).ethereum = { request: vi.fn() };
      renderComponent();
      await waitFor(() => expect(screen.getByText('Crypto Wallets')).toBeInTheDocument());
      expect(screen.queryByText('Install MetaMask')).not.toBeInTheDocument();
    });
  });

  describe('set primary', () => {
    it('calls API and reloads on set primary', async () => {
      mockPost.mockResolvedValue({});
      renderComponent();
      await waitFor(() => expect(screen.getByText('Set Primary')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Set Primary'));
      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/wallet/w2/primary');
      });
    });

    it('shows error on set primary failure', async () => {
      mockPost.mockRejectedValue(new Error('Network error'));
      renderComponent();
      await waitFor(() => expect(screen.getByText('Set Primary')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Set Primary'));
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('remove wallet', () => {
    it('calls confirm dialog on remove', async () => {
      mockConfirm.mockResolvedValue(false);
      renderComponent();
      await waitFor(() => expect(screen.getAllByText('Remove').length).toBe(2));
      fireEvent.click(screen.getAllByText('Remove')[0]);
      await waitFor(() => {
        expect(mockConfirm).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Remove Wallet', variant: 'danger' })
        );
      });
    });

    it('calls delete API when confirmed', async () => {
      mockConfirm.mockResolvedValue(true);
      mockDelete.mockResolvedValue({});
      renderComponent();
      await waitFor(() => expect(screen.getAllByText('Remove').length).toBe(2));
      fireEvent.click(screen.getAllByText('Remove')[0]);
      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalledWith('/wallet/w1');
      });
    });

    it('does not delete when cancelled', async () => {
      mockConfirm.mockResolvedValue(false);
      renderComponent();
      await waitFor(() => expect(screen.getAllByText('Remove').length).toBe(2));
      fireEvent.click(screen.getAllByText('Remove')[0]);
      await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
      expect(mockDelete).not.toHaveBeenCalled();
    });
  });

  describe('MetaMask connection flow', () => {
    it('connects and gets challenge', async () => {
      const mockRequest = vi.fn().mockResolvedValue(['0xabc123']);
      (window as unknown as { ethereum?: unknown }).ethereum = { request: mockRequest };
      mockPost.mockResolvedValue({
        data: { challengeId: 'ch1', message: 'Sign this', expiresAt: '2025-12-31' },
      });
      renderComponent();
      await waitFor(() => expect(screen.getByText('Connect Wallet')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Connect Wallet'));
      await waitFor(() => {
        expect(mockRequest).toHaveBeenCalledWith({ method: 'eth_requestAccounts' });
      });
      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(
          '/wallet/challenge',
          expect.objectContaining({
            walletAddress: '0xabc123',
            walletType: 'ethereum',
          })
        );
      });
    });

    it('shows verify step after challenge', async () => {
      const mockRequest = vi.fn().mockResolvedValue(['0xabc123']);
      (window as unknown as { ethereum?: unknown }).ethereum = { request: mockRequest };
      mockPost.mockResolvedValue({
        data: { challengeId: 'ch1', message: 'Sign this', expiresAt: '2025-12-31' },
      });
      renderComponent();
      await waitFor(() => expect(screen.getByText('Connect Wallet')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Connect Wallet'));
      await waitFor(() => {
        expect(screen.getByText('Verify Wallet Ownership')).toBeInTheDocument();
      });
    });

    it('shows cancel button in verify step', async () => {
      const mockRequest = vi.fn().mockResolvedValue(['0xabc123']);
      (window as unknown as { ethereum?: unknown }).ethereum = { request: mockRequest };
      mockPost.mockResolvedValue({
        data: { challengeId: 'ch1', message: 'Sign this', expiresAt: '2025-12-31' },
      });
      renderComponent();
      await waitFor(() => expect(screen.getByText('Connect Wallet')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Connect Wallet'));
      await waitFor(() => expect(screen.getByText('Cancel')).toBeInTheDocument());
    });

    it('cancels connection and returns to form', async () => {
      const mockRequest = vi.fn().mockResolvedValue(['0xabc123']);
      (window as unknown as { ethereum?: unknown }).ethereum = { request: mockRequest };
      mockPost.mockResolvedValue({
        data: { challengeId: 'ch1', message: 'Sign this', expiresAt: '2025-12-31' },
      });
      renderComponent();
      await waitFor(() => expect(screen.getByText('Connect Wallet')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Connect Wallet'));
      await waitFor(() => expect(screen.getByText('Cancel')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.getByText('Connect New Wallet')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('shows error when wallet list fails', async () => {
      mockGet.mockRejectedValue(new Error('Connection refused'));
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Connection refused')).toBeInTheDocument();
      });
    });

    it('shows error when MetaMask not available', async () => {
      // ethereum is undefined by default in beforeEach
      (window as unknown as { ethereum?: unknown }).ethereum = undefined;
      renderComponent();
      await waitFor(() => expect(screen.getByText('Connect Wallet')).toBeInTheDocument());
      // Connect Wallet button should be disabled
      expect(screen.getByText('Connect Wallet').closest('button')).toBeDisabled();
    });
  });

  describe('navigation', () => {
    it('navigates to dashboard on back click', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('← Back to Dashboard')).toBeInTheDocument());
      fireEvent.click(screen.getByText('← Back to Dashboard'));
      expect(mockNavigate).toHaveBeenCalledWith('/provider');
    });

    it('redirects to login if not authenticated', async () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: false });
      render(
        <MemoryRouter initialEntries={['/wallet/connect?network=base#verify']}>
          <WalletConnect />
        </MemoryRouter>
      );
      await waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith('/login', {
          state: { from: '/wallet/connect?network=base#verify' },
          replace: true,
        })
      );
      expect(mockGet).not.toHaveBeenCalled();
    });
  });
});
