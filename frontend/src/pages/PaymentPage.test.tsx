import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
const mockNavigateComponent = vi.fn();
const mockShowToast = vi.fn();

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Navigate: (props: { to: string; state?: unknown; replace?: boolean }) => {
      mockNavigateComponent(props);
      return <div data-testid="navigate">Redirecting to {props.to}</div>;
    },
  };
});

vi.mock('../providers/AuthProvider', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('../components/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock('../components/Spinner', () => ({
  LoadingButton: ({ children, loading, loadingText, ...props }: any) => (
    <button {...props}>{loading ? loadingText : children}</button>
  ),
}));

vi.mock('../utils/validation', () => ({
  validatePaymentForm: vi.fn(() => ({ success: true })),
  getFieldError: vi.fn(() => null),
}));

import { PaymentPage } from './PaymentPage';
import { validatePaymentForm, getFieldError } from '../utils/validation';

function renderPayment() {
  return render(
    <MemoryRouter>
      <PaymentPage />
    </MemoryRouter>
  );
}

describe('PaymentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockUseAuth.mockReturnValue({ user: { email: 'test@example.com' }, loading: false });
    (validatePaymentForm as ReturnType<typeof vi.fn>).mockReturnValue({ success: true });
    (getFieldError as ReturnType<typeof vi.fn>).mockReturnValue(null);
  });

  describe('auth guard', () => {
    it('redirects to /login when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({ user: null, loading: false });
      render(
        <MemoryRouter initialEntries={['/payment?invoice=INV-001#checkout']}>
          <PaymentPage />
        </MemoryRouter>
      );

      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(mockNavigateComponent).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '/login',
          replace: true,
          state: expect.objectContaining({
            from: '/payment?invoice=INV-001#checkout',
            message: 'Please log in to make a payment.',
          }),
        })
      );
    });

    it('renders payment form for authenticated user', () => {
      renderPayment();
      expect(screen.getByText('Make a Payment')).toBeInTheDocument();
    });
  });

  describe('form fields', () => {
    it('renders Invoice Number input', () => {
      renderPayment();
      expect(screen.getByLabelText(/invoice number/i)).toBeInTheDocument();
    });

    it('renders Patient ID input', () => {
      renderPayment();
      expect(screen.getByLabelText(/patient id/i)).toBeInTheDocument();
    });

    it('renders Payment Amount input', () => {
      renderPayment();
      expect(screen.getByLabelText(/payment amount/i)).toBeInTheDocument();
    });

    it('renders Continue to Payment button', () => {
      renderPayment();
      expect(screen.getByText('Continue to Payment')).toBeInTheDocument();
    });

    it('renders subtitle text', () => {
      renderPayment();
      expect(screen.getByText('Enter your payment details below')).toBeInTheDocument();
    });
  });

  describe('form interaction', () => {
    it('fills in invoice number', () => {
      renderPayment();
      const input = screen.getByLabelText(/invoice number/i);
      fireEvent.change(input, { target: { value: 'INV-12345' } });
      expect(input).toHaveValue('INV-12345');
    });

    it('fills in patient id', () => {
      renderPayment();
      const input = screen.getByLabelText(/patient id/i);
      fireEvent.change(input, { target: { value: 'PAT-12345' } });
      expect(input).toHaveValue('PAT-12345');
    });

    it('fills in amount', () => {
      renderPayment();
      const input = screen.getByLabelText(/payment amount/i);
      fireEvent.change(input, { target: { value: '100.00' } });
      expect(input).toHaveValue(100);
    });
  });

  describe('form submission', () => {
    it('stores payment data in sessionStorage and navigates to /checkout', async () => {
      renderPayment();
      fireEvent.change(screen.getByLabelText(/payment amount/i), { target: { value: '50.00' } });
      fireEvent.change(screen.getByLabelText(/invoice number/i), { target: { value: 'INV-100' } });
      fireEvent.click(screen.getByText('Continue to Payment'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/checkout', { state: { hasPayment: true } });
      });

      const stored = sessionStorage.getItem('paymentInfo');
      expect(stored).toBeTruthy();
      const decoded = JSON.parse(atob(stored!));
      expect(decoded.amount).toBe(5000);
      expect(decoded.invoiceId).toBe('INV-100');
    });

    it('shows toast on submit', async () => {
      renderPayment();
      fireEvent.change(screen.getByLabelText(/payment amount/i), { target: { value: '10.00' } });
      fireEvent.click(screen.getByText('Continue to Payment'));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Proceeding to checkout...', 'info');
      });
    });

    it('does not submit if validation fails', async () => {
      (validatePaymentForm as ReturnType<typeof vi.fn>).mockReturnValue({
        success: false,
        errors: [{ field: 'amount', message: 'Amount is required' }],
      });
      renderPayment();
      fireEvent.change(screen.getByLabelText(/payment amount/i), { target: { value: '10.00' } });
      fireEvent.click(screen.getByText('Continue to Payment'));

      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });
  });

  describe('accepted payment methods', () => {
    it('shows Accepted Payment Methods section', () => {
      renderPayment();
      expect(screen.getByText('Accepted Payment Methods')).toBeInTheDocument();
    });
  });
});
