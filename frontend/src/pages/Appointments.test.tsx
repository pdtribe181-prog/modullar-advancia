import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Appointments from './Appointments';

const mockGet = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());
const mockShowToast = vi.hoisted(() => vi.fn());
const mockConfirm = vi.hoisted(() => vi.fn());

vi.mock('../services/api', () => ({
  api: { get: mockGet, post: mockPost },
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

vi.mock('../components/ConfirmDialog', () => ({
  useConfirm: () => mockConfirm,
}));

vi.mock('../lib/stripe', () => ({
  stripePromise: Promise.resolve(null),
}));

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useStripe: () => null,
  useElements: () => null,
  PaymentElement: () => <div data-testid="payment-element">PaymentElement</div>,
}));

const mockProviders = [
  {
    id: 'prov-1',
    name: 'Dr. Smith',
    specialty: 'Cardiology',
    consultationFee: 200,
    acceptsPayments: true,
  },
  {
    id: 'prov-2',
    name: 'Dr. Jones',
    specialty: 'Dermatology',
    consultationFee: 150,
    acceptsPayments: false,
  },
];

const mockAppointments = [
  {
    id: 'apt-1',
    date: '2026-04-01',
    time: '10:00 AM',
    duration: 30,
    reason: 'Checkup',
    status: 'scheduled',
    paymentStatus: 'paid',
    provider: { id: 'prov-1', business_name: 'Smith Cardiology', specialty: 'Heart Care' },
  },
  {
    id: 'apt-2',
    date: '2026-04-05',
    time: '2:00 PM',
    duration: 30,
    reason: '',
    status: 'completed',
    paymentStatus: 'paid',
    provider: { id: 'prov-2', business_name: 'Jones Derm', specialty: 'Skin Care' },
  },
];

function renderAppointments() {
  return render(
    <MemoryRouter>
      <Appointments />
    </MemoryRouter>
  );
}

