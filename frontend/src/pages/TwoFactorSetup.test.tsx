import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../providers/AuthProvider', () => ({
  useAuth: () => ({ user: { email: 'test@advancia.com' } }),
}));

vi.mock('../styles.css', () => ({}));

import { TwoFactorSetup } from './TwoFactorSetup';

function renderComponent() {
  return render(
    <MemoryRouter>
      <TwoFactorSetup />
    </MemoryRouter>
  );
}

describe('TwoFactorSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });
  });

  describe('step 1: download app', () => {
    it('shows page title', () => {
      renderComponent();
      expect(screen.getByText('Set Up 2FA')).toBeInTheDocument();
    });

    it('shows subtitle', () => {
      renderComponent();
      expect(screen.getByText(/Secure your account with two-factor/)).toBeInTheDocument();
    });

    it('shows step indicators', () => {
      renderComponent();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('shows authenticator app links', () => {
      renderComponent();
      expect(screen.getByText('Google Authenticator')).toBeInTheDocument();
      expect(screen.getByText('Authy')).toBeInTheDocument();
      expect(screen.getByText('Microsoft Authenticator')).toBeInTheDocument();
    });

    it('shows continue button', () => {
      renderComponent();
      expect(screen.getByText(/I have an app installed/)).toBeInTheDocument();
    });

    it('shows cancel link', () => {
      renderComponent();
      expect(screen.getByText('Cancel Setup')).toBeInTheDocument();
    });
  });

  describe('step 2: scan QR', () => {
    function goToStep2() {
      renderComponent();
      fireEvent.click(screen.getByText(/I have an app installed/));
    }

    it('shows scan QR instruction', () => {
      goToStep2();
      expect(screen.getByText(/Open your authenticator app and scan/)).toBeInTheDocument();
    });

    it('shows secret key', () => {
      goToStep2();
      expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();
    });

    it('shows copy button', () => {
      goToStep2();
      expect(screen.getByText(/Copy code/)).toBeInTheDocument();
    });

    it('copies secret on button click', async () => {
      goToStep2();
      fireEvent.click(screen.getByText(/Copy code/));
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('JBSWY3DPEHPK3PXP');
      });
    });

    it('shows copied feedback', async () => {
      goToStep2();
      fireEvent.click(screen.getByText(/Copy code/));
      await waitFor(() => {
        expect(screen.getByText(/Copied/)).toBeInTheDocument();
      });
    });

    it('shows back and next buttons', () => {
      goToStep2();
      expect(screen.getByText('← Back')).toBeInTheDocument();
      expect(screen.getByText(/Next: Verify/)).toBeInTheDocument();
    });

    it('goes back to step 1', () => {
      goToStep2();
      fireEvent.click(screen.getByText('← Back'));
      expect(screen.getByText(/I have an app installed/)).toBeInTheDocument();
    });
  });

  describe('step 3: verify', () => {
    function goToStep3() {
      renderComponent();
      fireEvent.click(screen.getByText(/I have an app installed/));
      fireEvent.click(screen.getByText(/Next: Verify/));
    }

    it('shows verify instruction', () => {
      goToStep3();
      expect(screen.getByText(/Enter the 6-digit code/)).toBeInTheDocument();
    });

    it('shows 6 digit inputs', () => {
      goToStep3();
      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBe(6);
    });

    it('shows verify button (disabled without code)', () => {
      goToStep3();
      const btn = screen.getByText(/Verify & Enable 2FA/);
      expect(btn).toBeDisabled();
    });

    it('enables verify button with 6 digits', () => {
      goToStep3();
      const inputs = screen.getAllByRole('textbox');
      ['1', '2', '3', '4', '5', '6'].forEach((d, i) => {
        fireEvent.change(inputs[i], { target: { value: d } });
      });
      expect(screen.getByText(/Verify & Enable 2FA/)).not.toBeDisabled();
    });

    it('goes back to step 2', () => {
      goToStep3();
      fireEvent.click(screen.getByText('← Back'));
      expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();
    });
  });

  describe('step 4: success', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    async function goToStep4() {
      vi.useFakeTimers();
      renderComponent();
      fireEvent.click(screen.getByText(/I have an app installed/));
      fireEvent.click(screen.getByText(/Next: Verify/));
      const inputs = screen.getAllByRole('textbox');
      ['1', '2', '3', '4', '5', '6'].forEach((d, i) => {
        fireEvent.change(inputs[i], { target: { value: d } });
      });
      await act(async () => {
        fireEvent.click(screen.getByText(/Verify & Enable 2FA/));
        await vi.advanceTimersByTimeAsync(1600);
      });
    }

    it('shows 2FA enabled message', async () => {
      await goToStep4();
      expect(screen.getByText('2FA Enabled!')).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('shows backup codes', async () => {
      await goToStep4();
      expect(screen.getByText('A1B2-C3D4')).toBeInTheDocument();
      expect(screen.getByText('E5F6-G7H8')).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('shows download button', async () => {
      await goToStep4();
      expect(screen.getByText(/Download Backup Codes/)).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('shows done button', async () => {
      await goToStep4();
      expect(screen.getByText(/Done - Go to Security Settings/)).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('navigates to security on done', async () => {
      await goToStep4();
      fireEvent.click(screen.getByText(/Done - Go to Security Settings/));
      expect(mockNavigate).toHaveBeenCalledWith('/security');
      vi.useRealTimers();
    });

    it('shows warning about backup codes', async () => {
      await goToStep4();
      expect(screen.getByText(/Save these backup codes/)).toBeInTheDocument();
      vi.useRealTimers();
    });
  });
});
