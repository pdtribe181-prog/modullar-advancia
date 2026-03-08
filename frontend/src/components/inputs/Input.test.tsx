import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders required indicator', () => {
    render(<Input label="Email" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<Input label="Email" error="Invalid email" />);
    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent('Invalid email');
  });

  it('shows hint when no error', () => {
    render(<Input label="Email" hint="Enter your email" />);
    expect(screen.getByText('Enter your email')).toBeInTheDocument();
  });

  it('hides hint when error present', () => {
    render(<Input label="Email" hint="Enter your email" error="Required" />);
    expect(screen.queryByText('Enter your email')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('sets aria-invalid when error', () => {
    render(<Input label="Email" error="Bad" />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders disabled', () => {
    render(<Input label="Email" disabled />);
    expect(screen.getByLabelText('Email')).toBeDisabled();
  });

  it('renders password toggle', async () => {
    const user = userEvent.setup();
    render(<Input label="Password" type="password" showPasswordToggle />);

    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');

    const toggle = screen.getByRole('button', { name: /show password/i });
    await user.click(toggle);
    expect(input).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: /hide password/i }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('applies size class', () => {
    render(<Input label="Name" size="lg" />);
    expect(screen.getByLabelText('Name')).toHaveClass('input-lg');
  });

  it('renders left icon', () => {
    render(<Input label="Search" leftIcon={<span data-testid="icon">🔍</span>} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('calls onRightIconClick', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Input label="Search" rightIcon={<span>X</span>} onRightIconClick={handleClick} />);
    await user.click(screen.getByText('X'));
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
