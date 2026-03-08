import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './Select';

const options = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
  { value: 'c', label: 'Option C', disabled: true },
];

describe('Select', () => {
  it('renders with label', () => {
    render(<Select label="Country" options={options} />);
    expect(screen.getByLabelText('Country')).toBeInTheDocument();
  });

  it('renders all options', () => {
    render(<Select label="Country" options={options} />);
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
    expect(screen.getByText('Option C')).toBeInTheDocument();
  });

  it('renders placeholder option', () => {
    render(<Select label="Country" options={options} placeholder="Select one..." />);
    expect(screen.getByText('Select one...')).toBeInTheDocument();
  });

  it('disables disabled options', () => {
    render(<Select label="Country" options={options} />);
    const optC = screen.getByText('Option C') as HTMLOptionElement;
    expect(optC.disabled).toBe(true);
  });

  it('renders required indicator', () => {
    render(<Select label="Country" options={options} required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<Select label="Country" options={options} error="Required" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('shows hint when no error', () => {
    render(<Select label="Country" options={options} hint="Pick one" />);
    expect(screen.getByText('Pick one')).toBeInTheDocument();
  });

  it('renders disabled', () => {
    render(<Select label="Country" options={options} disabled />);
    expect(screen.getByLabelText('Country')).toBeDisabled();
  });

  it('sets aria-invalid on error', () => {
    render(<Select label="Country" options={options} error="Bad" />);
    expect(screen.getByLabelText('Country')).toHaveAttribute('aria-invalid', 'true');
  });

  it('fires change event', async () => {
    const user = userEvent.setup();
    render(<Select label="Country" options={options} />);
    await user.selectOptions(screen.getByLabelText('Country'), 'b');
    expect((screen.getByLabelText('Country') as HTMLSelectElement).value).toBe('b');
  });
});
