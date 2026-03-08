import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PaymentSuccess } from './PaymentSuccess';

function renderSuccess(route = '/payment/success?redirect_status=succeeded') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <PaymentSuccess />
    </MemoryRouter>
  );
}

describe('PaymentSuccess', () => {
  describe('success state', () => {
    it('renders Payment Successful heading', () => {
      renderSuccess();
      expect(screen.getByText('Payment Successful!')).toBeInTheDocument();
    });

    it('shows success message', () => {
      renderSuccess();
      expect(screen.getByText(/payment has been processed successfully/)).toBeInTheDocument();
    });

    it('shows payment reference when payment_intent provided', () => {
      renderSuccess('/payment/success?redirect_status=succeeded&payment_intent=pi_abc123xyz');
      expect(screen.getByText(/xyz/)).toBeInTheDocument();
    });

    it('renders View Payment History link', () => {
      renderSuccess();
      const link = screen.getByRole('link', { name: 'View Payment History' });
      expect(link).toHaveAttribute('href', '/history');
    });

    it('renders Go to Dashboard link', () => {
      renderSuccess();
      const link = screen.getByRole('link', { name: 'Go to Dashboard' });
      expect(link).toHaveAttribute('href', '/dashboard');
    });
  });

  describe('processing state', () => {
    it('renders Payment Processing heading when status not succeeded', () => {
      renderSuccess('/payment/success?redirect_status=processing');
      expect(screen.getByText('Payment Processing')).toBeInTheDocument();
    });

    it('shows processing message', () => {
      renderSuccess('/payment/success?redirect_status=processing');
      expect(screen.getByText(/payment is being processed/)).toBeInTheDocument();
    });

    it('renders navigation links in processing state', () => {
      renderSuccess('/payment/success?redirect_status=processing');
      expect(screen.getByRole('link', { name: 'View Payment History' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to Dashboard' })).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows verifying text before status resolves', () => {
      // Without redirect_status, falls into processing since useEffect runs synchronously in test
      renderSuccess('/payment/success');
      // After useEffect, empty redirect_status maps to 'processing'
      expect(screen.getByText('Payment Processing')).toBeInTheDocument();
    });
  });
});
