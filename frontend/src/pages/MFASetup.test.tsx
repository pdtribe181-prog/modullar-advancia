import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const mockNavigate = vi.hoisted(() => vi.fn());
const mockEnrollMFA = vi.hoisted(() => vi.fn());
const mockVerifyMFA = vi.hoisted(() => vi.fn());
const mockListMFAFactors = vi.hoisted(() => vi.fn());
const mockUnenrollMFA = vi.hoisted(() => vi.fn());
const mockConfirmDialog = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({
    enrollMFA: mockEnrollMFA,
    verifyMFA: mockVerifyMFA,
    listMFAFactors: mockListMFAFactors,
    unenrollMFA: mockUnenrollMFA,
    isAuthenticated: true,
  }),
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
      {loading ? 'Setting up...' : children}
    </button>
  ),
}));

import { MFASetup } from './MFASetup';

describe('MFASetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListMFAFactors.mockResolvedValue([]);
  });

  function renderComponent() {
    return render(<MFASetup />);
  }

  describe('rendering', () => {
    it('shows the page title', async () => {
      renderComponent();
      expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
    });

    it('shows the subtitle', () => {
      renderComponent();
      expect(screen.getByText(/Add an extra layer of security/)).toBeInTheDocument();
    });

    it('shows add authenticator section', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Add Authenticator App')).toBeInTheDocument();
      });
    });

    it('shows description about authenticator apps', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText(/Google Authenticator/)).toBeInTheDocument();
      });
    });

    it('shows device name input', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByLabelText('Device Name (optional)')).toBeInTheDocument();
      });
    });

    it('shows set up button', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Set Up Authenticator')).toBeInTheDocument();
      });
    });

    it('shows back to profile link', () => {
      renderComponent();
      expect(screen.getByText('← Back to Profile')).toBeInTheDocument();
    });

    it('navigates to profile on back click', () => {
      renderComponent();
      fireEvent.click(screen.getByText('← Back to Profile'));
      expect(mockNavigate).toHaveBeenCalledWith('/profile');
    });
  });

  describe('existing factors', () => {
    const mockFactors = [
      { id: 'f1', type: 'totp', friendlyName: 'My Phone', status: 'verified' },
      { id: 'f2', type: 'totp', friendlyName: 'Work Phone', status: 'unverified' },
    ];

    beforeEach(() => {
      mockListMFAFactors.mockResolvedValue(mockFactors);
    });

    it('shows factors list heading', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Your Authentication Methods')).toBeInTheDocument();
      });
    });

    it('shows factor names', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('My Phone')).toBeInTheDocument();
        expect(screen.getByText('Work Phone')).toBeInTheDocument();
      });
    });

    it('shows factor statuses', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('verified')).toBeInTheDocument();
        expect(screen.getByText('unverified')).toBeInTheDocument();
      });
    });

    it('shows remove buttons for each factor', async () => {
      renderComponent();
      await waitFor(() => {
        const removeButtons = screen.getAllByText('Remove');
        expect(removeButtons).toHaveLength(2);
      });
    });

    it('calls unenrollMFA on confirmed remove', async () => {
      mockConfirmDialog.mockResolvedValue(true);
      mockUnenrollMFA.mockResolvedValue(undefined);
      renderComponent();
      await waitFor(() => expect(screen.getByText('My Phone')).toBeInTheDocument());
      fireEvent.click(screen.getAllByText('Remove')[0]);
      await waitFor(() => {
        expect(mockConfirmDialog).toHaveBeenCalled();
        expect(mockUnenrollMFA).toHaveBeenCalledWith('f1');
      });
    });

    it('does not remove on cancel confirm', async () => {
      mockConfirmDialog.mockResolvedValue(false);
      renderComponent();
      await waitFor(() => expect(screen.getByText('My Phone')).toBeInTheDocument());
      fireEvent.click(screen.getAllByText('Remove')[0]);
      await waitFor(() => expect(mockConfirmDialog).toHaveBeenCalled());
      expect(mockUnenrollMFA).not.toHaveBeenCalled();
    });
  });

  describe('enrollment', () => {
    const mockEnrollmentData = {
      id: 'enroll-1',
      type: 'totp' as const,
      totp: {
        qr_code: 'data:image/png;base64,mockQR',
        secret: 'MOCK-SECRET-KEY-123',
        uri: 'otpauth://totp/test',
      },
    };

    it('starts enrollment on button click', async () => {
      mockEnrollMFA.mockResolvedValue(mockEnrollmentData);
      renderComponent();
      await waitFor(() => expect(screen.getByText('Set Up Authenticator')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Set Up Authenticator'));
      await waitFor(() => {
        expect(screen.getByText('Scan QR Code')).toBeInTheDocument();
      });
    });

    it('shows QR code image', async () => {
      mockEnrollMFA.mockResolvedValue(mockEnrollmentData);
      renderComponent();
      await waitFor(() => expect(screen.getByText('Set Up Authenticator')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Set Up Authenticator'));
      await waitFor(() => {
        expect(screen.getByAltText('QR Code for authenticator app')).toBeInTheDocument();
      });
    });

    it('shows manual secret code', async () => {
      mockEnrollMFA.mockResolvedValue(mockEnrollmentData);
      renderComponent();
      await waitFor(() => expect(screen.getByText('Set Up Authenticator')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Set Up Authenticator'));
      await waitFor(() => {
        expect(screen.getByText('MOCK-SECRET-KEY-123')).toBeInTheDocument();
      });
    });

    it('shows verification code input', async () => {
      mockEnrollMFA.mockResolvedValue(mockEnrollmentData);
      renderComponent();
      await waitFor(() => expect(screen.getByText('Set Up Authenticator')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Set Up Authenticator'));
      await waitFor(() => {
        expect(screen.getByLabelText('Verification Code')).toBeInTheDocument();
      });
    });

    it('shows cancel and verify buttons', async () => {
      mockEnrollMFA.mockResolvedValue(mockEnrollmentData);
      renderComponent();
      await waitFor(() => expect(screen.getByText('Set Up Authenticator')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Set Up Authenticator'));
      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
        expect(screen.getByText('Verify & Enable')).toBeInTheDocument();
      });
    });

    it('cancels enrollment flow', async () => {
      mockEnrollMFA.mockResolvedValue(mockEnrollmentData);
      renderComponent();
      await waitFor(() => expect(screen.getByText('Set Up Authenticator')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Set Up Authenticator'));
      await waitFor(() => expect(screen.getByText('Cancel')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.getByText('Add Authenticator App')).toBeInTheDocument();
    });

    it('validates 6-digit code requirement', async () => {
      mockEnrollMFA.mockResolvedValue(mockEnrollmentData);
      renderComponent();
      await waitFor(() => expect(screen.getByText('Set Up Authenticator')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Set Up Authenticator'));
      await waitFor(() => expect(screen.getByLabelText('Verification Code')).toBeInTheDocument());
      fireEvent.change(screen.getByLabelText('Verification Code'), { target: { value: '123' } });
      fireEvent.click(screen.getByText('Verify & Enable'));
      await waitFor(() => {
        expect(screen.getByText('Please enter a 6-digit code')).toBeInTheDocument();
      });
    });

    it('verifies enrollment successfully', async () => {
      mockEnrollMFA.mockResolvedValue(mockEnrollmentData);
      mockVerifyMFA.mockResolvedValue(undefined);
      renderComponent();
      await waitFor(() => expect(screen.getByText('Set Up Authenticator')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Set Up Authenticator'));
      await waitFor(() => expect(screen.getByLabelText('Verification Code')).toBeInTheDocument());
      fireEvent.change(screen.getByLabelText('Verification Code'), { target: { value: '123456' } });
      fireEvent.click(screen.getByText('Verify & Enable'));
      await waitFor(() => {
        expect(mockVerifyMFA).toHaveBeenCalledWith('enroll-1', '123456');
        expect(screen.getByText('MFA enabled successfully!')).toBeInTheDocument();
      });
    });

    it('shows error on enrollment failure', async () => {
      mockEnrollMFA.mockRejectedValue(new Error('Enrollment failed'));
      renderComponent();
      await waitFor(() => expect(screen.getByText('Set Up Authenticator')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Set Up Authenticator'));
      await waitFor(() => {
        expect(screen.getByText('Enrollment failed')).toBeInTheDocument();
      });
    });

    it('shows error on verify failure', async () => {
      mockEnrollMFA.mockResolvedValue(mockEnrollmentData);
      mockVerifyMFA.mockRejectedValue(new Error('Invalid code'));
      renderComponent();
      await waitFor(() => expect(screen.getByText('Set Up Authenticator')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Set Up Authenticator'));
      await waitFor(() => expect(screen.getByLabelText('Verification Code')).toBeInTheDocument());
      fireEvent.change(screen.getByLabelText('Verification Code'), { target: { value: '999999' } });
      fireEvent.click(screen.getByText('Verify & Enable'));
      await waitFor(() => {
        expect(screen.getByText('Invalid code')).toBeInTheDocument();
      });
    });

    it('passes friendly name to enrollMFA', async () => {
      mockEnrollMFA.mockResolvedValue(mockEnrollmentData);
      renderComponent();
      await waitFor(() =>
        expect(screen.getByLabelText('Device Name (optional)')).toBeInTheDocument()
      );
      fireEvent.change(screen.getByLabelText('Device Name (optional)'), {
        target: { value: 'My iPhone' },
      });
      fireEvent.click(screen.getByText('Set Up Authenticator'));
      await waitFor(() => {
        expect(mockEnrollMFA).toHaveBeenCalledWith('My iPhone');
      });
    });
  });

  describe('load failure', () => {
    it('shows error when factor load fails', async () => {
      mockListMFAFactors.mockRejectedValue(new Error('Network error'));
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });
});
