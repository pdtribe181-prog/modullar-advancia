import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockGet = vi.hoisted(() => vi.fn());

vi.mock('../services/api', () => ({
  api: { get: mockGet },
}));

import { Invoices } from './Invoices';

const mockInvoiceList = [
  {
    id: 'inv-1',
    invoice_number: 'INV-2026-001',
    issue_date: '2026-01-15',
    due_date: '2026-02-15',
    status: 'paid',
    subtotal: 500,
    tax_amount: 50,
    total_amount: 550,
    provider: {
      practice_name: 'City Clinic',
      address: '123 Main St',
      phone: '555-0100',
      email: 'billing@city.com',
    },
    patient: { first_name: 'John', last_name: 'Doe', email: 'john@email.com' },
    items: [{ description: 'Consultation', quantity: 1, unit_price: 500, amount: 500 }],
    transaction: { payment_method: 'card', stripe_payment_intent_id: 'pi_test123' },
    notes: 'Thank you for payment',
  },
  {
    id: 'inv-2',
    invoice_number: 'INV-2026-002',
    issue_date: '2026-02-01',
    due_date: '2026-03-01',
    status: 'pending',
    subtotal: 200,
    tax_amount: 20,
    total_amount: 220,
    provider: {
      practice_name: 'Metro Health',
      address: '456 Oak Ave',
      phone: '555-0200',
      email: 'bill@metro.com',
    },
    patient: { first_name: 'Jane', last_name: 'Smith', email: 'jane@email.com' },
    items: [{ description: 'Lab Work', quantity: 2, unit_price: 100, amount: 200 }],
    transaction: null,
    notes: null,
  },
];

function renderComponent(route = '/invoices') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Invoices />
    </MemoryRouter>
  );
}

describe('Invoices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((url: string) => {
      if (url.startsWith('/invoices/')) {
        const id = url.split('/')[2];
        const found = mockInvoiceList.find((i) => i.id === id);
        return Promise.resolve({ success: true, data: found || null });
      }
      if (url === '/invoices') {
        return Promise.resolve({ success: true, data: mockInvoiceList });
      }
      return Promise.resolve({ success: false });
    });
  });

  describe('loading state', () => {
    it('shows loading text initially', () => {
      mockGet.mockReturnValue(new Promise(() => {}));
      renderComponent();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message on API failure', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      mockGet.mockRejectedValue(new Error('Fail'));
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });
  });

  describe('invoice list view', () => {
    it('renders the list page title', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Invoices & Receipts')).toBeInTheDocument();
      });
    });

    it('shows invoice numbers', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('INV-2026-001')).toBeInTheDocument();
        expect(screen.getByText('INV-2026-002')).toBeInTheDocument();
      });
    });

    it('shows provider names', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('City Clinic')).toBeInTheDocument();
        expect(screen.getByText('Metro Health')).toBeInTheDocument();
      });
    });

    it('shows status badges', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('paid')).toBeInTheDocument();
        expect(screen.getByText('pending')).toBeInTheDocument();
      });
    });

    it('shows total amounts', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('$550.00')).toBeInTheDocument();
        expect(screen.getByText('$220.00')).toBeInTheDocument();
      });
    });

    it('renders invoice links', async () => {
      renderComponent();
      await waitFor(() => {
        const links = screen.getAllByRole('link');
        expect(links.some((l) => l.getAttribute('href') === '/invoices?id=inv-1')).toBe(true);
      });
    });

    it('shows empty state when no invoices', async () => {
      mockGet.mockResolvedValue({ success: true, data: [] });
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('No invoices found')).toBeInTheDocument();
      });
    });
  });

  describe('single invoice view', () => {
    it('renders invoice detail when id param exists', async () => {
      renderComponent('/invoices?id=inv-1');
      await waitFor(() => {
        expect(screen.getByText('Invoice')).toBeInTheDocument();
        expect(screen.getByText(/View and download your invoice/)).toBeInTheDocument();
      });
    });

    it('shows action buttons', async () => {
      renderComponent('/invoices?id=inv-1');
      await waitFor(() => {
        expect(screen.getByText(/Print/)).toBeInTheDocument();
        expect(screen.getByText(/Download PDF/)).toBeInTheDocument();
        expect(screen.getByText(/Email Invoice/)).toBeInTheDocument();
      });
    });

    it('shows provider info', async () => {
      renderComponent('/invoices?id=inv-1');
      await waitFor(() => {
        expect(screen.getAllByText('City Clinic').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('billing@city.com')).toBeInTheDocument();
      });
    });

    it('shows patient info', async () => {
      renderComponent('/invoices?id=inv-1');
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john@email.com')).toBeInTheDocument();
      });
    });

    it('shows invoice number in detail view', async () => {
      renderComponent('/invoices?id=inv-1');
      await waitFor(() => {
        expect(screen.getByText('INV-2026-001')).toBeInTheDocument();
      });
    });

    it('shows line items', async () => {
      renderComponent('/invoices?id=inv-1');
      await waitFor(() => {
        expect(screen.getByText('Consultation')).toBeInTheDocument();
      });
    });

    it('shows totals', async () => {
      renderComponent('/invoices?id=inv-1');
      await waitFor(() => {
        expect(screen.getByText('$550.00')).toBeInTheDocument();
      });
    });

    it('shows back to all invoices link', async () => {
      renderComponent('/invoices?id=inv-1');
      await waitFor(() => {
        expect(screen.getByText('← Back to All Invoices')).toBeInTheDocument();
      });
    });

    it('calls print on print button click', async () => {
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
      renderComponent('/invoices?id=inv-1');
      await waitFor(() => expect(screen.getByText(/Print/)).toBeInTheDocument());
      fireEvent.click(screen.getByText(/Print/));
      expect(printSpy).toHaveBeenCalled();
      printSpy.mockRestore();
    });

    it('shows PDF alert on download click', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      renderComponent('/invoices?id=inv-1');
      await waitFor(() => expect(screen.getByText(/Download PDF/)).toBeInTheDocument());
      fireEvent.click(screen.getByText(/Download PDF/));
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('PDF download'));
      alertSpy.mockRestore();
    });

    it('shows email alert on email button click', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      renderComponent('/invoices?id=inv-1');
      await waitFor(() => expect(screen.getByText(/Email Invoice/)).toBeInTheDocument());
      fireEvent.click(screen.getByText(/Email Invoice/));
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('INV-2026-001'));
      alertSpy.mockRestore();
    });
  });
});
