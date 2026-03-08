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
      expect(
        screen.getByText(/Complete Platform for Modern Healthcare Finance/)
      ).toBeInTheDocument();
    });

    it('shows subtitle', () => {
      renderComponent();
      expect(screen.getByText(/One secure platform for healthcare payments/)).toBeInTheDocument();
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
      expect(screen.getByText(/MedBed Session/)).toBeInTheDocument();
    });
  });

  describe('stats section', () => {
    it('shows patient count', () => {
      renderComponent();
      expect(screen.getByText('12,000+')).toBeInTheDocument();
      expect(screen.getByText('Patients Served')).toBeInTheDocument();
    });

    it('shows provider count', () => {
      renderComponent();
      expect(screen.getByText('650+')).toBeInTheDocument();
      expect(screen.getByText('Healthcare Providers')).toBeInTheDocument();
    });

    it('shows uptime', () => {
      renderComponent();
      expect(screen.getByText('99.9%')).toBeInTheDocument();
      expect(screen.getByText('Uptime SLA')).toBeInTheDocument();
    });

    it('shows payment volume', () => {
      renderComponent();
      expect(screen.getByText('$2M+')).toBeInTheDocument();
      expect(screen.getByText('Payments Processed')).toBeInTheDocument();
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
      expect(screen.getByText('Everything your practice needs')).toBeInTheDocument();
    });

    it('shows feature cards', () => {
      renderComponent();
      expect(screen.getByText('MedBed Access')).toBeInTheDocument();
      expect(screen.getByText('Multi-Rail Payments')).toBeInTheDocument();
      expect(screen.getByText('Crypto Wallet')).toBeInTheDocument();
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
      expect(screen.getByText('Create Account')).toBeInTheDocument();
      expect(screen.getByText('Connect & Configure')).toBeInTheDocument();
      expect(screen.getByText('Start Transacting')).toBeInTheDocument();
    });
  });

  describe('testimonials', () => {
    it('shows section heading', () => {
      renderComponent();
      expect(screen.getByText('Loved by patients & providers')).toBeInTheDocument();
    });

    it('shows testimonial authors', () => {
      renderComponent();
      expect(screen.getByText('Dr. Sarah Chen')).toBeInTheDocument();
      expect(screen.getByText('Marcus Williams')).toBeInTheDocument();
      expect(screen.getByText('Priya Nair')).toBeInTheDocument();
    });
  });

  describe('pricing section', () => {
    it('shows pricing heading', () => {
      renderComponent();
      expect(screen.getAllByText('Simple, transparent pricing').length).toBeGreaterThanOrEqual(1);
    });

    it('shows plan names', () => {
      renderComponent();
      expect(screen.getByText('Patient')).toBeInTheDocument();
      expect(screen.getByText('Provider')).toBeInTheDocument();
      expect(screen.getByText('Enterprise')).toBeInTheDocument();
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
      expect(screen.getByText('HIPAA Compliant')).toBeInTheDocument();
      expect(screen.getByText('PCI DSS Level 1')).toBeInTheDocument();
      expect(screen.getByText('SOC 2 Type II')).toBeInTheDocument();
    });
  });

  describe('final CTA', () => {
    it('shows CTA heading', () => {
      renderComponent();
      expect(screen.getByText(/Ready to modernise your healthcare payments/)).toBeInTheDocument();
    });

    it('shows CTA buttons', () => {
      renderComponent();
      expect(screen.getAllByText('Create Free Account').length).toBeGreaterThanOrEqual(1);
    });

    it('shows partner names', () => {
      renderComponent();
      expect(screen.getByText(/Quantum Health/)).toBeInTheDocument();
    });
  });
});
