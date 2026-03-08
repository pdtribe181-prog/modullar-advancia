import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock data
const mockUser = { email: 'alice@example.com', role: 'patient' };
const mockTransactions = [
  {
    id: 'tx-00000001',
    amount: 5000,
    status: 'completed',
    type: 'payment',
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'tx-00000002',
    amount: 2000,
    status: 'pending',
    type: 'receive',
    created_at: '2026-01-14T09:00:00Z',
  },
];
const mockWallets = [
  {
    id: 'w1',
    walletAddress: '0xABC1234567890DEF',
    network: 'ethereum',
    label: 'Main',
    verificationStatus: 'verified',
    isPrimaryPayout: true,
    payoutEnabled: true,
    payoutCurrency: 'USD',
  },
];

// Hoist mock functions for vi.mock factory
const { mockGet, mockUseAuth } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockUseAuth: vi.fn(),
}));

vi.mock('../services/api', () => ({
  api: { get: mockGet },
}));

vi.mock('../providers/AuthProvider', () => ({
  useAuth: mockUseAuth,
}));

import { Dashboard } from './Dashboard';

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser, loading: false });
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/transactions'))
        return Promise.resolve({ success: true, data: mockTransactions });
      if (url.includes('/wallet/list'))
        return Promise.resolve({ success: true, data: mockWallets });
      return Promise.reject(new Error('Not found'));
    });
  });

  describe('loading state', () => {
    it('shows loading text while fetching', () => {
      mockGet.mockReturnValue(new Promise(() => {}));
      renderDashboard();
      expect(screen.getByText(/loading wallets/i)).toBeInTheDocument();
    });
  });

  describe('greeting', () => {
    it('displays username from email', async () => {
      renderDashboard();
      await waitFor(() => expect(screen.getByText(/welcome back/i)).toBeInTheDocument());
      expect(screen.getByText(/alice/i)).toBeInTheDocument();
    });
  });

  describe('wallets section', () => {
    it('shows wallet count', async () => {
      renderDashboard();
      await waitFor(() => expect(screen.getByText(/1 wallet/)).toBeInTheDocument());
    });

    it('shows no wallets message when empty', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/transactions'))
          return Promise.resolve({ success: true, data: mockTransactions });
        if (url.includes('/wallet/list')) return Promise.resolve({ success: true, data: [] });
        return Promise.reject(new Error('Not found'));
      });
      renderDashboard();
      await waitFor(() => expect(screen.getByText(/no wallets linked/i)).toBeInTheDocument());
    });
  });

  describe('quick actions', () => {
    it('renders standard action buttons', async () => {
      renderDashboard();
      await waitFor(() => expect(screen.getByText('Make Payment')).toBeInTheDocument());
      expect(screen.getByText('Wallet Balance')).toBeInTheDocument();
      expect(screen.getByText('Appointments')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    it('shows Provider Panel for provider role', async () => {
      mockUseAuth.mockReturnValue({ user: { ...mockUser, role: 'provider' }, loading: false });
      renderDashboard();
      await waitFor(() => expect(screen.getByText('Provider Panel')).toBeInTheDocument());
    });

    it('shows Admin Console for admin role', async () => {
      mockUseAuth.mockReturnValue({ user: { ...mockUser, role: 'admin' }, loading: false });
      renderDashboard();
      await waitFor(() => expect(screen.getByText('Admin Console')).toBeInTheDocument());
    });

    it('hides admin items for patient role', async () => {
      renderDashboard();
      await waitFor(() => expect(screen.getByText('Make Payment')).toBeInTheDocument());
      expect(screen.queryByText('Provider Panel')).not.toBeInTheDocument();
      expect(screen.queryByText('Admin Console')).not.toBeInTheDocument();
    });
  });

  describe('recent activity', () => {
    it('renders transactions after loading', async () => {
      renderDashboard();
      await waitFor(() => expect(screen.queryByText(/unable to load/i)).not.toBeInTheDocument());
      // Data has loaded; check for transaction content
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByText(/completed/i)).toBeInTheDocument();
    });

    it('shows no transactions message when empty', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/transactions')) return Promise.resolve({ success: true, data: [] });
        if (url.includes('/wallet/list'))
          return Promise.resolve({ success: true, data: mockWallets });
        return Promise.reject(new Error('Not found'));
      });
      renderDashboard();
      await waitFor(() => expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument());
    });
  });

  describe('error handling', () => {
    it('shows error when both fetches fail', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));
      renderDashboard();
      await waitFor(() => expect(screen.getByText(/unable to load/i)).toBeInTheDocument());
    });

    it('retry button re-fetches data', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));
      renderDashboard();
      await waitFor(() => expect(screen.getByText(/retry/i)).toBeInTheDocument());

      // Fix the mock for retry
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/transactions'))
          return Promise.resolve({ success: true, data: mockTransactions });
        if (url.includes('/wallet/list'))
          return Promise.resolve({ success: true, data: mockWallets });
        return Promise.reject(new Error('Not found'));
      });
      fireEvent.click(screen.getByText(/retry/i));
      await waitFor(() => expect(screen.queryByText(/unable to load/i)).not.toBeInTheDocument());
    });
  });

  describe('auth state', () => {
    it('does not fetch data while auth is loading', () => {
      mockUseAuth.mockReturnValue({ user: null, loading: true });
      renderDashboard();
      expect(mockGet).not.toHaveBeenCalled();
    });
  });
});
