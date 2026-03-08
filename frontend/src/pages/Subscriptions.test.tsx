import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Subscriptions } from './Subscriptions';

vi.mock('../styles.css', () => ({}));

function renderComponent() {
  return render(
    <MemoryRouter>
      <Subscriptions />
    </MemoryRouter>
  );
}

describe('Subscriptions', () => {
  describe('hero', () => {
    it('shows pricing tag', () => {
      renderComponent();
      expect(screen.getByText('Pricing')).toBeInTheDocument();
    });

    it('shows heading', () => {
      renderComponent();
      expect(screen.getByText('Simple, transparent pricing')).toBeInTheDocument();
    });

    it('shows subtitle', () => {
      renderComponent();
      expect(screen.getByText(/Start free. Upgrade as your practice grows/)).toBeInTheDocument();
    });

    it('shows monthly/annual toggle', () => {
      renderComponent();
      expect(screen.getByText('Monthly')).toBeInTheDocument();
      expect(screen.getByText(/Annual/)).toBeInTheDocument();
    });
  });

  describe('plans', () => {
    it('shows Patient Free plan', () => {
      renderComponent();
      expect(screen.getByText('Patient Free')).toBeInTheDocument();
    });

    it('shows Provider Pro plan', () => {
      renderComponent();
      expect(screen.getByText('Provider Pro')).toBeInTheDocument();
    });

    it('shows Enterprise plan', () => {
      renderComponent();
      expect(screen.getByText('Enterprise')).toBeInTheDocument();
    });

    it('shows Most Popular badge', () => {
      renderComponent();
      expect(screen.getByText('Most Popular')).toBeInTheDocument();
    });

    it('shows Free price', () => {
      renderComponent();
      expect(screen.getByText('Free')).toBeInTheDocument();
    });

    it('shows Custom price for Enterprise', () => {
      renderComponent();
      expect(screen.getByText('Custom')).toBeInTheDocument();
    });

    it('shows Pro price as $49', () => {
      renderComponent();
      expect(screen.getByText('$49')).toBeInTheDocument();
    });

    it('shows plan descriptions', () => {
      renderComponent();
      expect(screen.getByText(/Perfect for individual patients/)).toBeInTheDocument();
      expect(screen.getByText(/Everything a growing clinic needs/)).toBeInTheDocument();
    });

    it('shows CTA buttons', () => {
      renderComponent();
      expect(screen.getByText('Start Free')).toBeInTheDocument();
      expect(screen.getByText('Start 14-Day Trial')).toBeInTheDocument();
      expect(screen.getByText('Contact Sales')).toBeInTheDocument();
    });
  });

  describe('billing toggle', () => {
    it('switches to annual pricing', () => {
      renderComponent();
      screen.getByRole('button', { name: '' });
      // The toggle is the knob button with no text
      const toggleButtons = document.querySelectorAll('.sub-toggle__btn');
      expect(toggleButtons.length).toBeGreaterThanOrEqual(1);
      fireEvent.click(toggleButtons[0]);
      expect(screen.getByText('$39')).toBeInTheDocument();
    });

    it('shows savings text when annual', () => {
      renderComponent();
      const toggleButtons = document.querySelectorAll('.sub-toggle__btn');
      fireEvent.click(toggleButtons[0]);
      expect(screen.getByText(/Save \$120\/yr/)).toBeInTheDocument();
    });
  });

  describe('trust bar', () => {
    it('shows compliance badges', () => {
      renderComponent();
      expect(screen.getByText(/PCI DSS Level 1/)).toBeInTheDocument();
      expect(screen.getByText(/HIPAA Compliant/)).toBeInTheDocument();
      expect(screen.getByText(/Cancel anytime/)).toBeInTheDocument();
    });
  });

  describe('FAQ section', () => {
    it('shows FAQ heading', () => {
      renderComponent();
      expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
    });

    it('shows all FAQ questions', () => {
      renderComponent();
      expect(screen.getByText('Is there a free trial for Pro?')).toBeInTheDocument();
      expect(screen.getByText('Can I switch plans mid-cycle?')).toBeInTheDocument();
      expect(
        screen.getByText('What payment methods are accepted for subscriptions?')
      ).toBeInTheDocument();
      expect(screen.getByText('Is there a minimum contract for Enterprise?')).toBeInTheDocument();
    });

    it('expands FAQ answer on click', () => {
      renderComponent();
      const question = screen.getByText('Is there a free trial for Pro?');
      fireEvent.click(question);
      const openItems = document.querySelectorAll('.faq-item--open');
      expect(openItems.length).toBe(1);
    });

    it('collapses FAQ answer on second click', () => {
      renderComponent();
      const question = screen.getByText('Is there a free trial for Pro?');
      fireEvent.click(question);
      fireEvent.click(question);
      const openItems = document.querySelectorAll('.faq-item--open');
      expect(openItems.length).toBe(0);
    });

    it('toggles FAQ aria-expanded', () => {
      renderComponent();
      const questionBtn = screen.getByText('Is there a free trial for Pro?').closest('button')!;
      expect(questionBtn).toHaveAttribute('aria-expanded', 'false');
      fireEvent.click(questionBtn);
      expect(questionBtn).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('bottom CTA', () => {
    it('shows CTA heading', () => {
      renderComponent();
      expect(screen.getByText(/Not sure which plan fits your practice/)).toBeInTheDocument();
    });

    it('shows Talk to Sales button', () => {
      renderComponent();
      expect(screen.getByText('Talk to Sales')).toBeInTheDocument();
    });
  });
});
