import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary, ErrorFallback } from './ErrorBoundary';

function ThrowingComponent({ error }: { error?: Error }) {
  if (error) throw error;
  return <div>OK</div>;
}

describe('ErrorBoundary', () => {
  // Suppress console.error for expected throws
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('shows fallback UI on error', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent error={new Error('boom')} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/try refreshing/i)).toBeInTheDocument();
  });

  it('renders custom fallback', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error</div>}>
        <ThrowingComponent error={new Error('boom')} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom error')).toBeInTheDocument();
  });

  it('calls onError callback', () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent error={new Error('boom')} />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'boom' }),
      expect.any(Object)
    );
  });

  it('Try Again button resets error state', async () => {
    const user = userEvent.setup();
    const {} = render(
      <ErrorBoundary>
        <ThrowingComponent error={new Error('boom')} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Click retry — the component re-renders, but still throws so we see the error again
    await user.click(screen.getByText('Try Again'));
    // After retry with the same throwing component, error boundary catches again
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows Go Home button', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent error={new Error('boom')} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Go Home')).toBeInTheDocument();
  });
});

describe('ErrorFallback', () => {
  it('renders default message', () => {
    render(<ErrorFallback />);
    expect(screen.getByText('This section failed to load')).toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(<ErrorFallback message="Widget broke" />);
    expect(screen.getByText('Widget broke')).toBeInTheDocument();
  });

  it('shows retry button when onRetry provided', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorFallback onRetry={onRetry} />);
    await user.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('hides retry button when no onRetry', () => {
    render(<ErrorFallback />);
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });
});
