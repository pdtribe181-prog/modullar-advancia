import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockGet = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());

vi.mock('../services/api', () => ({
  api: { get: mockGet, post: mockPost },
}));

vi.mock('../components/Spinner', () => ({
  Spinner: ({ size }: { size?: number }) => (
    <div data-testid="spinner" data-size={size}>
      Loading...
    </div>
  ),
}));

import { MedBed } from './MedBed';

const mockBeds = [
  {
    id: 'bed-1',
    name: 'ICU Bed A1',
    facility_name: 'City Hospital',
    bed_type: 'icu',
    specialty: 'Cardiology',
    location: 'Floor 3, Wing B',
    daily_rate: 500,
    is_available: true,
    features: ['Heart Monitor', 'Ventilator'],
  },
  {
    id: 'bed-2',
    name: 'Standard Bed B2',
    facility_name: 'Metro Clinic',
    bed_type: 'standard',
    specialty: '',
    location: 'Floor 1',
    daily_rate: 200,
    is_available: false,
  },
];

const mockBookings = [
  {
    id: 'book-1',
    bed_id: 'bed-1',
    check_in_date: '2026-03-10',
    check_out_date: '2026-03-15',
    status: 'active',
    total_amount: 2500,
    notes: 'Need oxygen',
    created_at: '2026-03-01',
    med_beds: { name: 'ICU Bed A1', facility_name: 'City Hospital', bed_type: 'icu' },
  },
  {
    id: 'book-2',
    bed_id: 'bed-2',
    check_in_date: '2026-02-01',
    check_out_date: '2026-02-03',
    status: 'completed',
    total_amount: 400,
    notes: '',
    created_at: '2026-01-28',
    med_beds: { name: 'Standard Bed B2', facility_name: 'Metro Clinic', bed_type: 'standard' },
  },
];

function renderComponent() {
  return render(
    <MemoryRouter>
      <MedBed />
    </MemoryRouter>
  );
}

