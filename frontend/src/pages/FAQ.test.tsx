import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FAQ } from './FAQ';

function renderFAQ() {
  return render(
    <MemoryRouter>
      <FAQ />
    </MemoryRouter>
  );
}

describe('FAQ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hero section', () => {
    it('renders main heading', () => {
      renderFAQ();
      expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
    });

    it('renders Support tag', () => {
      renderFAQ();
      expect(screen.getByText('Support')).toBeInTheDocument();
    });

    it('renders search input', () => {
      renderFAQ();
      expect(screen.getByPlaceholderText('Search questions…')).toBeInTheDocument();
    });
  });

  describe('category tabs', () => {
    it('renders All tab', () => {
      renderFAQ();
      expect(screen.getByRole('tab', { name: /All/ })).toBeInTheDocument();
    });

    it('renders Payments tab', () => {
      renderFAQ();
      expect(screen.getByRole('tab', { name: /Payments/ })).toBeInTheDocument();
    });

    it('renders MedBed & Appointments tab', () => {
      renderFAQ();
      expect(screen.getByRole('tab', { name: /MedBed & Appointments/ })).toBeInTheDocument();
    });

    it('renders Crypto Wallet tab', () => {
      renderFAQ();
      expect(screen.getByRole('tab', { name: /Crypto Wallet/ })).toBeInTheDocument();
    });

    it('renders Security & Privacy tab', () => {
      renderFAQ();
      expect(screen.getByRole('tab', { name: /Security & Privacy/ })).toBeInTheDocument();
    });

    it('renders Account & Billing tab', () => {
      renderFAQ();
      expect(screen.getByRole('tab', { name: /Account & Billing/ })).toBeInTheDocument();
    });

    it('marks All tab as selected by default', () => {
      renderFAQ();
      expect(screen.getByRole('tab', { name: /All/ })).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('FAQ items', () => {
    it('renders FAQ questions', () => {
      renderFAQ();
      expect(screen.getByText('What payment methods are accepted?')).toBeInTheDocument();
      expect(screen.getByText('How do refunds work?')).toBeInTheDocument();
    });

    it('renders result count', () => {
      renderFAQ();
      expect(screen.getByText(/19 results/)).toBeInTheDocument();
    });
  });

  describe('accordion expand/collapse', () => {
    it('expands a question on click', () => {
      renderFAQ();
      const question = screen.getByText('What payment methods are accepted?');
      fireEvent.click(question);
      expect(screen.getByText(/Visa, Mastercard, American Express/)).toBeInTheDocument();
    });

    it('collapses an expanded question on second click', () => {
      renderFAQ();
      const question = screen.getByText('What payment methods are accepted?');
      fireEvent.click(question);
      // Answer visible
      expect(screen.getByText(/Visa, Mastercard, American Express/)).toBeInTheDocument();
      fireEvent.click(question);
      // The answer div gets the closed class but is still in DOM — check aria-expanded
      const btn = question.closest('button');
      expect(btn).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('category filtering', () => {
    it('filters to Payments category', () => {
      renderFAQ();
      fireEvent.click(screen.getByRole('tab', { name: /^Payments/ }));
      expect(screen.getByText('What payment methods are accepted?')).toBeInTheDocument();
      expect(screen.queryByText('How do I book a MedBed session?')).not.toBeInTheDocument();
    });

    it('filters to MedBed & Appointments', () => {
      renderFAQ();
      fireEvent.click(screen.getByRole('tab', { name: /MedBed & Appointments/ }));
      expect(screen.getByText('How do I book a MedBed session?')).toBeInTheDocument();
      expect(screen.queryByText('What payment methods are accepted?')).not.toBeInTheDocument();
    });

    it('updates result count for filtered category', () => {
      renderFAQ();
      fireEvent.click(screen.getByRole('tab', { name: /Crypto Wallet/ }));
      expect(screen.getByText(/3 results/)).toBeInTheDocument();
    });
  });

  describe('search filtering', () => {
    it('filters FAQs by search query', () => {
      renderFAQ();
      fireEvent.change(screen.getByPlaceholderText('Search questions…'), {
        target: { value: 'refund' },
      });
      expect(screen.getByText('How do refunds work?')).toBeInTheDocument();
      expect(screen.queryByText('What payment methods are accepted?')).not.toBeInTheDocument();
    });

    it('shows empty state when no results match', () => {
      renderFAQ();
      fireEvent.change(screen.getByPlaceholderText('Search questions…'), {
        target: { value: 'xyznonexistent' },
      });
      expect(screen.getByText(/No results for/)).toBeInTheDocument();
    });

    it('shows clear button when query is entered', () => {
      renderFAQ();
      fireEvent.change(screen.getByPlaceholderText('Search questions…'), {
        target: { value: 'test' },
      });
      expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
    });

    it('clears search query with Clear filters button', () => {
      renderFAQ();
      fireEvent.change(screen.getByPlaceholderText('Search questions…'), {
        target: { value: 'xyznonexistent' },
      });
      fireEvent.click(screen.getByText('Clear filters'));
      // All results should show after clearing
      expect(screen.getByText(/19 results/)).toBeInTheDocument();
    });
  });

  describe('contact CTA', () => {
    it('renders Still have questions section', () => {
      renderFAQ();
      expect(screen.getByText('Still have questions?')).toBeInTheDocument();
    });

    it('renders Email Support link', () => {
      renderFAQ();
      expect(screen.getByText('Email Support')).toBeInTheDocument();
    });

    it('renders Sign Up Free link', () => {
      renderFAQ();
      const link = screen.getByText('Sign Up Free');
      expect(link.closest('a')).toHaveAttribute('href', '/signup');
    });
  });
});
