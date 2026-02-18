import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner, LoadingOverlay, LoadingButton } from './Spinner';

describe('Spinner', () => {
  it('renders with default props', () => {
    render(<Spinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Loading...');
  });

  it('renders with custom size', () => {
    render(<Spinner size={48} />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveStyle({ width: '48px', height: '48px' });
  });

  it('renders with custom label', () => {
    render(<Spinner label="Processing..." />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', 'Processing...');
  });

  it('applies custom className', () => {
    render(<Spinner className="custom-class" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('custom-class');
  });
});

describe('LoadingOverlay', () => {
  it('renders with default message', () => {
    render(<LoadingOverlay />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<LoadingOverlay message="Please wait..." />);
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });
});

describe('LoadingButton', () => {
  it('renders children when not loading', () => {
    render(<LoadingButton>Submit</LoadingButton>);
    expect(screen.getByRole('button')).toHaveTextContent('Submit');
  });

  it('shows spinner when loading', () => {
    render(<LoadingButton loading>Submit</LoadingButton>);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('is disabled when loading', () => {
    render(<LoadingButton loading>Submit</LoadingButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows custom loading text', () => {
    render(<LoadingButton loading loadingText="Submitting...">Submit</LoadingButton>);
    expect(screen.getByText('Submitting...')).toBeInTheDocument();
  });
});
