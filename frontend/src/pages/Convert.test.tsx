import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../components/Spinner', () => ({
  Spinner: ({ size }: { size?: number }) => <span data-testid="spinner">Loading {size}</span>,
}));

import { Convert } from './Convert';

describe('Convert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch to return fallback-triggering error so prices come from fallback
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('mock')) as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderComponent() {
    return render(<Convert />);
  }

  describe('rendering', () => {
    it('shows the page title', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Convert')).toBeInTheDocument();
      });
    });

    it('shows subtitle', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText(/Swap between cryptocurrencies/)).toBeInTheDocument();
      });
    });

    it('shows You send label', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('You send')).toBeInTheDocument();
      });
    });

    it('shows You receive label', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('You receive')).toBeInTheDocument();
      });
    });

    it('shows swap button', () => {
      renderComponent();
      expect(screen.getByTitle('Swap direction')).toBeInTheDocument();
    });

    it('shows Preview Swap button', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Preview Swap')).toBeInTheDocument();
      });
    });

    it('shows disclaimer text', () => {
      renderComponent();
      expect(screen.getByText(/Rates update every 30 seconds/)).toBeInTheDocument();
    });

    it('shows token selectors', async () => {
      renderComponent();
      await waitFor(() => {
        const selects = screen.getAllByRole('combobox');
        expect(selects.length).toBe(2);
      });
    });
  });

  describe('price loading', () => {
    it('shows rate info after prices load', async () => {
      renderComponent();
      await waitFor(() => {
        // Fallback prices load after fetch fails
        expect(screen.getByText(/1 ETH/)).toBeInTheDocument();
      });
    });
  });

  describe('amount entry', () => {
    it('shows amount input', () => {
      renderComponent();
      expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
    });

    it('calculates received amount on input', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText(/1 ETH/)).toBeInTheDocument());
      fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '1' } });
      // With fallback: ETH=$3200, USDC=$1 → 1 ETH = 3200 USDC
      await waitFor(() => {
        expect(screen.getByText('3200.000000')).toBeInTheDocument();
      });
    });

    it('shows USD value', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText(/1 ETH/)).toBeInTheDocument());
      fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '1' } });
      await waitFor(() => {
        expect(screen.getAllByText(/\$3,200/).length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('swap direction', () => {
    it('swaps tokens on click', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText(/1 ETH/)).toBeInTheDocument());
      fireEvent.click(screen.getByTitle('Swap direction'));
      await waitFor(() => {
        expect(screen.getByText(/1 USDC/)).toBeInTheDocument();
      });
    });
  });

  describe('validation', () => {
    it('does not allow same from/to token (tokens filtered in dropdowns)', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText(/1 ETH/)).toBeInTheDocument());
      // The dropdowns filter out the opposite token, preventing same-token selection
      const selects = screen.getAllByRole('combobox');
      const fromOptions = Array.from((selects[0] as HTMLSelectElement).options).map((o) => o.value);
      expect(fromOptions).not.toContain('USDC'); // USDC is the toToken, so filtered from "from" list... actually ETH is default from, USDC is default to
      // toToken dropdown filters out fromToken
      const toOptions = Array.from((selects[1] as HTMLSelectElement).options).map((o) => o.value);
      expect(toOptions).not.toContain('ETH');
    });

    it('shows error for empty amount on submit', async () => {
      const { container } = renderComponent();
      await waitFor(() => expect(screen.getByText(/1 ETH/)).toBeInTheDocument());
      fireEvent.submit(container.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText('Enter a valid amount')).toBeInTheDocument();
      });
    });
  });

  describe('confirm step', () => {
    it('shows confirm details on preview', async () => {
      const { container } = renderComponent();
      await waitFor(() => expect(screen.getByText(/1 ETH/)).toBeInTheDocument());
      fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '2' } });
      fireEvent.submit(container.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText('Confirm Conversion')).toBeInTheDocument();
      });
    });

    it('shows edit button in confirm', async () => {
      const { container } = renderComponent();
      await waitFor(() => expect(screen.getByText(/1 ETH/)).toBeInTheDocument());
      fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '2' } });
      fireEvent.submit(container.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument();
      });
    });

    it('shows Confirm Swap button', async () => {
      const { container } = renderComponent();
      await waitFor(() => expect(screen.getByText(/1 ETH/)).toBeInTheDocument());
      fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '2' } });
      fireEvent.submit(container.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText('Confirm Swap')).toBeInTheDocument();
      });
    });

    it('goes back on edit click', async () => {
      const { container } = renderComponent();
      await waitFor(() => expect(screen.getByText(/1 ETH/)).toBeInTheDocument());
      fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '2' } });
      fireEvent.submit(container.querySelector('form')!);
      await waitFor(() => expect(screen.getByText('Edit')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Edit'));
      expect(screen.getByText('Preview Swap')).toBeInTheDocument();
    });
  });

  describe('success', () => {
    it('shows success screen after conversion', async () => {
      const { container } = renderComponent();
      await waitFor(() => expect(screen.getByText(/1 ETH/)).toBeInTheDocument());
      fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '1' } });
      fireEvent.submit(container.querySelector('form')!);
      await waitFor(() => expect(screen.getByText('Confirm Swap')).toBeInTheDocument());
      fireEvent.submit(container.querySelector('form')!);
      await waitFor(
        () => {
          expect(screen.getByText('Conversion Complete')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it('shows convert more button', async () => {
      const { container } = renderComponent();
      await waitFor(() => expect(screen.getByText(/1 ETH/)).toBeInTheDocument());
      fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '1' } });
      fireEvent.submit(container.querySelector('form')!);
      await waitFor(() => expect(screen.getByText('Confirm Swap')).toBeInTheDocument());
      fireEvent.submit(container.querySelector('form')!);
      await waitFor(
        () => {
          expect(screen.getByText('Convert More')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });
  });
});
