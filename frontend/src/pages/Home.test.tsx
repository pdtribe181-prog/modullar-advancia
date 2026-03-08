import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Home } from './Home';

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
}

describe('Home', () => {
  describe('hero section', () => {
    it('renders main heading', () => {
      renderHome();
      expect(screen.getByText('The Future of')).toBeInTheDocument();
      expect(screen.getByText('Healthcare Payments')).toBeInTheDocument();
    });

    it('renders tagline', () => {
      renderHome();
      expect(screen.getByText(/Web3 Healthcare Payments/)).toBeInTheDocument();
    });

    it('renders description text', () => {
      renderHome();
      expect(screen.getByText(/Secure, decentralized payment platform/)).toBeInTheDocument();
    });

    it('renders Launch App link to /login', () => {
      renderHome();
      const link = screen.getByText(/Launch App/);
      expect(link.closest('a')).toHaveAttribute('href', '/login');
    });

    it('renders Quick Pay link to /payment', () => {
      renderHome();
      const link = screen.getByText(/Quick Pay/);
      expect(link.closest('a')).toHaveAttribute('href', '/payment');
    });
  });

  describe('stats section', () => {
    it.each(['Crypto', 'HIPAA', '24/7', 'Secure'])('renders stat item %s', (stat) => {
      renderHome();
      expect(screen.getByText(stat)).toBeInTheDocument();
    });
  });

  describe('features section', () => {
    it('renders Why Choose Advancia heading', () => {
      renderHome();
      expect(screen.getByText('Why Choose Advancia?')).toBeInTheDocument();
    });

    it.each([
      'Bank-Level Security',
      'Crypto Native',
      'Instant Settlement',
      'MedBed Booking',
      'Mobile Ready',
    ])('renders feature card: %s', (title) => {
      renderHome();
      expect(screen.getByText(title)).toBeInTheDocument();
    });
  });

  describe('how it works section', () => {
    it('renders How It Works heading', () => {
      renderHome();
      expect(screen.getByText('How It Works')).toBeInTheDocument();
    });

    it.each([
      ['Create Account', 'Sign up with email or connect your Web3 wallet'],
      ['Add Funds', 'Deposit USD, ETH, SOL'],
      ['Book & Pay', 'Schedule MedBed sessions'],
      ['Track Everything', 'View transaction history'],
    ])('renders step: %s', (title, desc) => {
      renderHome();
      expect(screen.getByText(title)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(desc))).toBeInTheDocument();
    });
  });

  describe('CTA section', () => {
    it('renders Ready to Get Started heading', () => {
      renderHome();
      expect(screen.getByText('Ready to Get Started?')).toBeInTheDocument();
    });

    it('renders Create Free Account link', () => {
      renderHome();
      const link = screen.getByText(/Create Free Account/);
      expect(link.closest('a')).toHaveAttribute('href', '/login');
    });
  });
});
