import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toggle } from './Toggle';

describe('Toggle', () => {
  it('renders with label on the right', () => {
    render(<Toggle label="Dark mode" />);
    expect(screen.getByLabelText('Dark mode')).toBeInTheDocument();
  });

  it('renders with label on the left', () => {
    render(<Toggle label="Notifications" labelPosition="left" />);
    expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
  });

  it('is unchecked by default', () => {
    render(<Toggle label="Toggle" />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('can be toggled', async () => {
    const user = userEvent.setup();
    render(<Toggle label="Toggle" />);
    await user.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('renders disabled', () => {
    render(<Toggle label="Toggle" disabled />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('shows hint text', () => {
    render(<Toggle label="Toggle" hint="Enable this feature" />);
    expect(screen.getByText('Enable this feature')).toBeInTheDocument();
  });
});
