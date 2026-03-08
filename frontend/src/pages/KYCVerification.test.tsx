import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { KYCVerification } from './KYCVerification';

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderComponent() {
  return render(
    <MemoryRouter>
      <KYCVerification />
    </MemoryRouter>
  );
}

describe('KYCVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('step 1 - personal information', () => {
    it('renders the page title', () => {
      renderComponent();
      expect(screen.getByText('Identity Verification')).toBeInTheDocument();
      expect(
        screen.getByText(/Complete KYC to unlock higher withdrawal limits/)
      ).toBeInTheDocument();
    });

    it('renders personal information form', () => {
      renderComponent();
      expect(screen.getByText('Personal Information')).toBeInTheDocument();
      expect(
        screen.getByText(/Enter your legal name as it appears on your ID/)
      ).toBeInTheDocument();
    });

    it('renders all form fields', () => {
      renderComponent();
      expect(screen.getByPlaceholderText('John')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Doe')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('123 Main Street, Apt 4')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('San Francisco')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('California')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('94102')).toBeInTheDocument();
    });

    it('renders step progress indicators', () => {
      renderComponent();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('fills in personal information fields', () => {
      renderComponent();
      fireEvent.change(screen.getByPlaceholderText('John'), { target: { value: 'Jane' } });
      fireEvent.change(screen.getByPlaceholderText('Doe'), { target: { value: 'Smith' } });
      expect(screen.getByPlaceholderText('John')).toHaveAttribute('value', 'Jane');
      expect(screen.getByPlaceholderText('Doe')).toHaveAttribute('value', 'Smith');
    });

    it('navigates to step 2 when clicking Continue', () => {
      renderComponent();
      fireEvent.click(screen.getByText('Continue →'));
      expect(screen.getByText('Select Document Type')).toBeInTheDocument();
    });
  });

  describe('step 2 - document type selection', () => {
    function goToStep2() {
      renderComponent();
      fireEvent.click(screen.getByText('Continue →'));
    }

    it('renders document type selection', () => {
      goToStep2();
      expect(screen.getByText('Select Document Type')).toBeInTheDocument();
      expect(screen.getByText(/Choose the ID document/)).toBeInTheDocument();
    });

    it('shows three document type options', () => {
      goToStep2();
      expect(screen.getByText('Passport')).toBeInTheDocument();
      expect(screen.getByText("Driver's License")).toBeInTheDocument();
      expect(screen.getByText('National ID')).toBeInTheDocument();
    });

    it('shows info box about document requirements', () => {
      goToStep2();
      expect(screen.getByText(/Your document must be valid/)).toBeInTheDocument();
    });

    it('has back and continue buttons', () => {
      goToStep2();
      expect(screen.getByText('← Back')).toBeInTheDocument();
      expect(screen.getByText('Continue →')).toBeInTheDocument();
    });

    it('goes back to step 1 when clicking Back', () => {
      goToStep2();
      fireEvent.click(screen.getByText('← Back'));
      expect(screen.getByText('Personal Information')).toBeInTheDocument();
    });

    it('proceeds to step 3 when clicking Continue', () => {
      goToStep2();
      fireEvent.click(screen.getByText('Continue →'));
      expect(screen.getByText('Upload Documents')).toBeInTheDocument();
    });

    it('can select different document types', () => {
      goToStep2();
      fireEvent.click(screen.getByText("Driver's License"));
      fireEvent.click(screen.getByText('Continue →'));
      // Should show "drivers license" in the upload step
      expect(screen.getByText(/Upload clear photos of your drivers license/)).toBeInTheDocument();
    });
  });

  describe('step 3 - upload documents', () => {
    function goToStep3() {
      renderComponent();
      fireEvent.click(screen.getByText('Continue →')); // step 1 -> 2
      fireEvent.click(screen.getByText('Continue →')); // step 2 -> 3
    }

    it('renders upload documents section', () => {
      goToStep3();
      expect(screen.getByText('Upload Documents')).toBeInTheDocument();
    });

    it('shows front of passport upload area', () => {
      goToStep3();
      expect(screen.getByText(/Front of/)).toBeInTheDocument();
    });

    it('shows selfie upload area', () => {
      goToStep3();
      expect(screen.getByText(/Selfie with ID/)).toBeInTheDocument();
    });

    it('does not show back of ID for passport', () => {
      goToStep3();
      expect(screen.queryByText(/Back of/)).not.toBeInTheDocument();
    });

    it('shows back of ID for drivers license', () => {
      renderComponent();
      fireEvent.click(screen.getByText('Continue →')); // step 1 -> 2
      fireEvent.click(screen.getByText("Driver's License"));
      fireEvent.click(screen.getByText('Continue →')); // step 2 -> 3
      expect(screen.getByText(/Back of drivers license/)).toBeInTheDocument();
    });

    it('shows upload hints', () => {
      goToStep3();
      expect(screen.getAllByText(/JPG, PNG or PDF • Max 10MB/).length).toBeGreaterThanOrEqual(1);
    });

    it('has a disabled Submit button when no files selected', () => {
      goToStep3();
      const submitBtn = screen.getByText('Submit for Review');
      expect(submitBtn).toBeDisabled();
    });

    it('goes back to step 2 when clicking Back', () => {
      goToStep3();
      fireEvent.click(screen.getByText('← Back'));
      expect(screen.getByText('Select Document Type')).toBeInTheDocument();
    });
  });

  describe('step 4 - success', () => {
    async function submitKYC() {
      renderComponent();
      fireEvent.click(screen.getByText('Continue →')); // step 1 -> 2
      fireEvent.click(screen.getByText('Continue →')); // step 2 -> 3

      const frontFile = new File(['test'], 'front.jpg', { type: 'image/jpeg' });
      Object.defineProperty(frontFile, 'size', { value: 1024 });
      const selfieFile = new File(['test'], 'selfie.jpg', { type: 'image/jpeg' });
      Object.defineProperty(selfieFile, 'size', { value: 1024 });
      const fileInputs = document.querySelectorAll('input[type="file"]');
      fireEvent.change(fileInputs[0], { target: { files: [frontFile] } });
      fireEvent.change(fileInputs[1], { target: { files: [selfieFile] } });

      await act(async () => {
        fireEvent.click(screen.getByText('Submit for Review'));
        // Let the 2s setTimeout complete
        await vi.advanceTimersByTimeAsync(2500);
      });
    }

    it('shows verification submitted message after submit', async () => {
      vi.useFakeTimers();
      await submitKYC();
      expect(screen.getByText(/Verification Submitted/)).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('shows checklist on success', async () => {
      vi.useFakeTimers();
      await submitKYC();
      expect(screen.getByText(/Personal information submitted/)).toBeInTheDocument();
      expect(screen.getByText(/Identity document uploaded/)).toBeInTheDocument();
      expect(screen.getByText(/Selfie verification uploaded/)).toBeInTheDocument();
      expect(screen.getByText(/Under review/)).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('navigates to profile when clicking Return to Profile', async () => {
      vi.useFakeTimers();
      await submitKYC();
      fireEvent.click(screen.getByText('Return to Profile'));
      expect(mockNavigate).toHaveBeenCalledWith('/profile');
      vi.useRealTimers();
    });
  });
});
