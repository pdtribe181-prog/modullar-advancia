import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Contact } from './Contact';

function renderContact() {
  return render(
    <MemoryRouter>
      <Contact />
    </MemoryRouter>
  );
}

describe('Contact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('header', () => {
    it('renders Contact Us tag', () => {
      renderContact();
      expect(screen.getByText('Contact Us')).toBeInTheDocument();
    });

    it('renders Get in Touch heading', () => {
      renderContact();
      expect(screen.getByText('Get in Touch')).toBeInTheDocument();
    });

    it('renders subtitle text', () => {
      renderContact();
      expect(screen.getByText(/Have questions about Advancia PayLedger/)).toBeInTheDocument();
    });
  });

  describe('contact form', () => {
    it('renders Send us a Message heading', () => {
      renderContact();
      expect(screen.getByText('Send us a Message')).toBeInTheDocument();
    });

    it('renders name field', () => {
      renderContact();
      expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
    });

    it('renders email field', () => {
      renderContact();
      expect(screen.getByPlaceholderText('john@example.com')).toBeInTheDocument();
    });

    it('renders category select', () => {
      renderContact();
      expect(screen.getByText('Select a category...')).toBeInTheDocument();
    });

    it('renders subject field', () => {
      renderContact();
      expect(screen.getByPlaceholderText('Brief description of your inquiry')).toBeInTheDocument();
    });

    it('renders message field', () => {
      renderContact();
      expect(
        screen.getByPlaceholderText('Please provide as much detail as possible...')
      ).toBeInTheDocument();
    });

    it('renders submit button', () => {
      renderContact();
      expect(screen.getByText(/Send Message/)).toBeInTheDocument();
    });
  });

  describe('form interaction', () => {
    it('fills in name field', () => {
      renderContact();
      const input = screen.getByPlaceholderText('John Doe');
      fireEvent.change(input, { target: { value: 'Test User', name: 'name' } });
      expect(input).toHaveValue('Test User');
    });

    it('fills in email field', () => {
      renderContact();
      const input = screen.getByPlaceholderText('john@example.com');
      fireEvent.change(input, { target: { value: 'test@test.com', name: 'email' } });
      expect(input).toHaveValue('test@test.com');
    });

    it('selects a category', () => {
      renderContact();
      const select = screen.getByDisplayValue('Select a category...');
      fireEvent.change(select, { target: { value: 'billing', name: 'category' } });
      expect(select).toHaveValue('billing');
    });

    it('fills in subject field', () => {
      renderContact();
      const input = screen.getByPlaceholderText('Brief description of your inquiry');
      fireEvent.change(input, { target: { value: 'Test Subject', name: 'subject' } });
      expect(input).toHaveValue('Test Subject');
    });

    it('fills in message field', () => {
      renderContact();
      const textarea = screen.getByPlaceholderText('Please provide as much detail as possible...');
      fireEvent.change(textarea, { target: { value: 'Test message content', name: 'message' } });
      expect(textarea).toHaveValue('Test message content');
    });
  });

  describe('form submission', () => {
    it('shows Sending... text during submission', async () => {
      renderContact();
      fireEvent.change(screen.getByPlaceholderText('John Doe'), {
        target: { value: 'User', name: 'name' },
      });
      fireEvent.change(screen.getByPlaceholderText('john@example.com'), {
        target: { value: 'a@b.com', name: 'email' },
      });
      fireEvent.change(screen.getByPlaceholderText('Brief description of your inquiry'), {
        target: { value: 'Subj', name: 'subject' },
      });
      fireEvent.change(
        screen.getByPlaceholderText('Please provide as much detail as possible...'),
        { target: { value: 'Msg', name: 'message' } }
      );

      // Submit - but don't advance timers yet
      await act(async () => {
        fireEvent.click(screen.getByText(/Send Message/));
      });
      expect(screen.getByText('Sending...')).toBeInTheDocument();
    });

    it('shows success state after submission', async () => {
      renderContact();
      fireEvent.change(screen.getByPlaceholderText('John Doe'), {
        target: { value: 'User', name: 'name' },
      });
      fireEvent.change(screen.getByPlaceholderText('john@example.com'), {
        target: { value: 'a@b.com', name: 'email' },
      });
      fireEvent.change(screen.getByPlaceholderText('Brief description of your inquiry'), {
        target: { value: 'Subj', name: 'subject' },
      });
      fireEvent.change(
        screen.getByPlaceholderText('Please provide as much detail as possible...'),
        { target: { value: 'Msg', name: 'message' } }
      );

      await act(async () => {
        fireEvent.click(screen.getByText(/Send Message/));
        vi.advanceTimersByTime(1500);
      });

      expect(screen.getByText('Message Sent!')).toBeInTheDocument();
      expect(screen.getByText(/Thank you for reaching out/)).toBeInTheDocument();
    });

    it('shows Send Another Message button after success', async () => {
      renderContact();
      fireEvent.change(screen.getByPlaceholderText('John Doe'), {
        target: { value: 'User', name: 'name' },
      });
      fireEvent.change(screen.getByPlaceholderText('john@example.com'), {
        target: { value: 'a@b.com', name: 'email' },
      });
      fireEvent.change(screen.getByPlaceholderText('Brief description of your inquiry'), {
        target: { value: 'Subj', name: 'subject' },
      });
      fireEvent.change(
        screen.getByPlaceholderText('Please provide as much detail as possible...'),
        { target: { value: 'Msg', name: 'message' } }
      );

      await act(async () => {
        fireEvent.click(screen.getByText(/Send Message/));
        vi.advanceTimersByTime(1500);
      });

      fireEvent.click(screen.getByText('Send Another Message'));
      // Form should be visible again
      expect(screen.getByText('Send us a Message')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('John Doe')).toHaveValue('');
    });
  });

  describe('info cards', () => {
    it('renders Email Support card', () => {
      renderContact();
      const emailSupportItems = screen.getAllByText('Email Support');
      expect(emailSupportItems.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('support@advanciapayledger.com')).toBeInTheDocument();
    });

    it('renders Phone Support card', () => {
      renderContact();
      expect(screen.getByText('Phone Support')).toBeInTheDocument();
      expect(screen.getByText('+1 (800) 555-1234')).toBeInTheDocument();
    });

    it('renders Live Chat card', () => {
      renderContact();
      expect(screen.getByText('Live Chat')).toBeInTheDocument();
      expect(screen.getByText('Coming Soon')).toBeInTheDocument();
    });

    it('renders Headquarters card', () => {
      renderContact();
      expect(screen.getByText('Headquarters')).toBeInTheDocument();
      expect(screen.getByText(/San Francisco, CA 94105/)).toBeInTheDocument();
    });

    it('renders Follow Us card with social links', () => {
      renderContact();
      expect(screen.getByText('Follow Us')).toBeInTheDocument();
      expect(screen.getByTitle('Twitter/X')).toBeInTheDocument();
      expect(screen.getByTitle('LinkedIn')).toBeInTheDocument();
    });

    it('renders Enterprise Solutions card', () => {
      renderContact();
      expect(screen.getByText('Enterprise Solutions')).toBeInTheDocument();
      expect(screen.getByText('enterprise@advanciapayledger.com')).toBeInTheDocument();
    });
  });

  describe('CTA cards', () => {
    it('renders Still have questions card', () => {
      renderContact();
      expect(screen.getAllByText('Still have questions?').length).toBeGreaterThanOrEqual(1);
    });

    it('renders Developer Docs card', () => {
      renderContact();
      expect(screen.getByText('Developer Docs')).toBeInTheDocument();
    });

    it('renders Get Started Now card', () => {
      renderContact();
      expect(screen.getByText('Get Started Now')).toBeInTheDocument();
    });

    it('renders Sign Up Free link to /signup', () => {
      renderContact();
      const link = screen.getByText('Sign Up Free');
      expect(link.closest('a')).toHaveAttribute('href', '/signup');
    });
  });
});
