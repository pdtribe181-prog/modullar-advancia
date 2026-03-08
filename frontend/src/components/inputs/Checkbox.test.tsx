import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('renders with label', () => {
    render(<Checkbox label="Accept terms" />);
    expect(screen.getByLabelText('Accept terms')).toBeInTheDocument();
  });

  it('renders unchecked by default', () => {
    render(<Checkbox label="Accept" />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('can be checked', async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Accept" />);
    await user.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('shows error message', () => {
    render(<Checkbox label="Accept" error="Must accept" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Must accept');
  });

  it('shows hint when no error', () => {
    render(<Checkbox label="Accept" hint="Required for signup" />);
    expect(screen.getByText('Required for signup')).toBeInTheDocument();
  });

  it('renders disabled', () => {
    render(<Checkbox label="Accept" disabled />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('sets aria-invalid on error', () => {
    render(<Checkbox label="Accept" error="Nope" />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
  });
});
