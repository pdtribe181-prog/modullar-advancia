import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockGet = vi.hoisted(() => vi.fn());
const mockPut = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());
const mockShowToast = vi.hoisted(() => vi.fn());
const mockConfirmDialog = vi.hoisted(() => vi.fn());
const mockUseAuth = vi.hoisted(() => vi.fn());

vi.mock('../providers/AuthProvider', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('../services/api', () => ({
  api: { get: mockGet, put: mockPut, post: mockPost, delete: mockDelete },
  ApiError: class ApiError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

vi.mock('../components/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock('../components/ConfirmDialog', () => ({
  useConfirm: () => mockConfirmDialog,
}));

vi.mock('../components/Spinner', () => ({
  Spinner: ({ size }: { size?: number }) => <div data-testid="spinner">Loading {size}</div>,
  LoadingButton: ({
    children,
    loading,
    onClick,
    type,
    ...props
  }: {
    children: React.ReactNode;
    loading: boolean;
    onClick?: () => void;
    type?: string;
    [k: string]: unknown;
  }) => (
    <button onClick={onClick} disabled={loading} type={type as 'submit' | 'button'} {...props}>
      {loading ? 'Saving...' : children}
    </button>
  ),
}));

import { SecuritySettings } from './SecuritySettings';

const mockPreferences = {
  preferences: {
    emailNotifications: true,
    smsNotifications: false,
    notifyOnLogin: false,
    notifyOnPasswordChange: true,
    notifyOnEmailChange: true,
    notifyOnNewDevice: true,
  },
};

const mockIdentities = {
  identities: [
    {
      id: 'id1',
      provider: 'google',
      createdAt: '2026-01-01T00:00:00Z',
      lastSignInAt: '2026-02-01T00:00:00Z',
      identity_data: { email: 'user@gmail.com', name: 'Test User' },
    },
  ],
};

const mockSecurityEvents: {
  id: string;
  event_type: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  location?: { city?: string; country?: string };
}[] = [
  {
    id: 'e1',
    event_type: 'login',
    ip_address: '192.168.1.1',
    user_agent: 'Chrome',
    created_at: '2026-02-20T10:00:00Z',
    location: { city: 'New York', country: 'US' },
  },
  {
    id: 'e2',
    event_type: 'failed_login',
    ip_address: '10.0.0.1',
    user_agent: 'Firefox',
    created_at: '2026-02-19T08:00:00Z',
  },
  {
    id: 'e3',
    event_type: 'password_changed',
    ip_address: '192.168.1.1',
    user_agent: 'Chrome',
    created_at: '2026-02-18T14:00:00Z',
  },
];

function renderSecuritySettings() {
  return render(
    <MemoryRouter>
      <SecuritySettings />
    </MemoryRouter>
  );
}

describe('SecuritySettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/auth/security/preferences')) return Promise.resolve(mockPreferences);
      if (url.includes('/auth/identities')) return Promise.resolve(mockIdentities);
      if (url.includes('/auth/security/events')) return Promise.resolve(mockSecurityEvents);
      return Promise.resolve({});
    });
    mockPut.mockResolvedValue({});
    mockPost.mockResolvedValue({});
    mockDelete.mockResolvedValue({});
    mockConfirmDialog.mockResolvedValue(true);
  });

  describe('loading state', () => {
    it('shows spinner while loading', () => {
      mockGet.mockReturnValue(new Promise(() => {}));
      renderSecuritySettings();
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
      expect(screen.getByText('Loading security settings...')).toBeInTheDocument();
    });
  });

  describe('header', () => {
    it('renders Security Settings heading', async () => {
      renderSecuritySettings();
      await waitFor(() => {
        expect(screen.getByText('Security Settings')).toBeInTheDocument();
        expect(screen.getByText(/Manage your account security/)).toBeInTheDocument();
      });
    });

    it('renders quick links', async () => {
      renderSecuritySettings();
      await waitFor(() => {
        expect(screen.getByText(/Manage 2FA/)).toBeInTheDocument();
        expect(screen.getByText(/Profile Settings/)).toBeInTheDocument();
      });
    });
  });

  describe('tab navigation', () => {
    it('renders all tabs', async () => {
      renderSecuritySettings();
      await waitFor(() => {
        expect(screen.getByText(/Notifications/)).toBeInTheDocument();
        expect(screen.getByText(/Linked Accounts/)).toBeInTheDocument();
        expect(screen.getByText(/Activity Log/)).toBeInTheDocument();
        expect(screen.getByText(/Recovery/)).toBeInTheDocument();
      });
    });
  });

  describe('preferences tab', () => {
    it('shows notification preferences by default', async () => {
      renderSecuritySettings();
      await waitFor(() => {
        expect(screen.getByText('Security Notifications')).toBeInTheDocument();
        expect(screen.getByText('Email notifications')).toBeInTheDocument();
        expect(screen.getByText('SMS notifications')).toBeInTheDocument();
      });
    });

    it('shows event notification checkboxes', async () => {
      renderSecuritySettings();
      await waitFor(() => {
        expect(screen.getByText('New sign-in detected')).toBeInTheDocument();
        expect(screen.getByText('Password changed')).toBeInTheDocument();
        expect(screen.getByText('Email address changed')).toBeInTheDocument();
        expect(screen.getByText('New device detected')).toBeInTheDocument();
      });
    });

    it('shows Save Preferences button', async () => {
      renderSecuritySettings();
      await waitFor(() => expect(screen.getByText('Save Preferences')).toBeInTheDocument());
    });

    it('saves preferences when button is clicked', async () => {
      renderSecuritySettings();
      await waitFor(() => expect(screen.getByText('Save Preferences')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Save Preferences'));
      await waitFor(() => {
        expect(mockPut).toHaveBeenCalledWith('/auth/security/preferences', expect.any(Object));
        expect(mockShowToast).toHaveBeenCalledWith('Security preferences saved', 'success');
      });
    });

    it('shows error toast on save failure', async () => {
      mockPut.mockRejectedValueOnce(new Error('Network error'));
      renderSecuritySettings();
      await waitFor(() => expect(screen.getByText('Save Preferences')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Save Preferences'));
      await waitFor(() =>
        expect(mockShowToast).toHaveBeenCalledWith('Failed to save preferences', 'error')
      );
    });
  });

  describe('identities tab', () => {
    async function switchToIdentitiesTab() {
      renderSecuritySettings();
      await waitFor(() => expect(screen.getByText(/Linked Accounts/)).toBeInTheDocument());
      fireEvent.click(screen.getByText(/Linked Accounts/));
      await waitFor(() =>
        expect(screen.getByText('Linked Accounts', { exact: true })).toBeInTheDocument()
      );
    }

    it('shows linked identities', async () => {
      await switchToIdentitiesTab();
      expect(screen.getByText('google')).toBeInTheDocument();
      expect(screen.getByText('user@gmail.com')).toBeInTheDocument();
    });

    it('shows Unlink button for connected accounts', async () => {
      await switchToIdentitiesTab();
      expect(screen.getByText('Unlink')).toBeInTheDocument();
    });

    it('unlinks identity after confirmation', async () => {
      await switchToIdentitiesTab();
      fireEvent.click(screen.getByText('Unlink'));
      await waitFor(() => {
        expect(mockConfirmDialog).toHaveBeenCalled();
        expect(mockDelete).toHaveBeenCalledWith('/auth/identities/id1');
        expect(mockShowToast).toHaveBeenCalledWith('Account unlinked', 'success');
      });
    });

    it('does not unlink when confirmation is cancelled', async () => {
      mockConfirmDialog.mockResolvedValueOnce(false);
      await switchToIdentitiesTab();
      fireEvent.click(screen.getByText('Unlink'));
      await waitFor(() => expect(mockConfirmDialog).toHaveBeenCalled());
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('shows Add account section with providers', async () => {
      await switchToIdentitiesTab();
      expect(screen.getByText('Add account')).toBeInTheDocument();
      // Google should show as linked
      expect(screen.getByText('✓ Linked')).toBeInTheDocument();
      // Others should be linkable
      expect(screen.getByText('github')).toBeInTheDocument();
      expect(screen.getByText('facebook')).toBeInTheDocument();
      expect(screen.getByText('apple')).toBeInTheDocument();
    });
  });

  describe('activity tab', () => {
    async function switchToActivityTab() {
      renderSecuritySettings();
      await waitFor(() => expect(screen.getByText(/Activity Log/)).toBeInTheDocument());
      fireEvent.click(screen.getByText(/Activity Log/));
      await waitFor(() => expect(screen.getByText('Recent Security Activity')).toBeInTheDocument());
    }

    it('shows security events', async () => {
      await switchToActivityTab();
      expect(screen.getByText('Sign In')).toBeInTheDocument();
      expect(screen.getByText('Failed Login')).toBeInTheDocument();
      expect(screen.getByText('Password Changed')).toBeInTheDocument();
    });

    it('shows IP addresses', async () => {
      await switchToActivityTab();
      expect(screen.getByText(/192\.168\.1\.1/)).toBeInTheDocument();
      expect(screen.getByText(/10\.0\.0\.1/)).toBeInTheDocument();
    });

    it('shows location info when available', async () => {
      await switchToActivityTab();
      expect(screen.getByText(/New York, US/)).toBeInTheDocument();
    });

    it('shows Failed badge for failed logins', async () => {
      await switchToActivityTab();
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    it('shows empty state when no events', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/auth/security/preferences')) return Promise.resolve(mockPreferences);
        if (url.includes('/auth/identities')) return Promise.resolve(mockIdentities);
        if (url.includes('/auth/security/events')) return Promise.resolve([]);
        return Promise.resolve({});
      });
      renderSecuritySettings();
      await waitFor(() => expect(screen.getByText(/Activity Log/)).toBeInTheDocument());
      fireEvent.click(screen.getByText(/Activity Log/));
      await waitFor(() =>
        expect(screen.getByText('No recent security events')).toBeInTheDocument()
      );
    });
  });

  describe('recovery tab', () => {
    async function switchToRecoveryTab() {
      renderSecuritySettings();
      await waitFor(() => expect(screen.getByText(/Recovery/)).toBeInTheDocument());
      fireEvent.click(screen.getByText(/Recovery/));
      await waitFor(() => expect(screen.getByText('Account Recovery')).toBeInTheDocument());
    }

    it('shows recovery phone form', async () => {
      await switchToRecoveryTab();
      expect(screen.getByText('Recovery Phone Number')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('+1 (555) 123-4567')).toBeInTheDocument();
    });

    it('shows Set Recovery Phone button', async () => {
      await switchToRecoveryTab();
      expect(screen.getByText('Set Recovery Phone')).toBeInTheDocument();
    });

    it('validates phone number length', async () => {
      await switchToRecoveryTab();
      fireEvent.change(screen.getByPlaceholderText('+1 (555) 123-4567'), {
        target: { value: '123' },
      });
      fireEvent.click(screen.getByText('Set Recovery Phone'));
      await waitFor(() =>
        expect(mockShowToast).toHaveBeenCalledWith('Please enter a valid phone number', 'error')
      );
    });

    it('submits valid phone number', async () => {
      await switchToRecoveryTab();
      fireEvent.change(screen.getByPlaceholderText('+1 (555) 123-4567'), {
        target: { value: '+15551234567' },
      });
      fireEvent.click(screen.getByText('Set Recovery Phone'));
      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/auth/recovery/phone', { phone: '+15551234567' });
        expect(mockShowToast).toHaveBeenCalledWith(
          'Verification code sent to your phone',
          'success'
        );
      });
    });

    it('shows security tips', async () => {
      await switchToRecoveryTab();
      expect(screen.getByText(/Security Tips/)).toBeInTheDocument();
      expect(screen.getByText(/Enable two-factor authentication/)).toBeInTheDocument();
    });
  });
});
