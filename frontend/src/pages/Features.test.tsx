import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Features } from './Features';

vi.mock('../styles.css', () => ({}));

function renderComponent() {
  return render(
    <MemoryRouter>
      <Features />
    </MemoryRouter>
  );
}

describe('Features', () => {
  describe('hero section', () => {
    it('shows tag', () => {
      renderComponent();
      expect(screen.getByText('Platform Features')).toBeInTheDocument();
    });

    it('shows heading', () => {
      renderComponent();
      expect(screen.getByText('Built for modern healthcare finance')).toBeInTheDocument();
    });

    it('shows subtitle', () => {
      renderComponent();
      expect(screen.getByText(/Every tool your clinic needs/)).toBeInTheDocument();
    });

    it('shows CTA buttons', () => {
      renderComponent();
      expect(screen.getByText('Get Started Free')).toBeInTheDocument();
      expect(screen.getByText('View Pricing')).toBeInTheDocument();
    });
  });

  describe('category filter', () => {
    it('shows All category as default active', () => {
      renderComponent();
      const allBtn = screen.getByText('All').closest('button')!;
      expect(allBtn.className).toContain('faq-tab--active');
    });

    it('shows all category buttons', () => {
      renderComponent();
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getAllByText('Payments').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('MedBed').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Security').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Analytics').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Integrations').length).toBeGreaterThanOrEqual(1);
    });

    it('filters by category on click', () => {
      renderComponent();
      const allCards = document.querySelectorAll('.feat-card');
      const totalCards = allCards.length;

      // Click the Payments category button (not the card badge)
      const paymentsBtn = screen
        .getAllByText('Payments')
        .find((el) => el.closest('button.faq-tab'))!;
      fireEvent.click(paymentsBtn);
      const filteredCards = document.querySelectorAll('.feat-card');
      expect(filteredCards.length).toBeLessThan(totalCards);
      expect(filteredCards.length).toBeGreaterThan(0);
    });

    it('shows all features when All is clicked', () => {
      renderComponent();
      const paymentsBtn = screen
        .getAllByText('Payments')
        .find((el) => el.closest('button.faq-tab'))!;
      fireEvent.click(paymentsBtn);
      fireEvent.click(screen.getByText('All'));
      const allCards = document.querySelectorAll('.feat-card');
      expect(allCards.length).toBe(12);
    });

    it('sets active class on selected category', () => {
      renderComponent();
      const securityBtn = screen
        .getAllByText('Security')
        .find((el) => el.closest('button.faq-tab'))!;
      fireEvent.click(securityBtn);
      const btn = securityBtn.closest('button')!;
      expect(btn.className).toContain('faq-tab--active');
    });
  });

  describe('feature cards', () => {
    it('shows all 12 features by default', () => {
      renderComponent();
      const cards = document.querySelectorAll('.feat-card');
      expect(cards.length).toBe(12);
    });

    it('shows key feature titles', () => {
      renderComponent();
      expect(screen.getByText('Quantum MedBeds')).toBeInTheDocument();
      expect(screen.getByText('Stripe Payments')).toBeInTheDocument();
      expect(screen.getByText('Crypto Wallet')).toBeInTheDocument();
      expect(screen.getByText('HIPAA Compliance')).toBeInTheDocument();
    });

    it('shows feature descriptions', () => {
      renderComponent();
      expect(screen.getByText(/Book Standard, Quantum, and Premium MedBed/)).toBeInTheDocument();
    });

    it('shows bulleted feature details', () => {
      renderComponent();
      const bullets = document.querySelectorAll('.feat-card__bullets li');
      expect(bullets.length).toBeGreaterThan(0);
    });
  });

  describe('comparison table', () => {
    it('shows section heading', () => {
      renderComponent();
      expect(screen.getByText("See what's included")).toBeInTheDocument();
    });

    it('shows plan columns', () => {
      renderComponent();
      // Column headers in the table
      expect(screen.getByText('Feature')).toBeInTheDocument();
    });

    it('shows comparison rows', () => {
      renderComponent();
      expect(screen.getByText('MedBed booking')).toBeInTheDocument();
      expect(screen.getByText('Card payments')).toBeInTheDocument();
    });

    it('shows check marks for included features', () => {
      renderComponent();
      const checks = document.querySelectorAll('.feat-table tbody td');
      expect(checks.length).toBeGreaterThan(0);
    });
  });

  describe('bottom CTA', () => {
    it('shows CTA heading', () => {
      renderComponent();
      expect(screen.getByText(/Ready to transform your practice/)).toBeInTheDocument();
    });

    it('shows Create Free Account button', () => {
      renderComponent();
      expect(screen.getByText('Create Free Account')).toBeInTheDocument();
    });
  });
});
