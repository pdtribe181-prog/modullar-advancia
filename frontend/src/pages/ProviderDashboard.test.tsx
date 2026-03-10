import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockGet = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());
const mockPut = vi.hoisted(() => vi.fn());
const mockShowToast = vi.hoisted(() => vi.fn());

vi.mock('../services/api', () => ({
  api: { get: mockGet, post: mockPost, put: mockPut },
  ApiError: class ApiError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

vi.mock('../components/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock('../components/Spinner', () => ({
  Spinner: ({ size }: { size?: number }) => <div data-testid="spinner">Loading {size}</div>,
  LoadingButton: ({
    children,
    loading,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    loading: boolean;
    onClick?: () => void;
    [k: string]: unknown;
  }) => (
    <button onClick={onClick} disabled={loading} {...props}>
      {loading ? 'Saving...' : children}
    </button>
  ),
}));

import ProviderDashboard from './ProviderDashboard';

const mockProvider = {
  provider: {
    id: 'p1',
    business_name: 'Health Clinic',
    specialty: 'Cardiology',
    phone: '555-1234',
    email: 'clinic@test.com',
    consultation_fee: 200,
    bio: 'Expert cardiologist',
    stripe_onboarding_complete: true,
  },
};

const mockAppointments = {
  appointments: [
    {
      id: 'apt1',
      appointment_date: '2026-03-15',
      appointment_time: '10:00 AM',
      duration_minutes: 30,
      reason: 'Checkup',
      status: 'scheduled',
      payment_status: 'paid',
      patient: { id: 'pat1', name: 'John Doe', email: 'john@test.com' },
    },
    {
      id: 'apt2',
      appointment_date: '2026-03-16',
      appointment_time: '2:00 PM',
      duration_minutes: 60,
      reason: 'Follow-up',
      status: 'confirmed',
      payment_status: 'paid',
      patient: { id: 'pat2', name: 'Jane Lee', email: 'jane@test.com' },
    },
    {
      id: 'apt3',
      appointment_date: '2026-03-10',
      appointment_time: '9:00 AM',
      duration_minutes: 30,
      reason: 'Consultation',
      status: 'completed',
      payment_status: 'paid',
      patient: { id: 'pat3', name: 'Sam Park', email: 'sam@test.com' },
    },
  ],
};

const mockEarnings = {
  period: 30,
  completedAppointments: 8,
  totalEarnings: 1600,
  stripeBalance: { available: 1200, pending: 400, currency: 'usd' },
};

describe('ProviderDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/provider/me')) return Promise.resolve(mockProvider);
      if (url.includes('/provider/appointments')) return Promise.resolve(mockAppointments);
      if (url.includes('/provider/earnings')) return Promise.resolve(mockEarnings);
      return Promise.resolve({});
    });
    mockPost.mockResolvedValue({});
    mockPut.mockResolvedValue({});
  });

  describe('loading state', () => {
    it('shows spinner while loading', () => {
      mockGet.mockReturnValue(new Promise(() => {}));
      render(<ProviderDashboard />);
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
    });
  });

  describe('not registered', () => {
    it('shows warning when provider not found', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/provider/me')) {
          const err = new Error('not found');
          err.message = 'Provider not found';
          return Promise.reject(err);
        }
        return Promise.resolve({ appointments: [] });
      });
      render(<ProviderDashboard />);
      await waitFor(() =>
        expect(screen.getByText(/need to register as a provider/i)).toBeInTheDocument()
      );
    });
  });

  describe('dashboard header', () => {
    it('renders Provider Dashboard heading and business name', async () => {
      render(<ProviderDashboard />);
      await waitFor(() => {
        expect(screen.getByText('Provider Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Health Clinic')).toBeInTheDocument();
      });
    });
  });

  describe('quick stats', () => {
    it('displays upcoming appointment count', async () => {
      render(<ProviderDashboard />);
      await waitFor(() =>
        expect(screen.getAllByText('Upcoming Appointments').length).toBeGreaterThanOrEqual(1)
      );
      // scheduled + confirmed = 2
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('displays earnings amount', async () => {
      render(<ProviderDashboard />);
      await waitFor(() => {
        expect(screen.getByText("This Month's Earnings")).toBeInTheDocument();
        expect(screen.getByText('$1600')).toBeInTheDocument();
      });
    });

    it('displays available balance', async () => {
      render(<ProviderDashboard />);
      await waitFor(() => {
        expect(screen.getByText('Available Balance')).toBeInTheDocument();
        expect(screen.getByText('$1200')).toBeInTheDocument();
      });
    });
  });

  describe('appointments tab', () => {
    it('displays appointment table with details', async () => {
      render(<ProviderDashboard />);
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john@test.com')).toBeInTheDocument();
        expect(screen.getByText('Checkup')).toBeInTheDocument();
        expect(screen.getByText('10:00 AM')).toBeInTheDocument();
      });
    });

    it('displays appointment statuses', async () => {
      render(<ProviderDashboard />);
      await waitFor(() => {
        expect(screen.getByText('scheduled')).toBeInTheDocument();
        expect(screen.getByText('confirmed')).toBeInTheDocument();
        expect(screen.getByText('completed')).toBeInTheDocument();
      });
    });

    it('shows Confirm button for scheduled appointments', async () => {
      render(<ProviderDashboard />);
      await waitFor(() => expect(screen.getByText('Confirm')).toBeInTheDocument());
    });

    it('shows Complete and Cancel buttons for scheduled/confirmed', async () => {
      render(<ProviderDashboard />);
      await waitFor(() => {
        const completeButtons = screen.getAllByText('Complete');
        const cancelButtons = screen.getAllByText('Cancel');
        expect(completeButtons).toHaveLength(2);
        expect(cancelButtons).toHaveLength(2);
      });
    });

    it('confirms an appointment', async () => {
      render(<ProviderDashboard />);
      await waitFor(() => expect(screen.getByText('Confirm')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Confirm'));
      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/provider/appointments/apt1/confirm', {});
        expect(mockShowToast).toHaveBeenCalledWith('Appointment confirmed', 'success');
      });
    });

    it('opens complete modal when Complete is clicked', async () => {
      render(<ProviderDashboard />);
      await waitFor(() => expect(screen.getAllByText('Complete')).toHaveLength(2));
      fireEvent.click(screen.getAllByText('Complete')[0]);
      await waitFor(() => expect(screen.getByText('Complete Appointment')).toBeInTheDocument());
    });

    it('completes appointment with notes', async () => {
      render(<ProviderDashboard />);
      await waitFor(() => expect(screen.getAllByText('Complete')).toHaveLength(2));
      fireEvent.click(screen.getAllByText('Complete')[0]);
      await waitFor(() => expect(screen.getByText('Complete Appointment')).toBeInTheDocument());

      fireEvent.change(screen.getByPlaceholderText('Enter any notes for this appointment...'), {
        target: { value: 'All good' },
      });
      fireEvent.click(screen.getByText('Mark Complete'));
      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/provider/appointments/apt1/complete', {
          notes: 'All good',
        });
        expect(mockShowToast).toHaveBeenCalledWith('Appointment marked as complete', 'success');
      });
    });

    it('opens cancel modal when Cancel is clicked', async () => {
      render(<ProviderDashboard />);
      await waitFor(() => expect(screen.getAllByText('Cancel')).toHaveLength(2));
      // Click the first Cancel button from the table rows (not modal)
      fireEvent.click(screen.getAllByText('Cancel')[0]);
      await waitFor(() =>
        expect(screen.getAllByText('Cancel Appointment').length).toBeGreaterThanOrEqual(1)
      );
    });

    it('cancels appointment with reason', async () => {
      render(<ProviderDashboard />);
      await waitFor(() => expect(screen.getAllByText('Cancel')).toHaveLength(2));
      fireEvent.click(screen.getAllByText('Cancel')[0]);
      await waitFor(() =>
        expect(screen.getAllByText('Cancel Appointment').length).toBeGreaterThanOrEqual(1)
      );

      fireEvent.change(screen.getByPlaceholderText('Enter reason for cancellation...'), {
        target: { value: 'Patient requested' },
      });
      // Click the Cancel Appointment button (the one inside the modal)
      const cancelBtns = screen.getAllByText('Cancel Appointment');
      const submitBtn =
        cancelBtns.find((el) => el.tagName === 'BUTTON') || cancelBtns[cancelBtns.length - 1];
      fireEvent.click(submitBtn);
      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/provider/appointments/apt1/cancel', {
          reason: 'Patient requested',
        });
        expect(mockShowToast).toHaveBeenCalledWith('Appointment cancelled', 'success');
      });
    });

    it('shows empty state when no appointments', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/provider/me')) return Promise.resolve(mockProvider);
        if (url.includes('/provider/appointments')) return Promise.resolve({ appointments: [] });
        if (url.includes('/provider/earnings')) return Promise.resolve(mockEarnings);
        return Promise.resolve({});
      });
      render(<ProviderDashboard />);
      await waitFor(() => expect(screen.getByText('No upcoming appointments')).toBeInTheDocument());
    });
  });

  describe('tab navigation', () => {
    it('shows tab buttons', async () => {
      render(<ProviderDashboard />);
      await waitFor(() => {
        expect(screen.getByText('Appointments')).toBeInTheDocument();
        expect(screen.getByText('Earnings')).toBeInTheDocument();
        expect(screen.getByText('Profile')).toBeInTheDocument();
      });
    });

    it('switches to earnings tab', async () => {
      render(<ProviderDashboard />);
      await waitFor(() => expect(screen.getByText('Earnings')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Earnings'));
      await waitFor(() => {
        expect(screen.getByText('Earnings Summary (Last 30 Days)')).toBeInTheDocument();
        expect(screen.getByText('Completed Appointments')).toBeInTheDocument();
      });
    });

    it('displays earnings data in earnings tab', async () => {
      render(<ProviderDashboard />);
      await waitFor(() => expect(screen.getByText('Earnings')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Earnings'));
      await waitFor(() => {
        expect(screen.getByText('8')).toBeInTheDocument();
        expect(screen.getByText(/Total earnings: \$1600/)).toBeInTheDocument();
        expect(screen.getByText('Stripe Balance')).toBeInTheDocument();
      });
    });

    it('switches to profile tab', async () => {
      render(<ProviderDashboard />);
      await waitFor(() => expect(screen.getByText('Profile')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Profile'));
      await waitFor(() => {
        expect(screen.getByText('Provider Profile')).toBeInTheDocument();
        expect(screen.getByText('Cardiology')).toBeInTheDocument();
      });
    });
  });

  describe('profile tab', () => {
    async function switchToProfile() {
      render(<ProviderDashboard />);
      await waitFor(() => expect(screen.getByText('Profile')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Profile'));
      await waitFor(() => expect(screen.getByText('Provider Profile')).toBeInTheDocument());
    }

    it('displays provider details', async () => {
      await switchToProfile();
      expect(screen.getAllByText('Health Clinic').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Cardiology')).toBeInTheDocument();
      expect(screen.getByText('$200')).toBeInTheDocument();
      expect(screen.getByText('Expert cardiologist')).toBeInTheDocument();
    });

    it('shows stripe connected status', async () => {
      await switchToProfile();
      expect(screen.getByText('✓ Connected')).toBeInTheDocument();
    });

    it('enters edit mode and shows form fields', async () => {
      await switchToProfile();
      fireEvent.click(screen.getByText('Edit'));
      await waitFor(() => expect(screen.getByDisplayValue('Health Clinic')).toBeInTheDocument());
      expect(screen.getByDisplayValue('Cardiology')).toBeInTheDocument();
      expect(screen.getByDisplayValue('200')).toBeInTheDocument();
    });
  });
});
