import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TrustCenter } from './TrustCenter';

describe('TrustCenter', () => {
  it('renders hero content and action buttons', () => {
    render(
      <MemoryRouter>
        <TrustCenter />
      </MemoryRouter>
    );

    expect(screen.getByText('Advancia Trust Center')).toBeInTheDocument();
    expect(screen.getByText(/Control families,/)).toBeInTheDocument();
    expect(screen.getByText('Review Policies')).toBeInTheDocument();
    expect(screen.getByText('Contact Security Team')).toBeInTheDocument();
  });

  it('switches controlled tabs and updates detail cards', () => {
    render(
      <MemoryRouter>
        <TrustCenter />
      </MemoryRouter>
    );

    const operational = screen.getByText('Operational controls');
    fireEvent.click(operational);

    expect(
      screen.getByText('360° incident and response information in a shared operations console')
    ).toBeInTheDocument();

    const compliance = screen.getByText('Compliance controls');
    fireEvent.click(compliance);

    expect(
      screen.getByText('HIPAA-aligned data usage and access governance policies')
    ).toBeInTheDocument();
  });

  it('renders readiness metrics panel', () => {
    render(
      <MemoryRouter>
        <TrustCenter />
      </MemoryRouter>
    );

    expect(screen.getByText('Current trust metrics')).toBeInTheDocument();
    expect(screen.getByText('Security maturity')).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();
  });

  it('renders audit timeline events', () => {
    render(
      <MemoryRouter>
        <TrustCenter />
      </MemoryRouter>
    );

    expect(screen.getByText('Recent compliance and audit history')).toBeInTheDocument();
    expect(screen.getByText('SOC 2 Type II readiness assessment')).toBeInTheDocument();
    expect(screen.getByText('GDPR data subject request drill')).toBeInTheDocument();
  });
});
