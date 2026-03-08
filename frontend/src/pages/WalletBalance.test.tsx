import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockGet = vi.hoisted(() => vi.fn());

vi.mock('../services/api', () => ({
  api: { get: mockGet },
}));

vi.mock('../components/Spinner', () => ({
  Spinner: ({ size }: { size?: number }) => <div data-testid="spinner">Loading {size}</div>,
}));

Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  writable: true,
  configurable: true,
});

import { WalletBalance } from './WalletBalance';

const mockWallets = [
  {
    id: 'w1',
    walletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
    network: 'ethereum',
    label: 'Main Wallet',
    verificationStatus: 'verified',
    isPrimaryPayout: true,
    payoutEnabled: true,
    minPayoutAmount: 10,
    payoutCurrency: 'USDC',
    createdAt: '2026-01-15',
  },
  {
    id: 'w2',
    walletAddress: '0x9876543210fedcba9876543210fedcba98765432',
    network: 'polygon',
    label: 'Polygon Wallet',
    verificationStatus: 'pending',
    isPrimaryPayout: false,
    payoutEnabled: false,
    minPayoutAmount: 5,
    payoutCurrency: 'MATIC',
    createdAt: '2026-02-10',
  },
];

function renderComponent() {
  return render(
    <MemoryRouter>
      <WalletBalance />
    </MemoryRouter>
  );
}

describe('WalletBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('shows spinner while loading', () => {
      mockGet.mockReturnValue(new Promise(() => {})); // never resolves
      renderComponent();
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });

    it('shows loading text', () => {
      mockGet.mockReturnValue(new Promise(() => {}));
      renderComponent();
      expect(screen.getByText(/Loading wallets/)).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message on API failure', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Unable to reach wallet service')).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'));
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('retries on retry click', async () => {
      mockGet.mockRejectedValueOnce(new Error('fail'));
      renderComponent();
      await waitFor(() => expect(screen.getByText('Retry')).toBeInTheDocument());
      mockGet.mockResolvedValueOnce({ success: true, data: mockWallets });
      fireEvent.click(screen.getByText('Retry'));
      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('empty state', () => {
    it('shows empty message when no wallets', async () => {
      mockGet.mockResolvedValue({ success: true, data: [] });
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('No wallets linked yet')).toBeInTheDocument();
      });
    });

    it('shows connect wallet link', async () => {
      mockGet.mockResolvedValue({ success: true, data: [] });
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
      });
    });
  });

  describe('with wallets', () => {
    beforeEach(() => {
      mockGet.mockResolvedValue({ success: true, data: mockWallets });
    });

    it('shows page title', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Wallet Balance')).toBeInTheDocument();
      });
    });

    it('shows subtitle', async () => {
      renderComponent();
      await waitFor(() => {
        expect(
          screen.getByText(/Manage and monitor your linked blockchain wallets/)
        ).toBeInTheDocument();
      });
    });

    it('shows summary stats', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Total Wallets')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('Verified')).toBeInTheDocument();
        expect(screen.getByText('Payout Enabled')).toBeInTheDocument();
      });
    });

    it('shows primary payout network', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Primary Payout')).toBeInTheDocument();
        expect(screen.getByText('ethereum')).toBeInTheDocument();
      });
    });

    it('shows wallet labels', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Main Wallet')).toBeInTheDocument();
        expect(screen.getByText('Polygon Wallet')).toBeInTheDocument();
      });
    });

    it('shows verification statuses', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('verified')).toBeInTheDocument();
        expect(screen.getByText('pending')).toBeInTheDocument();
      });
    });

    it('shows primary badge', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Primary')).toBeInTheDocument();
      });
    });

    it('shows payout currency for enabled wallets', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText(/Payout: USDC/)).toBeInTheDocument();
      });
    });

    it('shows Linked Wallets heading', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Linked Wallets')).toBeInTheDocument();
      });
    });

    it('shows wallet count', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('2 wallets')).toBeInTheDocument();
      });
    });

    it('shows Link New Wallet button', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('+ Link New Wallet')).toBeInTheDocument();
      });
    });

    it('shows shortened addresses by default', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText(/0xabcdef12…abcdef12/)).toBeInTheDocument();
      });
    });

    it('toggles address visibility', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('Main Wallet')).toBeInTheDocument());
      fireEvent.click(screen.getByText(/Hide.*Addresses|Show.*Addresses/));
      const dots = screen.getAllByText(/••••••••/);
      expect(dots.length).toBeGreaterThanOrEqual(1);
    });

    it('copies address on copy button click', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('Main Wallet')).toBeInTheDocument());
      const copyButtons = screen.getAllByTitle('Copy address');
      fireEvent.click(copyButtons[0]);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        '0xabcdef1234567890abcdef1234567890abcdef12'
      );
    });
  });
});
