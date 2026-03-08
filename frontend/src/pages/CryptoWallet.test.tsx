import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CryptoWallet } from './CryptoWallet';

// Mock window.ethereum
const mockEthereum = {
  request: vi.fn(),
  selectedAddress: null as string | null,
};

Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  writable: true,
});

function renderComponent() {
  return render(<CryptoWallet />);
}

describe('CryptoWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEthereum.request.mockReset();
    mockEthereum.selectedAddress = null;
    (window as any).ethereum = mockEthereum;
  });

  describe('connect screen', () => {
    it('renders the hero section', () => {
      renderComponent();
      expect(screen.getByText('Crypto Wallet')).toBeInTheDocument();
    });

    it('shows connect wallet card', () => {
      renderComponent();
      expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
    });

    it('shows connect description', () => {
      renderComponent();
      expect(screen.getByText(/Connect MetaMask or any EIP-1193/)).toBeInTheDocument();
    });

    it('shows Connect MetaMask button', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /Connect MetaMask/ })).toBeInTheDocument();
    });

    it('shows supported tokens', () => {
      renderComponent();
      expect(screen.getByText('ETH')).toBeInTheDocument();
      expect(screen.getByText('USDC')).toBeInTheDocument();
      expect(screen.getByText('SOL')).toBeInTheDocument();
      expect(screen.getByText('BTC')).toBeInTheDocument();
    });

    it('shows non-custodial note', () => {
      renderComponent();
      expect(screen.getByText(/Non-custodial.*never store/)).toBeInTheDocument();
    });

    it('connects wallet on button click', async () => {
      mockEthereum.request.mockResolvedValue(['0x1234567890abcdef1234567890abcdef12345678']);
      renderComponent();
      fireEvent.click(screen.getByRole('button', { name: /Connect MetaMask/ }));
      await waitFor(() => {
        expect(screen.getByText(/Wallet connected successfully/)).toBeInTheDocument();
      });
    });

    it('shows error when connection rejected', async () => {
      mockEthereum.request.mockRejectedValue(new Error('User rejected'));
      renderComponent();
      fireEvent.click(screen.getByRole('button', { name: /Connect MetaMask/ }));
      await waitFor(() => {
        expect(screen.getByText(/Connection rejected/)).toBeInTheDocument();
      });
    });

    it('shows error when no wallet detected', async () => {
      (window as any).ethereum = undefined;
      renderComponent();
      fireEvent.click(screen.getByRole('button', { name: /Connect MetaMask/ }));
      await waitFor(() => {
        expect(screen.getByText(/No Web3 wallet detected/)).toBeInTheDocument();
      });
    });
  });

  describe('connected dashboard', () => {
    beforeEach(async () => {
      mockEthereum.request.mockResolvedValue(['0x1234567890abcdef1234567890abcdef12345678']);
    });

    async function connectAndRender() {
      renderComponent();
      fireEvent.click(screen.getByRole('button', { name: /Connect MetaMask/ }));
      await waitFor(() => expect(screen.getByText(/Wallet connected/)).toBeInTheDocument());
    }

    it('shows shortened address', async () => {
      await connectAndRender();
      expect(screen.getByText(/0x123456…345678/)).toBeInTheDocument();
    });

    it('shows token balance cards', async () => {
      await connectAndRender();
      expect(screen.getByText('0.4521')).toBeInTheDocument();
      expect(screen.getByText('320.00')).toBeInTheDocument();
      expect(screen.getByText('12.50')).toBeInTheDocument();
      expect(screen.getByText('0.0082')).toBeInTheDocument();
    });

    it('shows Disconnect button', async () => {
      await connectAndRender();
      expect(screen.getByText('Disconnect')).toBeInTheDocument();
    });

    it('disconnects wallet', async () => {
      await connectAndRender();
      fireEvent.click(screen.getByText('Disconnect'));
      expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
    });

    it('copies address to clipboard', async () => {
      await connectAndRender();
      fireEvent.click(screen.getByText(/Copy/));
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        '0x1234567890abcdef1234567890abcdef12345678'
      );
    });

    it('shows send tab by default', async () => {
      await connectAndRender();
      expect(screen.getByText(/Recipient Address/)).toBeInTheDocument();
    });

    it('shows tab navigation', async () => {
      await connectAndRender();
      expect(screen.getByText('↑ Send')).toBeInTheDocument();
      expect(screen.getByText('↓ Receive')).toBeInTheDocument();
      expect(screen.getByText(/History/)).toBeInTheDocument();
    });
  });

  describe('send tab', () => {
    async function connectAndRender() {
      mockEthereum.request.mockResolvedValue(['0x1234567890abcdef1234567890abcdef12345678']);
      renderComponent();
      fireEvent.click(screen.getByRole('button', { name: /Connect MetaMask/ }));
      await waitFor(() => expect(screen.getByText(/Wallet connected/)).toBeInTheDocument());
    }

    it('shows recipient and amount fields', async () => {
      await connectAndRender();
      expect(screen.getByPlaceholderText(/0x123…abc/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
    });

    it('shows MAX button', async () => {
      await connectAndRender();
      expect(screen.getByText('MAX')).toBeInTheDocument();
    });

    it('fills max balance on MAX click', async () => {
      await connectAndRender();
      fireEvent.click(screen.getByText('MAX'));
      const amountInput = screen.getByPlaceholderText('0.00') as HTMLInputElement;
      expect(amountInput.value).toBe('0.4521');
    });

    it('shows error for empty fields', async () => {
      await connectAndRender();
      fireEvent.click(screen.getByText(/Send ETH/));
      await waitFor(() => {
        expect(screen.getByText(/Please fill in both/)).toBeInTheDocument();
      });
    });

    it('validates address format', async () => {
      await connectAndRender();
      fireEvent.change(screen.getByPlaceholderText(/0x123…abc/), { target: { value: 'invalid' } });
      fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '0.1' } });
      fireEvent.click(screen.getByText(/Send ETH/));
      await waitFor(() => {
        expect(screen.getByText(/Invalid Ethereum address/)).toBeInTheDocument();
      });
    });

    it('shows disclaimer about irreversibility', async () => {
      await connectAndRender();
      expect(screen.getByText(/transactions are irreversible/)).toBeInTheDocument();
    });
  });

  describe('receive tab', () => {
    async function goToReceive() {
      mockEthereum.request.mockResolvedValue(['0x1234567890abcdef1234567890abcdef12345678']);
      renderComponent();
      fireEvent.click(screen.getByRole('button', { name: /Connect MetaMask/ }));
      await waitFor(() => expect(screen.getByText(/Wallet connected/)).toBeInTheDocument());
      fireEvent.click(screen.getByText('↓ Receive'));
    }

    it('shows QR code placeholder', async () => {
      await goToReceive();
      expect(screen.getByLabelText(/QR code/i)).toBeInTheDocument();
    });

    it('shows full address', async () => {
      await goToReceive();
      expect(screen.getByText('0x1234567890abcdef1234567890abcdef12345678')).toBeInTheDocument();
    });

    it('shows copy address button', async () => {
      await goToReceive();
      expect(screen.getByText(/Copy Wallet Address/)).toBeInTheDocument();
    });
  });

  describe('history tab', () => {
    async function goToHistory() {
      mockEthereum.request.mockResolvedValue(['0x1234567890abcdef1234567890abcdef12345678']);
      renderComponent();
      fireEvent.click(screen.getByRole('button', { name: /Connect MetaMask/ }));
      await waitFor(() => expect(screen.getByText(/Wallet connected/)).toBeInTheDocument());
      fireEvent.click(screen.getByText(/History/));
    }

    it('shows transaction history table', async () => {
      await goToHistory();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Token')).toBeInTheDocument();
      expect(screen.getByText('Amount')).toBeInTheDocument();
    });

    it('shows transaction entries', async () => {
      await goToHistory();
      expect(screen.getByText('+0.45')).toBeInTheDocument();
      expect(screen.getByText('−120.00')).toBeInTheDocument();
    });

    it('shows transaction dates', async () => {
      await goToHistory();
      expect(screen.getByText('Feb 23, 2026')).toBeInTheDocument();
    });

    it('shows disclaimer about illustrative data', async () => {
      await goToHistory();
      expect(screen.getByText(/Transaction history shown is illustrative/)).toBeInTheDocument();
    });
  });
});
