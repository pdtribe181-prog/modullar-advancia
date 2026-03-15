import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../styles.css', () => ({}));
vi.mock('../components/LiveChartBanner', () => ({
  LiveChartBanner: () => <div data-testid="live-chart-banner">LiveChartBanner</div>,
}));

import { LandingPage } from './LandingPage';

function renderComponent() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>
  );
}

describe('LandingPage', () => {
  describe('hero section', () => {
    it('shows eyebrow text', () => {
      renderComponent();
      expect(screen.getByText(/Healthcare Payments.*Reimagined/)).toBeInTheDocument();
    });

    it('shows main heading', () => {
      renderComponent();
      // Text is split across <br/> and <span>, so query the h1 element directly
      const h1 = document.querySelector('.lp-hero-title')!;
      expect(h1.textContent).toMatch(/operating layer for/i);
      expect(h1.textContent).toMatch(/MedBeds, checkout, and payments/);
    });

    it('shows subtitle', () => {
      renderComponent();
      expect(
        screen.getByText(/One secure platform for MedBed booking, secure checkout/i)
      ).toBeInTheDocument();
    });

    it('shows CTA buttons', () => {
      renderComponent();
      expect(screen.getByText(/Get Started Free/)).toBeInTheDocument();
      expect(screen.getByText('See How It Works')).toBeInTheDocument();
    });

    it('shows no credit card note', () => {
      renderComponent();
      expect(screen.getByText(/No credit card required/)).toBeInTheDocument();
    });

    it('shows hero card decoration', () => {
      renderComponent();
      expect(screen.getByText('+$1,240.00')).toBeInTheDocument();
      expect(screen.getByText(/MedBed checkout confirmed/)).toBeInTheDocument();
    });
  });

  describe('stats section', () => {
    it('shows first stat', () => {
      renderComponent();
      expect(screen.getByText('MedBed-ready')).toBeInTheDocument();
      expect(screen.getByText('Booking, billing, and follow-up in one flow')).toBeInTheDocument();
    });

    it('shows second stat', () => {
      renderComponent();
      expect(screen.getByText('Checkout-first')).toBeInTheDocument();
      expect(screen.getByText('Cards, bank transfers, and wallet flows')).toBeInTheDocument();
    });

    it('shows role-based stat', () => {
      renderComponent();
      expect(screen.getByText('Role-based')).toBeInTheDocument();
      expect(screen.getByText('Patient, provider, and admin experiences')).toBeInTheDocument();
    });

    it('shows always-on stat', () => {
      renderComponent();
      expect(screen.getByText('24/7')).toBeInTheDocument();
      expect(
        screen.getByText('Always-on account access, booking, and billing')
      ).toBeInTheDocument();
    });
  });

  describe('live chart banner', () => {
    it('renders LiveChartBanner component', () => {
      renderComponent();
      expect(screen.getByTestId('live-chart-banner')).toBeInTheDocument();
    });
  });

  describe('features section', () => {
    it('shows section heading', () => {
      renderComponent();
      expect(
        screen.getByText('Everything your practice needs to book and get paid')
      ).toBeInTheDocument();
    });

    it('shows feature cards', () => {
      renderComponent();
      expect(screen.getByRole('heading', { name: /MedBed booking/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Multi-Rail Payments/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Customer wallet/i })).toBeInTheDocument();
    });

    it('shows View All Features link', () => {
      renderComponent();
      expect(screen.getByText('View All Features')).toBeInTheDocument();
    });
  });

  describe('how it works', () => {
    it('shows section heading', () => {
      renderComponent();
      expect(screen.getByText('Up and running in minutes')).toBeInTheDocument();
    });

    it('shows three steps', () => {
      renderComponent();
      expect(screen.getByText('Create your workspace')).toBeInTheDocument();
      expect(screen.getByText('Connect payments and policies')).toBeInTheDocument();
      expect(screen.getByText('Run bookings and checkout')).toBeInTheDocument();
    });
  });

  describe('outcomes', () => {
    it('shows section heading', () => {
      renderComponent();
      expect(screen.getByText('What teams actually improve')).toBeInTheDocument();
    });

    it('shows outcome cards', () => {
      renderComponent();
      expect(screen.getByText('Faster collections')).toBeInTheDocument();
      expect(screen.getByText('Cleaner handoffs')).toBeInTheDocument();
      expect(screen.getByText('Better visibility')).toBeInTheDocument();
    });
  });

  describe('pricing section', () => {
    it('shows pricing heading', () => {
      renderComponent();
      expect(screen.getAllByText('Simple, transparent pricing').length).toBeGreaterThanOrEqual(1);
    });

    it('shows plan names', () => {
      renderComponent();
      expect(screen.getAllByText('Patient').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Provider').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Enterprise').length).toBeGreaterThanOrEqual(1);
    });

    it('shows Most Popular badge', () => {
      renderComponent();
      expect(screen.getByText('Most Popular')).toBeInTheDocument();
    });
  });

  describe('security section', () => {
    it('shows section heading', () => {
      renderComponent();
      expect(screen.getByText('Built for regulated industries')).toBeInTheDocument();
    });

    it('shows compliance badges', () => {
      renderComponent();
      expect(screen.getByText('Role-based access')).toBeInTheDocument();
      expect(screen.getByText('PCI DSS Level 1')).toBeInTheDocument();
      expect(screen.getByText('SOC 2 Type II')).toBeInTheDocument();
    });
  });

  describe('final CTA', () => {
    it('shows CTA heading', () => {
      renderComponent();
      // Text is split across <br/> and <span>, so query the heading element directly
      const heading = Array.from(document.querySelectorAll('h2')).find((el) =>
        el.textContent?.includes('Ready to modernise')
      );
      expect(heading).toBeTruthy();
      expect(heading!.textContent).toMatch(/MedBed and checkout operations/);
    });

    it('shows CTA buttons', () => {
      renderComponent();
      expect(screen.getAllByText('Create Free Account').length).toBeGreaterThanOrEqual(1);
    });

    it('shows partner names', () => {
      renderComponent();
      expect(screen.getAllByText(/Provider teams/).length).toBeGreaterThanOrEqual(1);
    });
  });
});
