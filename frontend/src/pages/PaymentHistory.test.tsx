import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PaymentHistory from './PaymentHistory';

const mockGet = vi.hoisted(() => vi.fn());
const mockShowToast = vi.hoisted(() => vi.fn());

vi.mock('../services/api', () => ({
  api: { get: mockGet },
  ApiError: class ApiError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

vi.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({}),
}));

vi.mock('../components/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const mockPayments = [
  {
    id: 'pi_001',
    amount: 150.0,
    currency: 'usd',
    status: 'succeeded',
    description: 'Office visit copay',
    created: '2025-12-01T10:30:00Z',
    metadata: {},
  },
  {
    id: 'pi_002',
    amount: 75.5,
    currency: 'usd',
    status: 'processing',
    description: null,
    created: '2025-12-02T14:00:00Z',
    metadata: {},
  },
];

function renderHistory() {
  return render(
    <MemoryRouter>
      <PaymentHistory />
    </MemoryRouter>
  );
}

describe('PaymentHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ payments: mockPayments, has_more: false });
  });

  it('shows loading spinner initially', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    renderHistory();
    expect(screen.getByText('Loading payment history...')).toBeInTheDocument();
  });

  it('renders heading after load', async () => {
    renderHistory();
    expect(await screen.findByText('Payment History')).toBeInTheDocument();
  });

  it('renders payment descriptions', async () => {
    renderHistory();
    expect(await screen.findByText('Office visit copay')).toBeInTheDocument();
  });

  it('renders Payment as fallback when description is null', async () => {
    renderHistory();
    expect(await screen.findByText('Payment')).toBeInTheDocument();
  });

  it('renders payment amounts formatted as currency', async () => {
    renderHistory();
    expect(await screen.findByText('$150.00')).toBeInTheDocument();
    expect(screen.getByText('$75.50')).toBeInTheDocument();
  });

  it('renders status badges', async () => {
    renderHistory();
    expect(await screen.findByText('succeeded')).toBeInTheDocument();
    expect(screen.getByText('processing')).toBeInTheDocument();
  });

  it('renders table headers', async () => {
    renderHistory();
    await screen.findByText('Payment History');
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('shows empty state when no payments', async () => {
    mockGet.mockResolvedValue({ payments: [], has_more: false });
    renderHistory();
    expect(await screen.findByText('No payments yet')).toBeInTheDocument();
    expect(screen.getByText(/payment history will appear here/)).toBeInTheDocument();
  });

  it('shows error when fetch fails', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));
    renderHistory();
    expect(await screen.findByText('Failed to load payment history')).toBeInTheDocument();
    expect(mockShowToast).toHaveBeenCalledWith('Failed to load payment history', 'error');
  });

  it('shows Load More button when has_more is true', async () => {
    mockGet.mockResolvedValue({ payments: mockPayments, has_more: true });
    renderHistory();
    expect(await screen.findByRole('button', { name: 'Load More' })).toBeInTheDocument();
  });

  it('hides Load More button when has_more is false', async () => {
    renderHistory();
    await screen.findByText('Payment History');
    expect(screen.queryByRole('button', { name: 'Load More' })).not.toBeInTheDocument();
  });

  it('loads more payments on button click', async () => {
    mockGet
      .mockResolvedValueOnce({ payments: mockPayments, has_more: true })
      .mockResolvedValueOnce({
        payments: [
          {
            id: 'pi_003',
            amount: 200,
            currency: 'usd',
            status: 'succeeded',
            description: 'Follow-up',
            created: '2025-12-03T09:00:00Z',
            metadata: {},
          },
        ],
        has_more: false,
      });

    renderHistory();
    const loadMoreBtn = await screen.findByRole('button', { name: 'Load More' });
    fireEvent.click(loadMoreBtn);

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
    expect(mockGet).toHaveBeenLastCalledWith('/stripe/payment-history?starting_after=pi_002');
    expect(await screen.findByText('Follow-up')).toBeInTheDocument();
  });
});
