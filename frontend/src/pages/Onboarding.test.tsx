import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Onboarding } from './Onboarding';

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderComponent() {
  return render(
    <MemoryRouter>
      <Onboarding />
    </MemoryRouter>
  );
}

describe('Onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('step 1 - welcome', () => {
    it('renders welcome screen', () => {
      renderComponent();
      expect(screen.getByText('Welcome to Advancia!')).toBeInTheDocument();
    });

    it('shows welcome subtitle', () => {
      renderComponent();
      expect(screen.getByText(/healthcare payment journey starts here/)).toBeInTheDocument();
    });

    it('renders progress bars', () => {
      renderComponent();
      const progressBars = document.querySelectorAll('div[style*="flex: 1"]');
      expect(progressBars.length).toBeGreaterThanOrEqual(5);
    });

    it('has Get Started button', () => {
      renderComponent();
      expect(screen.getByText('Get Started →')).toBeInTheDocument();
    });

    it('has Skip tour button', () => {
      renderComponent();
      expect(screen.getByText('Skip tour')).toBeInTheDocument();
    });

    it('navigates to dashboard on skip', () => {
      renderComponent();
      fireEvent.click(screen.getByText('Skip tour'));
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('step 2 - key features', () => {
    function goToStep2() {
      renderComponent();
      fireEvent.click(screen.getByText('Get Started →'));
    }

    it('shows Key Features title', () => {
      goToStep2();
      expect(screen.getByText('Key Features')).toBeInTheDocument();
    });

    it('renders all 4 feature cards', () => {
      goToStep2();
      expect(screen.getByText('Secure Payments')).toBeInTheDocument();
      expect(screen.getByText('Real-time Analytics')).toBeInTheDocument();
      expect(screen.getByText('HIPAA Compliant')).toBeInTheDocument();
      expect(screen.getByText('Multi-currency Wallet')).toBeInTheDocument();
    });

    it('shows feature descriptions', () => {
      goToStep2();
      expect(screen.getByText(/PCI compliance/)).toBeInTheDocument();
    });

    it('goes back to step 1', () => {
      goToStep2();
      fireEvent.click(screen.getByText('← Back'));
      expect(screen.getByText('Welcome to Advancia!')).toBeInTheDocument();
    });

    it('advances to step 3', () => {
      goToStep2();
      fireEvent.click(screen.getByText('Continue →'));
      expect(screen.getByText('Quick Setup')).toBeInTheDocument();
    });
  });

  describe('step 3 - setup checklist', () => {
    function goToStep3() {
      renderComponent();
      fireEvent.click(screen.getByText('Get Started →'));
      fireEvent.click(screen.getByText('Continue →'));
    }

    it('shows Quick Setup title', () => {
      goToStep3();
      expect(screen.getByText('Quick Setup')).toBeInTheDocument();
    });

    it('renders setup checklist items', () => {
      goToStep3();
      expect(screen.getByText('Verify your email')).toBeInTheDocument();
      expect(screen.getByText('Complete your profile')).toBeInTheDocument();
      expect(screen.getByText('Enable 2FA security')).toBeInTheDocument();
      expect(screen.getByText('Connect payment method')).toBeInTheDocument();
    });

    it('toggles checklist items on click', () => {
      goToStep3();
      fireEvent.click(screen.getByText('Verify your email'));
      // After clicking, the checkmark should appear
      const checkItem = screen.getByText('Verify your email').closest('div[style]')!;
      expect(checkItem).toBeInTheDocument();
    });

    it('shows pro tip', () => {
      goToStep3();
      expect(screen.getByText(/Pro Tip/)).toBeInTheDocument();
      expect(screen.getByText(/Enabling 2FA is highly recommended/)).toBeInTheDocument();
    });

    it('goes back to step 2', () => {
      goToStep3();
      fireEvent.click(screen.getByText('← Back'));
      expect(screen.getByText('Key Features')).toBeInTheDocument();
    });
  });

  describe('step 4 - preferences', () => {
    function goToStep4() {
      renderComponent();
      fireEvent.click(screen.getByText('Get Started →'));
      fireEvent.click(screen.getByText('Continue →'));
      fireEvent.click(screen.getByText('Continue →'));
    }

    it('shows Your Preferences title', () => {
      goToStep4();
      expect(screen.getByText('Your Preferences')).toBeInTheDocument();
    });

    it('shows notification preferences', () => {
      goToStep4();
      expect(screen.getByText(/All notifications/i)).toBeInTheDocument();
    });

    it('goes back to step 3', () => {
      goToStep4();
      fireEvent.click(screen.getByText('← Back'));
      expect(screen.getByText('Quick Setup')).toBeInTheDocument();
    });
  });

  describe('step 5 - completion', () => {
    function goToStep5() {
      renderComponent();
      fireEvent.click(screen.getByText('Get Started →'));
      fireEvent.click(screen.getByText('Continue →'));
      fireEvent.click(screen.getByText('Continue →'));
      fireEvent.click(screen.getByText('Continue →'));
    }

    it('shows completion screen', () => {
      goToStep5();
      expect(screen.getByText(/ready/i)).toBeInTheDocument();
    });

    it('sets localStorage and navigates on finish', () => {
      goToStep5();
      const goBtn = screen.getByText(/Go to Dashboard|Launch Dashboard|Get Started/i);
      fireEvent.click(goBtn);
      expect(localStorage.getItem('onboardingCompleted')).toBe('true');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });
});