describe('Appointments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/availability')) {
        return Promise.resolve({
          slots: [
            { time: '9:00 AM', available: true },
            { time: '10:00 AM', available: false },
          ],
        });
      }
      if (url.includes('/appointments/providers')) {
        return Promise.resolve({ providers: mockProviders });
      }
      if (url.includes('/appointments/my-appointments')) {
        return Promise.resolve({ appointments: mockAppointments });
      }
      return Promise.resolve({});
    });
  });

  describe('list view', () => {
    it('renders page heading', async () => {
      renderAppointments();
      expect(screen.getByText('Appointments')).toBeInTheDocument();
    });

    it('shows loading state for appointments', () => {
      mockGet.mockReturnValue(new Promise(() => {}));
      renderAppointments();
      expect(screen.getByText('Loading appointments...')).toBeInTheDocument();
    });

    it('shows loading state for providers', () => {
      mockGet.mockReturnValue(new Promise(() => {}));
      renderAppointments();
      expect(screen.getByText('Loading providers...')).toBeInTheDocument();
    });

    it('renders upcoming appointments', async () => {
      renderAppointments();
      expect(await screen.findByText('Smith Cardiology')).toBeInTheDocument();
      expect(screen.getByText('Jones Derm')).toBeInTheDocument();
    });

    it('shows appointment status badges', async () => {
      renderAppointments();
      expect(await screen.findByText('scheduled')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
    });

    it('shows appointment time and reason', async () => {
      renderAppointments();
      expect(await screen.findByText(/10:00 AM/)).toBeInTheDocument();
      expect(screen.getByText(/Reason: Checkup/)).toBeInTheDocument();
    });

    it('shows cancel button for scheduled appointments only', async () => {
      renderAppointments();
      await screen.findByText('Smith Cardiology');
      const cancelButtons = screen.getAllByText('Cancel');
      expect(cancelButtons).toHaveLength(1); // only the scheduled one
    });

    it('renders no upcoming appointments message when empty', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/appointments/my-appointments'))
          return Promise.resolve({ appointments: [] });
        if (url.includes('/appointments/providers'))
          return Promise.resolve({ providers: mockProviders });
        return Promise.resolve({});
      });
      renderAppointments();
      expect(await screen.findByText('No upcoming appointments')).toBeInTheDocument();
    });

    it('renders provider cards', async () => {
      renderAppointments();
      expect(await screen.findByText('Dr. Smith')).toBeInTheDocument();
      expect(screen.getByText('Cardiology')).toBeInTheDocument();
      expect(screen.getByText('$200')).toBeInTheDocument();
    });

    it('shows online payments indicator for eligible providers', async () => {
      renderAppointments();
      expect(await screen.findByText('✓ Online payments')).toBeInTheDocument();
    });

    it('shows no providers message when empty', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/appointments/providers')) return Promise.resolve({ providers: [] });
        if (url.includes('/appointments/my-appointments'))
          return Promise.resolve({ appointments: mockAppointments });
        return Promise.resolve({});
      });
      renderAppointments();
      expect(await screen.findByText('No providers available')).toBeInTheDocument();
    });

    it('shows error toast when providers fail to load', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/appointments/providers'))
          return Promise.reject(new Error('Network error'));
        if (url.includes('/appointments/my-appointments'))
          return Promise.resolve({ appointments: [] });
        return Promise.resolve({});
      });
      renderAppointments();
      await waitFor(() =>
        expect(mockShowToast).toHaveBeenCalledWith('Failed to load providers', 'error')
      );
    });
  });

  describe('booking flow', () => {
    it('navigates to booking view on provider click', async () => {
      renderAppointments();
      const providerCard = await screen.findByText('Dr. Smith');
      fireEvent.click(providerCard);
      expect(screen.getByText(/Book with Dr. Smith/)).toBeInTheDocument();
      expect(screen.getByText('Fee: $200')).toBeInTheDocument();
    });

    it('shows back to providers button', async () => {
      renderAppointments();
      fireEvent.click(await screen.findByText('Dr. Smith'));
      const backBtn = screen.getByText(/Back to providers/);
      fireEvent.click(backBtn);
      expect(await screen.findByText('Book an Appointment')).toBeInTheDocument();
    });

    it('loads time slots when date is selected', async () => {
      renderAppointments();
      fireEvent.click(await screen.findByText('Dr. Smith'));

      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: '2026-04-15' } });

      expect(await screen.findByText('9:00 AM')).toBeInTheDocument();
      expect(screen.getByText('10:00 AM')).toBeInTheDocument();
    });

    it('shows no slots message when empty', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/availability')) return Promise.resolve({ slots: [] });
        if (url.includes('/appointments/providers'))
          return Promise.resolve({ providers: mockProviders });
        if (url.includes('/appointments/my-appointments'))
          return Promise.resolve({ appointments: [] });
        return Promise.resolve({});
      });
      renderAppointments();
      fireEvent.click(await screen.findByText('Dr. Smith'));
      fireEvent.change(document.querySelector('input[type="date"]') as HTMLInputElement, {
        target: { value: '2026-04-15' },
      });
      expect(await screen.findByText('No available slots for this date')).toBeInTheDocument();
    });

    it('books appointment and goes to payment step', async () => {
      mockPost.mockResolvedValue({
        appointment: { id: 'new-apt' },
        payment: { clientSecret: 'cs_test_123', amount: 20000 },
      });
      renderAppointments();
      fireEvent.click(await screen.findByText('Dr. Smith'));

      // Select date
      fireEvent.change(document.querySelector('input[type="date"]') as HTMLInputElement, {
        target: { value: '2026-04-15' },
      });
      // Select time slot
      fireEvent.click(await screen.findByText('9:00 AM'));

      // Click book
      fireEvent.click(screen.getByText(/Book Appointment/));

      await waitFor(() =>
        expect(mockPost).toHaveBeenCalledWith('/appointments/book', {
          providerId: 'prov-1',
          date: '2026-04-15',
          time: '9:00 AM',
          reason: '',
        })
      );

      expect(mockShowToast).toHaveBeenCalledWith(
        'Appointment created! Please complete payment.',
        'success'
      );
    });

    it('shows error when booking fails', async () => {
      mockPost.mockRejectedValue(new Error('Slot taken'));
      renderAppointments();
      fireEvent.click(await screen.findByText('Dr. Smith'));
      fireEvent.change(document.querySelector('input[type="date"]') as HTMLInputElement, {
        target: { value: '2026-04-15' },
      });
      fireEvent.click(await screen.findByText('9:00 AM'));
      fireEvent.click(screen.getByText(/Book Appointment/));

      await waitFor(() =>
        expect(mockShowToast).toHaveBeenCalledWith('Failed to book appointment', 'error')
      );
    });
  });

  describe('cancel appointment', () => {
    it('cancels appointment after confirmation', async () => {
      mockConfirm.mockResolvedValue(true);
      mockPost.mockResolvedValue({});
      renderAppointments();

      const cancelBtn = await screen.findByText('Cancel');
      fireEvent.click(cancelBtn);

      await waitFor(() =>
        expect(mockPost).toHaveBeenCalledWith('/appointments/apt-1/cancel', {
          reason: 'Patient requested',
        })
      );
      expect(mockShowToast).toHaveBeenCalledWith('Appointment cancelled successfully', 'success');
    });

    it('does not cancel when user declines confirmation', async () => {
      mockConfirm.mockResolvedValue(false);
      renderAppointments();

      const cancelBtn = await screen.findByText('Cancel');
      fireEvent.click(cancelBtn);

      await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
      expect(mockPost).not.toHaveBeenCalled();
    });
  });
});