describe('MedBed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((url: string) => {
      if (url === '/medbed') return Promise.resolve({ success: true, data: mockBeds });
      if (url === '/medbed/bookings') return Promise.resolve({ success: true, data: mockBookings });
      return Promise.resolve({ success: false });
    });
    mockPost.mockResolvedValue({ success: true });
    // mock confirm for cancel booking
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  describe('rendering', () => {
    it('renders the page header', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText(/MedBed/)).toBeInTheDocument();
      });
      expect(screen.getByText(/Browse available medical beds/)).toBeInTheDocument();
    });

    it('shows loading spinner initially', () => {
      mockGet.mockReturnValue(new Promise(() => {})); // never resolves
      renderComponent();
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });

    it('renders tab buttons', async () => {
      renderComponent();
      expect(screen.getByText(/Browse Beds/)).toBeInTheDocument();
      expect(screen.getByText(/My Bookings/)).toBeInTheDocument();
    });
  });

  describe('browse beds tab', () => {
    it('renders bed cards after loading', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('ICU Bed A1')).toBeInTheDocument();
      });
      expect(screen.getByText('City Hospital')).toBeInTheDocument();
      expect(screen.getByText('Standard Bed B2')).toBeInTheDocument();
    });

    it('shows availability badges', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Available')).toBeInTheDocument();
      });
      expect(screen.getByText('Unavailable')).toBeInTheDocument();
    });

    it('shows daily rate', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('$500')).toBeInTheDocument();
      });
    });

    it('shows bed type and specialty', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('icu')).toBeInTheDocument();
      });
      expect(screen.getByText('Cardiology')).toBeInTheDocument();
    });

    it('shows location', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText(/Floor 3, Wing B/)).toBeInTheDocument();
      });
    });

    it('shows empty state when no beds', async () => {
      mockGet.mockResolvedValue({ success: true, data: [] });
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText(/No beds available right now/)).toBeInTheDocument();
      });
    });

    it('shows error state on API failure', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Service temporarily unavailable')).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'));
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('disables Book Now for unavailable beds', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('ICU Bed A1')).toBeInTheDocument();
      });
      const bookButtons = screen.getAllByText('Book Now');
      // The unavailable bed's button should be disabled
      expect(bookButtons[1]).toBeDisabled();
    });
  });

  describe('booking modal', () => {
    it('opens modal when clicking Book Now on available bed', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('ICU Bed A1')).toBeInTheDocument();
      });
      const bookButtons = screen.getAllByText('Book Now');
      fireEvent.click(bookButtons[0]);
      expect(screen.getByText(/Book: ICU Bed A1/)).toBeInTheDocument();
    });

    it('shows facility name and daily rate in modal', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('ICU Bed A1')).toBeInTheDocument());
      fireEvent.click(screen.getAllByText('Book Now')[0]);
      expect(screen.getByText(/City Hospital · \$500\/day/)).toBeInTheDocument();
    });

    it('closes modal when clicking close button', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('ICU Bed A1')).toBeInTheDocument());
      fireEvent.click(screen.getAllByText('Book Now')[0]);
      expect(screen.getByText(/Book: ICU Bed A1/)).toBeInTheDocument();
      fireEvent.click(screen.getByText('✕'));
      expect(screen.queryByText(/Book: ICU Bed A1/)).not.toBeInTheDocument();
    });

    it('closes modal when clicking Cancel button', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('ICU Bed A1')).toBeInTheDocument());
      fireEvent.click(screen.getAllByText('Book Now')[0]);
      // There's a Cancel button in the modal form
      const cancelButtons = screen.getAllByText('Cancel');
      fireEvent.click(cancelButtons[0]);
      expect(screen.queryByText(/Book: ICU Bed A1/)).not.toBeInTheDocument();
    });

    it('shows price calculation when dates are selected', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('ICU Bed A1')).toBeInTheDocument());
      fireEvent.click(screen.getAllByText('Book Now')[0]);
      const dateInputs = document.querySelectorAll('input[type="date"]');
      fireEvent.change(dateInputs[0], { target: { value: '2026-04-01' } });
      fireEvent.change(dateInputs[1], { target: { value: '2026-04-04' } });
      await waitFor(() => {
        expect(screen.getByText(/3 nights × \$500\/day/)).toBeInTheDocument();
        expect(screen.getByText('$1,500')).toBeInTheDocument();
      });
    });

    it('submits booking and shows success', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('ICU Bed A1')).toBeInTheDocument());
      fireEvent.click(screen.getAllByText('Book Now')[0]);
      const dateInputs = document.querySelectorAll('input[type="date"]');
      fireEvent.change(dateInputs[0], { target: { value: '2026-04-01' } });
      fireEvent.change(dateInputs[1], { target: { value: '2026-04-04' } });
      fireEvent.click(screen.getByText('Confirm Booking'));
      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(
          '/medbed/bookings',
          expect.objectContaining({
            bed_id: 'bed-1',
            check_in_date: '2026-04-01',
            check_out_date: '2026-04-04',
          })
        );
      });
      await waitFor(() => {
        expect(screen.getByText(/Booking confirmed at City Hospital/)).toBeInTheDocument();
      });
    });

    it('shows error when booking fails', async () => {
      mockPost.mockResolvedValue({ success: false });
      renderComponent();
      await waitFor(() => expect(screen.getByText('ICU Bed A1')).toBeInTheDocument());
      fireEvent.click(screen.getAllByText('Book Now')[0]);
      const dateInputs = document.querySelectorAll('input[type="date"]');
      fireEvent.change(dateInputs[0], { target: { value: '2026-04-01' } });
      fireEvent.change(dateInputs[1], { target: { value: '2026-04-04' } });
      fireEvent.click(screen.getByText('Confirm Booking'));
      await waitFor(() => {
        expect(screen.getByText(/Booking failed/)).toBeInTheDocument();
      });
    });
  });

  describe('my bookings tab', () => {
    it('switches to bookings tab', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('ICU Bed A1')).toBeInTheDocument());
      fireEvent.click(screen.getByText(/My Bookings/));
      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith('/medbed/bookings');
      });
    });

    it('shows booking details', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('ICU Bed A1')).toBeInTheDocument());
      fireEvent.click(screen.getByText(/My Bookings/));
      await waitFor(() => {
        expect(screen.getByText('ICU Bed A1')).toBeInTheDocument();
        expect(screen.getByText('City Hospital')).toBeInTheDocument();
      });
    });

    it('shows booking status badges', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('ICU Bed A1')).toBeInTheDocument());
      fireEvent.click(screen.getByText(/My Bookings/));
      await waitFor(() => {
        expect(screen.getByText('active')).toBeInTheDocument();
        expect(screen.getByText('completed')).toBeInTheDocument();
      });
    });

    it('shows cancel button only for active bookings', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('ICU Bed A1')).toBeInTheDocument());
      fireEvent.click(screen.getByText(/My Bookings/));
      await waitFor(() => {
        const cancelButtons = screen.getAllByText('Cancel');
        expect(cancelButtons).toHaveLength(1); // only for active booking
      });
    });

    it('cancels a booking', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('ICU Bed A1')).toBeInTheDocument());
      fireEvent.click(screen.getByText(/My Bookings/));
      await waitFor(() => expect(screen.getByText('active')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Cancel'));
      expect(mockPost).toHaveBeenCalledWith('/medbed/bookings/book-1/cancel', {});
    });

    it('shows empty state when no bookings', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url === '/medbed') return Promise.resolve({ success: true, data: mockBeds });
        if (url === '/medbed/bookings') return Promise.resolve({ success: true, data: [] });
        return Promise.resolve({ success: false });
      });
      renderComponent();
      await waitFor(() => expect(screen.getByText('ICU Bed A1')).toBeInTheDocument());
      fireEvent.click(screen.getByText(/My Bookings/));
      await waitFor(() => {
        expect(screen.getByText(/No bookings yet/)).toBeInTheDocument();
      });
    });

    it('shows Browse Beds button in empty bookings state', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url === '/medbed') return Promise.resolve({ success: true, data: mockBeds });
        if (url === '/medbed/bookings') return Promise.resolve({ success: true, data: [] });
        return Promise.resolve({ success: false });
      });
      renderComponent();
      await waitFor(() => expect(screen.getByText('ICU Bed A1')).toBeInTheDocument());
      fireEvent.click(screen.getByText(/My Bookings/));
      await waitFor(() => {
        expect(screen.getByText('Browse Beds')).toBeInTheDocument();
      });
    });
  });
});
