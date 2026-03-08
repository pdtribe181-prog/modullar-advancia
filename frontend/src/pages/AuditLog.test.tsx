import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuditLog } from './AuditLog';

function renderComponent() {
  return render(
    <MemoryRouter>
      <AuditLog />
    </MemoryRouter>
  );
}

describe('AuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the page title and subtitle', () => {
      renderComponent();
      expect(screen.getByText('Audit Log')).toBeInTheDocument();
      expect(screen.getByText('View all system activity and security events')).toBeInTheDocument();
    });

    it('renders the export button', () => {
      renderComponent();
      expect(screen.getByText(/Export JSON/i)).toBeInTheDocument();
    });

    it('renders filter controls', () => {
      renderComponent();
      expect(screen.getByPlaceholderText('Action or email...')).toBeInTheDocument();
      expect(screen.getByText('All Categories')).toBeInTheDocument();
      expect(screen.getByText('All Statuses')).toBeInTheDocument();
    });

    it('renders table headers', () => {
      renderComponent();
      expect(screen.getByText('Timestamp')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.getAllByText('Category').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Actor')).toBeInTheDocument();
      expect(screen.getAllByText('Status').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('IP Address')).toBeInTheDocument();
    });

    it('renders mock log entries', () => {
      renderComponent();
      expect(screen.getByText('user.login')).toBeInTheDocument();
      expect(screen.getByText('payment.processed')).toBeInTheDocument();
      expect(screen.getByText('user.password_change')).toBeInTheDocument();
      expect(screen.getByText('user.login_failed')).toBeInTheDocument();
    });

    it('renders actor emails', () => {
      renderComponent();
      expect(screen.getAllByText('admin@advanciapayledger.com').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('jane@clinic.com')).toBeInTheDocument();
      expect(screen.getByText('patient@email.com')).toBeInTheDocument();
    });

    it('shows entry count', () => {
      renderComponent();
      expect(screen.getByText(/Showing 8 of 8 entries/)).toBeInTheDocument();
    });

    it('renders pagination buttons', () => {
      renderComponent();
      expect(screen.getByText('← Previous')).toBeInTheDocument();
      expect(screen.getByText('Next →')).toBeInTheDocument();
    });
  });

  describe('filtering', () => {
    it('filters by search text', () => {
      renderComponent();
      const searchInput = screen.getByPlaceholderText('Action or email...');
      fireEvent.change(searchInput, { target: { value: 'payment' } });
      expect(screen.getByText('payment.processed')).toBeInTheDocument();
      expect(screen.getByText('payment.refund_issued')).toBeInTheDocument();
      expect(screen.queryByText('user.login_failed')).not.toBeInTheDocument();
    });

    it('filters by category', () => {
      renderComponent();
      const categorySelect = screen.getByDisplayValue('All Categories');
      fireEvent.change(categorySelect, { target: { value: 'auth' } });
      expect(screen.getByText('user.login')).toBeInTheDocument();
      expect(screen.getByText('user.login_failed')).toBeInTheDocument();
      expect(screen.queryByText('payment.processed')).not.toBeInTheDocument();
    });

    it('filters by status', () => {
      renderComponent();
      const statusSelect = screen.getByDisplayValue('All Statuses');
      fireEvent.change(statusSelect, { target: { value: 'failure' } });
      expect(screen.getByText('user.login_failed')).toBeInTheDocument();
      expect(screen.queryByText('user.login')).not.toBeInTheDocument();
    });

    it('combines search and category filters', () => {
      renderComponent();
      const searchInput = screen.getByPlaceholderText('Action or email...');
      const categorySelect = screen.getByDisplayValue('All Categories');
      fireEvent.change(searchInput, { target: { value: 'admin' } });
      fireEvent.change(categorySelect, { target: { value: 'admin' } });
      expect(screen.getByText('admin.role_changed')).toBeInTheDocument();
    });

    it('updates entry count when filtering', () => {
      renderComponent();
      const statusSelect = screen.getByDisplayValue('All Statuses');
      fireEvent.change(statusSelect, { target: { value: 'warning' } });
      expect(screen.getByText(/Showing 1 of 8 entries/)).toBeInTheDocument();
    });
  });

  describe('detail modal', () => {
    it('opens detail modal when clicking a log row', () => {
      renderComponent();
      const loginRow = screen.getByText('user.login').closest('tr')!;
      fireEvent.click(loginRow);
      expect(screen.getByText('Log Details')).toBeInTheDocument();
    });

    it('shows log details in modal', () => {
      renderComponent();
      const loginRow = screen.getByText('user.login').closest('tr')!;
      fireEvent.click(loginRow);
      expect(screen.getByText('log_001')).toBeInTheDocument();
      expect(screen.getAllByText('192.168.1.45').length).toBeGreaterThanOrEqual(2);
    });

    it('closes modal when clicking close button', () => {
      renderComponent();
      const loginRow = screen.getByText('user.login').closest('tr')!;
      fireEvent.click(loginRow);
      expect(screen.getByText('Log Details')).toBeInTheDocument();
      const closeBtn = screen.getByText('×');
      fireEvent.click(closeBtn);
      expect(screen.queryByText('Log Details')).not.toBeInTheDocument();
    });

    it('closes modal when clicking overlay', () => {
      renderComponent();
      const loginRow = screen.getByText('user.login').closest('tr')!;
      fireEvent.click(loginRow);
      expect(screen.getByText('Log Details')).toBeInTheDocument();
      // Click overlay (the outer div with the modal overlay style)
      const overlay = screen.getByText('Log Details').closest('div[style]')!.parentElement!
        .parentElement!;
      fireEvent.click(overlay);
      expect(screen.queryByText('Log Details')).not.toBeInTheDocument();
    });
  });

  describe('export', () => {
    it('calls export function when button is clicked', () => {
      const createObjectURL = vi.fn(() => 'blob:test');
      const revokeObjectURL = vi.fn();
      Object.defineProperty(globalThis.URL, 'createObjectURL', {
        value: createObjectURL,
        writable: true,
      });
      Object.defineProperty(globalThis.URL, 'revokeObjectURL', {
        value: revokeObjectURL,
        writable: true,
      });

      renderComponent();
      const exportBtn = screen.getByText(/Export JSON/i);
      fireEvent.click(exportBtn);
      expect(createObjectURL).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalled();
    });
  });
});
