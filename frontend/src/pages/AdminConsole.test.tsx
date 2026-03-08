import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockNavigate = vi.hoisted(() => vi.fn());
const mockGet = vi.hoisted(() => vi.fn());
const mockPut = vi.hoisted(() => vi.fn());
const mockShowToast = vi.hoisted(() => vi.fn());
const mockUseAuth = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../providers/AuthProvider', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('../services/api', () => ({
  api: { get: mockGet, put: mockPut },
}));

vi.mock('../components/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock('../components/Spinner', () => ({
  Spinner: ({ size }: { size?: number }) => <div data-testid="spinner">Loading {size}</div>,
}));

vi.mock('../components/ConfirmDialog', () => ({
  ConfirmDialog: ({
    isOpen,
    title,
    message,
    confirmText,
    onConfirm,
    onCancel,
  }: {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
    onCancel: () => void;
  }) =>
    isOpen ? (
      <div data-testid="confirm-dialog">
        <h2>{title}</h2>
        <p>{message}</p>
        <button onClick={onConfirm}>{confirmText}</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
}));

import { MemoryRouter } from 'react-router-dom';
import { AdminConsole } from './AdminConsole';

const mockDashboardData = {
  data: {
    overview: {
      totalUsers: 150,
      pendingUsers: 12,
      activeUsers: 130,
      totalTransactions: 500,
      totalRevenue: 7500000,
    },
    recentTransactions: [],
    onlineUsers: [
      {
        id: 'u1',
        email: 'online@test.com',
        full_name: 'Online User',
        phone: null,
        role: 'patient',
        status: 'active' as const,
        last_login: '2026-01-15T10:00:00Z',
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
  },
};

const mockUsers = {
  data: [
    {
      id: 'u1',
      email: 'alice@test.com',
      full_name: 'Alice Smith',
      phone: '555-0001',
      role: 'patient',
      status: 'active' as const,
      last_login: '2026-02-10T08:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'u2',
      email: 'bob@test.com',
      full_name: 'Bob Jones',
      phone: null,
      role: 'provider',
      status: 'pending' as const,
      last_login: null,
      created_at: '2026-02-01T00:00:00Z',
    },
    {
      id: 'u3',
      email: 'carol@test.com',
      full_name: 'Carol Lee',
      phone: '555-0003',
      role: 'patient',
      status: 'suspended' as const,
      last_login: '2026-01-20T12:00:00Z',
      created_at: '2025-12-01T00:00:00Z',
    },
  ],
};

function renderAdmin() {
  return render(
    <MemoryRouter>
      <AdminConsole />
    </MemoryRouter>
  );
}

describe('AdminConsole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'admin1', role: 'admin' } });
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/admin/dashboard')) return Promise.resolve(mockDashboardData);
      if (url.includes('/admin/users')) return Promise.resolve(mockUsers);
      if (url.includes('/admin/transactions')) return Promise.resolve({ data: [] });
      if (url.includes('/admin/webhooks')) return Promise.resolve({ data: [] });
      if (url.includes('/admin/audit-log')) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
    mockPut.mockResolvedValue({});
  });

  describe('access control', () => {
    it('redirects non-admin users', () => {
      mockUseAuth.mockReturnValue({ user: { id: 'u1', role: 'patient' } });
      renderAdmin();
      expect(mockShowToast).toHaveBeenCalledWith(
        'Access denied. Admin privileges required.',
        'error'
      );
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('loading state', () => {
    it('shows spinner while loading', () => {
      mockGet.mockReturnValue(new Promise(() => {}));
      renderAdmin();
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
      expect(screen.getByText('Loading Admin Console...')).toBeInTheDocument();
    });
  });

  describe('dashboard tab', () => {
    it('renders Admin Console heading', async () => {
      renderAdmin();
      await waitFor(() => expect(screen.getByText('Admin Console')).toBeInTheDocument());
    });

    it('displays stat cards with overview data', async () => {
      renderAdmin();
      await waitFor(() => {
        expect(screen.getByText('Total Users')).toBeInTheDocument();
        expect(screen.getByText('150')).toBeInTheDocument();
        expect(screen.getByText('Pending Approval')).toBeInTheDocument();
        expect(screen.getByText('12')).toBeInTheDocument();
        expect(screen.getByText('Active Users')).toBeInTheDocument();
        expect(screen.getByText('130')).toBeInTheDocument();
        expect(screen.getByText('Total Transactions')).toBeInTheDocument();
        expect(screen.getByText('500')).toBeInTheDocument();
      });
    });

    it('displays total revenue formatted as currency', async () => {
      renderAdmin();
      await waitFor(() => expect(screen.getByText('$75,000.00')).toBeInTheDocument());
    });

    it('shows online users', async () => {
      renderAdmin();
      await waitFor(() => expect(screen.getByText('online@test.com')).toBeInTheDocument());
    });

    it('shows no online users message when list is empty', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/admin/dashboard'))
          return Promise.resolve({ data: { ...mockDashboardData.data, onlineUsers: [] } });
        return Promise.resolve(mockUsers);
      });
      renderAdmin();
      await waitFor(() =>
        expect(screen.getByText('No users currently online')).toBeInTheDocument()
      );
    });
  });

  describe('tab navigation', () => {
    it('renders all tab buttons', async () => {
      renderAdmin();
      await waitFor(() => expect(screen.getByText('Admin Console')).toBeInTheDocument());
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/users/i)).toBeInTheDocument();
      expect(screen.getByText(/transactions/i)).toBeInTheDocument();
      expect(screen.getByText(/webhooks/i)).toBeInTheDocument();
      expect(screen.getByText(/logs/i)).toBeInTheDocument();
    });

    it('switches to users tab', async () => {
      renderAdmin();
      await waitFor(() => expect(screen.getByText('Admin Console')).toBeInTheDocument());
      fireEvent.click(screen.getByText(/users/i));
      await waitFor(() =>
        expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument()
      );
    });

    it('switches to transactions tab', async () => {
      renderAdmin();
      await waitFor(() => expect(screen.getByText('Admin Console')).toBeInTheDocument());
      fireEvent.click(screen.getByText(/transactions/i));
      await waitFor(() => expect(screen.getByText('No transactions found')).toBeInTheDocument());
    });
  });

  describe('users tab', () => {
    async function switchToUsersTab() {
      renderAdmin();
      await waitFor(() => expect(screen.getByText('Admin Console')).toBeInTheDocument());
      fireEvent.click(screen.getByText(/users/i));
      await waitFor(() => expect(screen.getByText('alice@test.com')).toBeInTheDocument());
    }

    it('displays user list in table', async () => {
      await switchToUsersTab();
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('bob@test.com')).toBeInTheDocument();
      expect(screen.getByText('carol@test.com')).toBeInTheDocument();
    });

    it('shows user roles', async () => {
      await switchToUsersTab();
      expect(screen.getByText('patient')).toBeInTheDocument();
      expect(screen.getByText('provider')).toBeInTheDocument();
    });

    it('shows status badges', async () => {
      await switchToUsersTab();
      expect(screen.getByText('active')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('suspended')).toBeInTheDocument();
    });

    it('shows Never for users without last login', async () => {
      await switchToUsersTab();
      expect(screen.getByText('Never')).toBeInTheDocument();
    });

    it('filters users by search term', async () => {
      await switchToUsersTab();
      fireEvent.change(screen.getByPlaceholderText('Search users...'), {
        target: { value: 'alice' },
      });
      expect(screen.getByText('alice@test.com')).toBeInTheDocument();
      expect(screen.queryByText('bob@test.com')).not.toBeInTheDocument();
    });

    it('filters users by status', async () => {
      await switchToUsersTab();
      fireEvent.change(screen.getByDisplayValue('All Status'), { target: { value: 'pending' } });
      expect(screen.getByText('bob@test.com')).toBeInTheDocument();
      expect(screen.queryByText('alice@test.com')).not.toBeInTheDocument();
    });

    it('shows approve button for pending users', async () => {
      await switchToUsersTab();
      const approveButtons = screen.getAllByText('✓ Approve');
      expect(approveButtons).toHaveLength(1);
    });

    it('shows suspend button for non-suspended users', async () => {
      await switchToUsersTab();
      const suspendButtons = screen.getAllByText('✕ Suspend');
      expect(suspendButtons).toHaveLength(2); // active + pending
    });

    it('opens confirm dialog when approve is clicked', async () => {
      await switchToUsersTab();
      fireEvent.click(screen.getByText('✓ Approve'));
      await waitFor(() => {
        expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
        expect(screen.getByText('Approve User')).toBeInTheDocument();
      });
    });

    it('approves user via confirm dialog', async () => {
      await switchToUsersTab();
      fireEvent.click(screen.getByText('✓ Approve'));
      await waitFor(() => expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Approve'));
      await waitFor(() => {
        expect(mockPut).toHaveBeenCalledWith('/admin/users/u2/status', { status: 'active' });
        expect(mockShowToast).toHaveBeenCalledWith(
          'User bob@test.com approved successfully',
          'success'
        );
      });
    });

    it('suspends user via confirm dialog', async () => {
      await switchToUsersTab();
      const suspendButtons = screen.getAllByText('✕ Suspend');
      fireEvent.click(suspendButtons[0]); // first suspend button = alice (active user)
      await waitFor(() => expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument());
      expect(screen.getByText('Suspend User')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Suspend'));
      await waitFor(() => {
        expect(mockPut).toHaveBeenCalledWith('/admin/users/u1/status', { status: 'suspended' });
        expect(mockShowToast).toHaveBeenCalledWith('User alice@test.com suspended', 'warning');
      });
    });

    it('cancels confirm dialog', async () => {
      await switchToUsersTab();
      fireEvent.click(screen.getByText('✓ Approve'));
      await waitFor(() => expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Cancel'));
      await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument());
    });

    it('shows error toast on approve failure', async () => {
      mockPut.mockRejectedValueOnce(new Error('Network error'));
      await switchToUsersTab();
      fireEvent.click(screen.getByText('✓ Approve'));
      await waitFor(() => expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Approve'));
      await waitFor(() =>
        expect(mockShowToast).toHaveBeenCalledWith('Failed to approve user', 'error')
      );
    });
  });

  describe('error handling', () => {
    it('handles dashboard fetch error gracefully', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/admin/dashboard')) return Promise.reject(new Error('Server error'));
        return Promise.resolve(mockUsers);
      });
      renderAdmin();
      await waitFor(() => expect(screen.getByText('Admin Console')).toBeInTheDocument());
    });
  });
});
