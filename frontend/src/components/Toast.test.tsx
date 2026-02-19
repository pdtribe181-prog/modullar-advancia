import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from './Toast';

// Test component that uses the toast hook
function TestComponent() {
  const { showToast } = useToast();
  return (
    <button onClick={() => showToast('Test message', 'success')}>
      Show Toast
    </button>
  );
}

describe('ToastProvider', () => {
  it('renders children', () => {
    render(
      <ToastProvider>
        <div>Test content</div>
      </ToastProvider>
    );
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('shows toast message when showToast is called', async () => {
    const user = userEvent.setup();
    
    render(
      <ToastProvider duration={0}>
        <TestComponent />
      </ToastProvider>
    );

    await user.click(screen.getByRole('button', { name: /show toast/i }));
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('removes toast when dismiss button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ToastProvider duration={0}>
        <TestComponent />
      </ToastProvider>
    );

    await user.click(screen.getByRole('button', { name: /show toast/i }));
    expect(screen.getByText('Test message')).toBeInTheDocument();

    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    await user.click(dismissButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Test message')).not.toBeInTheDocument();
    });
  });
});

describe('useToast', () => {
  it('throws error when used outside ToastProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    function BadComponent() {
      useToast();
      return null;
    }

    expect(() => render(<BadComponent />)).toThrow(
      'useToast must be used within a ToastProvider'
    );
    
    consoleSpy.mockRestore();
  });
});
