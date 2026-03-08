import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const { mockGet, mockPost, mockPatch, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPatch: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('../services/api', () => ({
  api: { get: mockGet, post: mockPost, patch: mockPatch, delete: mockDelete },
}));

vi.mock('../components/Spinner', () => ({
  Spinner: ({ size }: { size?: number }) => <div data-testid="spinner">Loading {size}</div>,
}));

import { Notifications } from './Notifications';

const mockNotifications = [
  {
    id: 'n1',
    user_id: 'u1',
    type: 'payment',
    title: 'Payment Received',
    message: 'You received $50.00',
    is_read: false,
    priority: 'normal' as const,
    action_url: '/history',
    created_at: new Date(Date.now() - 5 * 60000).toISOString(), // 5 min ago
  },
  {
    id: 'n2',
    user_id: 'u1',
    type: 'security',
    title: 'Login Alert',
    message: 'New login from Chrome',
    is_read: true,
    priority: 'high' as const,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
  },
  {
    id: 'n3',
    user_id: 'u1',
    type: 'appointment',
    title: 'Appointment Reminder',
    message: 'Upcoming appointment tomorrow',
    is_read: false,
    priority: 'urgent' as const,
    created_at: new Date(Date.now() - 30 * 60000).toISOString(), // 30 min ago
  },
];

function renderNotifications() {
  return render(<Notifications />);
}

describe('Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ success: true, data: mockNotifications });
    mockPatch.mockResolvedValue({});
    mockPost.mockResolvedValue({});
    mockDelete.mockResolvedValue({});
  });

  describe('loading state', () => {
    it('shows loading spinner while fetching', () => {
      mockGet.mockReturnValue(new Promise(() => {}));
      renderNotifications();
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
      expect(screen.getByText(/Loading notifications/)).toBeInTheDocument();
    });
  });

  describe('header', () => {
    it('renders Notifications heading', async () => {
      renderNotifications();
      await waitFor(() => expect(screen.getByText('Notifications')).toBeInTheDocument());
    });

    it('shows unread count badge', async () => {
      renderNotifications();
      await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument()); // 2 unread
    });

    it('shows subtitle text', async () => {
      renderNotifications();
      await waitFor(() =>
        expect(screen.getByText(/Stay up-to-date with payments/)).toBeInTheDocument()
      );
    });

    it('renders Mark all read button when unread exist', async () => {
      renderNotifications();
      await waitFor(() => expect(screen.getByText(/Mark all read/)).toBeInTheDocument());
    });
  });

  describe('filter tabs', () => {
    it('renders All filter tab', async () => {
      renderNotifications();
      await waitFor(() => expect(screen.getByText('All')).toBeInTheDocument());
    });

    it('renders Unread tab with count', async () => {
      renderNotifications();
      await waitFor(() => expect(screen.getByText(/Unread/)).toBeInTheDocument());
    });

    it('renders High Priority tab', async () => {
      renderNotifications();
      await waitFor(() => expect(screen.getByText('High Priority')).toBeInTheDocument());
    });
  });

  describe('notification items', () => {
    it('renders all notification titles', async () => {
      renderNotifications();
      await waitFor(() => {
        expect(screen.getByText('Payment Received')).toBeInTheDocument();
        expect(screen.getByText('Login Alert')).toBeInTheDocument();
        expect(screen.getByText('Appointment Reminder')).toBeInTheDocument();
      });
    });

    it('renders notification messages', async () => {
      renderNotifications();
      await waitFor(() => {
        expect(screen.getByText('You received $50.00')).toBeInTheDocument();
        expect(screen.getByText('New login from Chrome')).toBeInTheDocument();
      });
    });

    it('renders View link for notifications with action_url', async () => {
      renderNotifications();
      await waitFor(() => expect(screen.getByText('View →')).toBeInTheDocument());
    });

    it('renders Dismiss buttons', async () => {
      renderNotifications();
      await waitFor(() => {
        const dismissBtns = screen.getAllByText('Dismiss');
        expect(dismissBtns.length).toBe(3);
      });
    });

    it('shows priority badge for high/urgent', async () => {
      renderNotifications();
      await waitFor(() => {
        expect(screen.getByText('high')).toBeInTheDocument();
        expect(screen.getByText('urgent')).toBeInTheDocument();
      });
    });

    it('shows relative time for recent notifications', async () => {
      renderNotifications();
      await waitFor(() => {
        expect(screen.getByText('5m ago')).toBeInTheDocument();
      });
    });
  });

  describe('filter interaction', () => {
    it('filters to unread notifications', async () => {
      renderNotifications();
      await waitFor(() => expect(screen.getByText('Payment Received')).toBeInTheDocument());

      fireEvent.click(screen.getByText(/Unread/));

      // Unread items should be visible
      expect(screen.getByText('Payment Received')).toBeInTheDocument();
      expect(screen.getByText('Appointment Reminder')).toBeInTheDocument();
      // Read item should not be visible
      expect(screen.queryByText('Login Alert')).not.toBeInTheDocument();
    });

    it('filters to high priority notifications', async () => {
      renderNotifications();
      await waitFor(() => expect(screen.getByText('Payment Received')).toBeInTheDocument());

      fireEvent.click(screen.getByText('High Priority'));

      expect(screen.getByText('Login Alert')).toBeInTheDocument();
      expect(screen.getByText('Appointment Reminder')).toBeInTheDocument();
      expect(screen.queryByText('Payment Received')).not.toBeInTheDocument();
    });
  });

  describe('mark as read', () => {
    it('calls patch when clicking unread notification', async () => {
      renderNotifications();
      await waitFor(() => expect(screen.getByText('Payment Received')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Payment Received'));
      expect(mockPatch).toHaveBeenCalledWith('/notifications/n1', { is_read: true });
    });
  });

  describe('mark all read', () => {
    it('calls post to mark-all-read', async () => {
      renderNotifications();
      await waitFor(() => expect(screen.getByText(/Mark all read/)).toBeInTheDocument());

      fireEvent.click(screen.getByText(/Mark all read/));
      expect(mockPost).toHaveBeenCalledWith('/notifications/mark-all-read', {});
    });
  });

  describe('dismiss', () => {
    it('calls delete and removes notification', async () => {
      renderNotifications();
      await waitFor(() => expect(screen.getByText('Payment Received')).toBeInTheDocument());

      const dismissBtns = screen.getAllByText('Dismiss');
      fireEvent.click(dismissBtns[0]);

      expect(mockDelete).toHaveBeenCalledWith('/notifications/n1');
      await waitFor(() => {
        expect(screen.queryByText('Payment Received')).not.toBeInTheDocument();
      });
    });
  });

  describe('error state', () => {
    it('shows error message when API fails', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));
      renderNotifications();
      await waitFor(() =>
        expect(screen.getByText('Notification service unavailable')).toBeInTheDocument()
      );
    });

    it('shows Retry button on error', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));
      renderNotifications();
      await waitFor(() => expect(screen.getByText('Retry')).toBeInTheDocument());
    });

    it('retries fetch on Retry click', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'));
      mockGet.mockResolvedValueOnce({ success: true, data: mockNotifications });
      renderNotifications();
      await waitFor(() => expect(screen.getByText('Retry')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Retry'));
      await waitFor(() => expect(screen.getByText('Payment Received')).toBeInTheDocument());
    });
  });

  describe('empty state', () => {
    it('shows empty state when no notifications', async () => {
      mockGet.mockResolvedValue({ success: true, data: [] });
      renderNotifications();
      await waitFor(() => expect(screen.getByText('No notifications yet')).toBeInTheDocument());
    });

    it('shows All caught up for unread filter with none unread', async () => {
      const allRead = mockNotifications.map((n) => ({ ...n, is_read: true }));
      mockGet.mockResolvedValue({ success: true, data: allRead });
      renderNotifications();
      await waitFor(() => expect(screen.getByText('All')).toBeInTheDocument());

      fireEvent.click(screen.getByText(/Unread/));
      expect(screen.getByText('All caught up!')).toBeInTheDocument();
    });

    it('shows No high-priority alerts when filtering high with none', async () => {
      const lowPriority = mockNotifications.map((n) => ({ ...n, priority: 'normal' as const }));
      mockGet.mockResolvedValue({ success: true, data: lowPriority });
      renderNotifications();
      await waitFor(() => expect(screen.getByText('All')).toBeInTheDocument());

      fireEvent.click(screen.getByText('High Priority'));
      expect(screen.getByText('No high-priority alerts')).toBeInTheDocument();
    });
  });
});
