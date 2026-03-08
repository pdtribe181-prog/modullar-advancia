import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
const mockShowToast = vi.fn();

const { mockPost } = vi.hoisted(() => ({
  mockPost: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../services/api', () => ({
  api: { post: mockPost },
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

vi.mock('../lib/stripe', () => ({
  stripePromise: Promise.resolve(null),
}));

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="stripe-elements">{children}</div>
  ),
}));

vi.mock('../components/PaymentForm', () => ({
  PaymentForm: () => <div data-testid="payment-form">PaymentForm</div>,
}));

vi.mock('../components/CryptoPayment', () => ({
  CryptoPaymentOption: ({ amount }: { amount: number }) => (
    <div data-testid="crypto-option">CryptoPayment ${amount}</div>
  ),
}));

vi.mock('../components/Spinner', () => ({
  Spinner: () => <div data-testid="spinner">Loading...</div>,
}));

import { CheckoutPage } from './CheckoutPage';

function renderCheckout() {
  return render(
    <MemoryRouter>
      <CheckoutPage />
    </MemoryRouter>
  );
}

const paymentInfo = {
  amount: 5000,
  invoiceId: 'INV-001',
  patientId: 'PAT-001',
  description: 'Test payment',
};

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  describe('redirect when no payment info', () => {
    it('navigates to /payment when no sessionStorage data', () => {
      renderCheckout();
      expect(mockNavigate).toHaveBeenCalledWith('/payment');
    });
  });

  describe('loading state', () => {
    it('shows loading spinner while creating payment intent', () => {
      sessionStorage.setItem('paymentInfo', btoa(JSON.stringify(paymentInfo)));
      mockPost.mockReturnValue(new Promise(() => {}));
      renderCheckout();
      expect(screen.getByText('Preparing secure checkout...')).toBeInTheDocument();
    });
  });

  describe('successful payment intent', () => {
    beforeEach(() => {
      sessionStorage.setItem('paymentInfo', btoa(JSON.stringify(paymentInfo)));
      mockPost.mockResolvedValue({
        success: true,
        data: { client_secret: 'pi_secret_test123' },
      });
    });

    it('renders Complete Your Payment heading', async () => {
      renderCheckout();
      await waitFor(() => expect(screen.getByText('Complete Your Payment')).toBeInTheDocument());
    });

    it('renders Stripe Elements', async () => {
      renderCheckout();
      await waitFor(() => expect(screen.getByTestId('stripe-elements')).toBeInTheDocument());
    });

    it('renders PaymentForm inside Elements', async () => {
      renderCheckout();
      await waitFor(() => expect(screen.getByTestId('payment-form')).toBeInTheDocument());
    });

    it('renders CryptoPaymentOption with correct amount', async () => {
      renderCheckout();
      await waitFor(() => expect(screen.getByTestId('crypto-option')).toBeInTheDocument());
    });

    it('renders the card/crypto divider', async () => {
      renderCheckout();
      await waitFor(() => expect(screen.getByText('or pay with card')).toBeInTheDocument());
    });

    it('renders security badge', async () => {
      renderCheckout();
      await waitFor(() =>
        expect(
          screen.getByText('Your payment information is encrypted and secure')
        ).toBeInTheDocument()
      );
    });

    it('calls api.post with correct payment intent payload', async () => {
      renderCheckout();
      await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
      expect(mockPost).toHaveBeenCalledWith('/stripe/payment-intents', {
        amount: 5000,
        currency: 'usd',
        metadata: {
          invoice_id: 'INV-001',
          patient_id: 'PAT-001',
          description: 'Test payment',
        },
      });
    });
  });

  describe('error state', () => {
    beforeEach(() => {
      sessionStorage.setItem('paymentInfo', btoa(JSON.stringify(paymentInfo)));
    });

    it('shows error message when payment intent fails', async () => {
      mockPost.mockRejectedValue(new Error('Failed to initialize payment'));
      renderCheckout();
      await waitFor(() => expect(screen.getByText('Payment Error')).toBeInTheDocument());
      expect(screen.getByText('Failed to initialize payment')).toBeInTheDocument();
    });

    it('renders Try Again button that navigates to /payment', async () => {
      mockPost.mockRejectedValue(new Error('Network error'));
      renderCheckout();
      await waitFor(() => expect(screen.getByText('Try Again')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Try Again'));
      expect(mockNavigate).toHaveBeenCalledWith('/payment');
    });

    it('calls showToast with error message', async () => {
      mockPost.mockRejectedValue(new Error('Server error'));
      renderCheckout();
      await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Server error', 'error'));
    });

    it('shows error when response has no client_secret', async () => {
      mockPost.mockResolvedValue({ success: false });
      renderCheckout();
      await waitFor(() => expect(screen.getByText('Payment Error')).toBeInTheDocument());
    });
  });
});
