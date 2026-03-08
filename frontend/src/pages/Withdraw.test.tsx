import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockGet = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());

vi.mock('../services/api', () => ({
  api: { get: mockGet, post: mockPost },
}));

vi.mock('../components/Spinner', () => ({
  Spinner: ({ size }: { size?: number }) => <span data-testid="spinner">Loading {size}</span>,
}));

import { Withdraw } from './Withdraw';

const mockWallets = [
  {
    id: 'w1',
    walletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
    network: 'ethereum',
    label: 'Main ETH',
    verificationStatus: 'verified',
    isPrimaryPayout: true,
    payoutEnabled: true,
    payoutCurrency: 'USDC',
  },
];

function renderComponent() {
  return render(
    <MemoryRouter>
      <Withdraw />
    </MemoryRouter>
  );
}

describe('Withdraw', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ success: true, data: mockWallets });
  });

  describe('rendering', () => {
    it('shows page title', () => {
      renderComponent();
      expect(screen.getByText('Withdraw Funds')).toBeInTheDocument();
    });

    it('shows subtitle', () => {
      renderComponent();
      expect(screen.getByText(/Send funds to your crypto wallet or bank/)).toBeInTheDocument();
    });

    it('shows method selector buttons', () => {
      renderComponent();
      expect(screen.getByText(/Crypto Wallet/)).toBeInTheDocument();
      expect(screen.getByText(/Bank Transfer/)).toBeInTheDocument();
    });

    it('shows review button', () => {
      renderComponent();
      expect(screen.getByText('Review Withdrawal')).toBeInTheDocument();
    });

    it('shows processing time info', () => {
      renderComponent();
      expect(screen.getByText(/Crypto withdrawals settle in 10–30 minutes/)).toBeInTheDocument();
    });
  });

  describe('crypto form', () => {
    it('shows payout wallet dropdown', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Payout Wallet')).toBeInTheDocument();
      });
    });

    it('shows wallet options after load', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText(/Main ETH/)).toBeInTheDocument();
      });
    });

    it('shows currency selector', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Currency')).toBeInTheDocument();
      });
    });

    it('shows amount field', () => {
      renderComponent();
      expect(screen.getByText('Amount')).toBeInTheDocument();
    });

    it('validates missing wallet selection', async () => {
      const { container } = renderComponent();
      await waitFor(() => expect(screen.getByText(/Main ETH/)).toBeInTheDocument());
      fireEvent.submit(container.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText('Select a payout wallet')).toBeInTheDocument();
      });
    });

    it('validates missing amount', async () => {
      const { container } = renderComponent();
      await waitFor(() => expect(screen.getByText(/Main ETH/)).toBeInTheDocument());
      // Select wallet
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: 'w1' } });
      fireEvent.submit(container.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText('Enter a valid amount')).toBeInTheDocument();
      });
    });

    it('shows loading spinner for wallets', () => {
      mockGet.mockReturnValue(new Promise(() => {}));
      renderComponent();
      expect(screen.getByText(/Loading wallets/)).toBeInTheDocument();
    });

    it('shows no wallets message', async () => {
      mockGet.mockResolvedValue({ success: true, data: [] });
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText(/No payout-enabled wallets/)).toBeInTheDocument();
      });
    });
  });

  describe('bank form', () => {
    function switchToBank() {
      renderComponent();
      fireEvent.click(screen.getByText(/Bank Transfer/));
    }

    it('shows bank form fields', () => {
      switchToBank();
      expect(screen.getByText('Amount (USD)')).toBeInTheDocument();
      expect(screen.getByText('Bank Name')).toBeInTheDocument();
      expect(screen.getByText('Account Number')).toBeInTheDocument();
      expect(screen.getByText('Routing Number')).toBeInTheDocument();
    });

    it('shows account type selector', () => {
      switchToBank();
      expect(screen.getByText('Account Type')).toBeInTheDocument();
    });

    it('shows minimum withdrawal note', () => {
      switchToBank();
      expect(screen.getByText(/Minimum withdrawal: \$10\.00/)).toBeInTheDocument();
    });

    it('validates missing amount', async () => {
      const { container } = renderComponent();
      fireEvent.click(screen.getByText(/Bank Transfer/));
      fireEvent.submit(container.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText('Enter withdrawal amount')).toBeInTheDocument();
      });
    });
  });

  describe('confirm step', () => {
    async function goToConfirm() {
      const { container } = renderComponent();
      await waitFor(() => expect(screen.getByText(/Main ETH/)).toBeInTheDocument());
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: 'w1' } });
      const amountInput = screen.getByPlaceholderText('0.00');
      fireEvent.change(amountInput, { target: { value: '50' } });
      fireEvent.submit(container.querySelector('form')!);
      return container;
    }

    it('shows confirm withdrawal heading', async () => {
      await goToConfirm();
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Confirm Withdrawal' })).toBeInTheDocument();
      });
    });

    it('shows amount in confirm', async () => {
      await goToConfirm();
      await waitFor(() => {
        expect(screen.getByText('50 USDC')).toBeInTheDocument();
      });
    });

    it('shows edit and confirm buttons', async () => {
      await goToConfirm();
      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Confirm Withdrawal' })).toBeInTheDocument();
      });
    });

    it('goes back to form on edit click', async () => {
      await goToConfirm();
      await waitFor(() => expect(screen.getByText('Edit')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Edit'));
      expect(screen.getByText('Review Withdrawal')).toBeInTheDocument();
    });
  });

  describe('submission', () => {
    async function submitWithdrawal() {
      const { container } = renderComponent();
      await waitFor(() => expect(screen.getByText(/Main ETH/)).toBeInTheDocument());
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: 'w1' } });
      const amountInput = screen.getByPlaceholderText('0.00');
      fireEvent.change(amountInput, { target: { value: '25' } });
      fireEvent.submit(container.querySelector('form')!);
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Confirm Withdrawal' })).toBeInTheDocument()
      );
      fireEvent.click(screen.getByRole('button', { name: 'Confirm Withdrawal' }));
    }

    it('shows success screen after submit', async () => {
      mockPost.mockResolvedValue({ success: true });
      await submitWithdrawal();
      await waitFor(() => {
        expect(screen.getByText('Withdrawal Requested')).toBeInTheDocument();
      });
    });

    it('shows processing time in success', async () => {
      mockPost.mockResolvedValue({ success: true });
      await submitWithdrawal();
      await waitFor(() => {
        expect(screen.getByText(/1–3 business days/)).toBeInTheDocument();
      });
    });

    it('shows dashboard link in success', async () => {
      mockPost.mockResolvedValue({ success: true });
      await submitWithdrawal();
      await waitFor(() => {
        expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
      });
    });

    it('shows new withdrawal button in success', async () => {
      mockPost.mockResolvedValue({ success: true });
      await submitWithdrawal();
      await waitFor(() => {
        expect(screen.getByText('New Withdrawal')).toBeInTheDocument();
      });
    });

    it('calls api.post on confirm', async () => {
      mockPost.mockResolvedValue({ success: true });
      await submitWithdrawal();
      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(
          '/transactions',
          expect.objectContaining({
            type: 'crypto_withdrawal',
            amount: 25,
            currency: 'USDC',
          })
        );
      });
    });

    it('shows error on failed submit', async () => {
      mockPost.mockRejectedValue(new Error('fail'));
      await submitWithdrawal();
      await waitFor(() => {
        expect(screen.getByText(/Withdrawal request failed/)).toBeInTheDocument();
      });
    });

    it('resets to form after new withdrawal click', async () => {
      mockPost.mockResolvedValue({ success: true });
      await submitWithdrawal();
      await waitFor(() => expect(screen.getByText('New Withdrawal')).toBeInTheDocument());
      fireEvent.click(screen.getByText('New Withdrawal'));
      expect(screen.getByText('Withdraw Funds')).toBeInTheDocument();
    });
  });
});
