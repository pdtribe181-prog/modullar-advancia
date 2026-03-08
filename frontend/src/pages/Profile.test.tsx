import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Profile from './Profile';

const mockGet = vi.hoisted(() => vi.fn());
const mockPut = vi.hoisted(() => vi.fn());
const mockShowToast = vi.hoisted(() => vi.fn());

vi.mock('../services/api', () => ({
  api: { get: mockGet, put: mockPut },
  ApiError: class ApiError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

vi.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({}),
}));

vi.mock('../components/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const mockProfile = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  email: 'alice@example.com',
  full_name: 'Alice Smith',
  phone: '+15551234567',
  role: 'patient',
  stripe_customer_id: 'cus_test12345678901234',
  created_at: '2025-06-15T12:00:00Z',
};

function renderProfile() {
  return render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>
  );
}

describe('Profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(mockProfile);
  });

  it('shows loading spinner initially', () => {
    mockGet.mockReturnValue(new Promise(() => {})); // never resolves
    renderProfile();
    expect(screen.getByText('Loading profile...')).toBeInTheDocument();
  });

  it('renders profile heading after load', async () => {
    renderProfile();
    expect(await screen.findByText('Profile Settings')).toBeInTheDocument();
  });

  it('populates email field as disabled', async () => {
    renderProfile();
    const emailInput = await screen.findByLabelText('Email Address');
    expect(emailInput).toHaveValue('alice@example.com');
    expect(emailInput).toBeDisabled();
  });

  it('populates full name field', async () => {
    renderProfile();
    const nameInput = await screen.findByLabelText('Full Name');
    expect(nameInput).toHaveValue('Alice Smith');
  });

  it('populates phone field', async () => {
    renderProfile();
    const phoneInput = await screen.findByLabelText('Phone Number');
    expect(phoneInput).toHaveValue('+15551234567');
  });

  it('displays user role', async () => {
    renderProfile();
    expect(await screen.findByText('patient')).toBeInTheDocument();
  });

  it('displays stripe customer id', async () => {
    renderProfile();
    expect(await screen.findByText(/Stripe: cus_test1234567890/)).toBeInTheDocument();
  });

  it('displays account created date', async () => {
    renderProfile();
    expect(await screen.findByText('Account Created')).toBeInTheDocument();
  });

  it('displays user id prefix', async () => {
    renderProfile();
    expect(await screen.findByText(/aaaaaaaa…/)).toBeInTheDocument();
  });

  it('shows error when fetch fails', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));
    renderProfile();
    expect(await screen.findByText('Failed to load profile')).toBeInTheDocument();
  });

  it('submits updated profile', async () => {
    mockPut.mockResolvedValue({ ...mockProfile, full_name: 'Bob Jones' });
    renderProfile();

    const nameInput = await screen.findByLabelText('Full Name');
    fireEvent.change(nameInput, { target: { value: 'Bob Jones' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith('/auth/profile', {
        full_name: 'Bob Jones',
        phone: '+15551234567',
      })
    );
  });

  it('shows toast on successful save', async () => {
    mockPut.mockResolvedValue(mockProfile);
    renderProfile();

    await screen.findByLabelText('Full Name');
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith('Profile updated successfully', 'success')
    );
  });

  it('shows error when save fails', async () => {
    mockPut.mockRejectedValue(new Error('Update failed'));
    renderProfile();

    await screen.findByLabelText('Full Name');
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('Failed to update profile')).toBeInTheDocument();
  });

  it('hides stripe section when no customer id', async () => {
    mockGet.mockResolvedValue({ ...mockProfile, stripe_customer_id: null });
    renderProfile();
    await screen.findByText('Profile Settings');
    expect(screen.queryByText(/Stripe:/)).not.toBeInTheDocument();
  });
});
