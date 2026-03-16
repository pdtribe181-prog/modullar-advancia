import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

type ControlFamilyKey = 'technical' | 'operational' | 'compliance';

const CONTROL_FAMILIES: Array<{
  id: ControlFamilyKey;
  title: string;
  details: string[];
}> = [
  {
    id: 'technical',
    title: 'Technical controls',
    details: [
      'Role-based access controls with explicit enforcement paths',
      'Encrypted data at rest and in transit for all sensitive objects',
      'Continuous vulnerability scanning and patch orchestration',
      'Secure payment rails with tokenization and fraud detection',
    ],
  },
  {
    id: 'operational',
    title: 'Operational controls',
    details: [
      '360° incident and response information in a shared operations console',
      'Environmental monitoring with automated alerts and recoveries',
      'Clear service-level commitments and periodic third-party audits',
      'Defined change management with rollback and validation gates',
    ],
  },
  {
    id: 'compliance',
    title: 'Compliance controls',
    details: [
      'HIPAA-aligned data usage and access governance policies',
      'Audit-ready logs with immutable event histories',
      'Regular compliance reviews and certification reporting',
      'Formal dispute and remediation workflows with escalation points',
    ],
  },
];

const POLICIES = [
  ['Privacy policy', 'How data is used, shared, and protected across the platform.'],
  ['Terms of service', 'Service conditions, acceptable use, and account responsibilities.'],
  ['Dispute and resolution flow', 'Clear process for payment and operational issue handling.'],
  ['Access governance', 'How permission scopes and approval boundaries are maintained.'],
];

const TRUST_PRIORITIES = [
  'Environment-aware health checks and operational monitoring',
  'Centralized logging and incident visibility practices',
  'Separation of development and production operating concerns',
  'Policy-first approach to healthcare-adjacent data and payments',
];

const TRUST_METRICS = [
  { label: 'Security maturity', value: '88%' },
  { label: 'Policy coverage', value: '100%' },
  { label: 'Mean time to detect', value: '4 min' },
  { label: 'Mean time to recover', value: '27 min' },
];

const AUDIT_TIMELINE = [
  {
    date: '2026-02-10',
    title: 'SOC 2 Type II readiness assessment',
    summary:
      'Internal control review completed for production environment, no high-risk findings reported.',
  },
  {
    date: '2026-02-28',
    title: 'PCI-DSS gap remediation pass',
    summary: 'Quarterly payout workflow audit validated encryption and key rotation compliance.',
  },
  {
    date: '2026-03-05',
    title: 'GDPR data subject request drill',
    summary: '30-minute response time established for audit, verified through simulated requests.',
  },
  {
    date: '2026-03-14',
    title: 'External pen test engagement kickoff',
    summary: 'Third-party security firm commenced black-box and API penetration testing.',
  },
];

export const TrustCenter: React.FC = () => {
  const [activeFamily, setActiveFamily] = useState<ControlFamilyKey>('technical');
  const currentFamily = useMemo(
    () => CONTROL_FAMILIES.find((family) => family.id === activeFamily) ?? CONTROL_FAMILIES[0],
    [activeFamily]
  );

  return (
    <div className="lp-root">
      <section className="lp-hero">
        <div className="lp-hero-glow lp-hero-glow--a" />
        <div className="lp-hero-glow lp-hero-glow--b" />
        <div className="lp-hero-inner">
          <span className="lp-eyebrow">Advancia Trust Center</span>
          <h1 className="lp-hero-title">
            Control families,
            <br />
            <span className="lp-gradient-text">compliance signals, and readiness</span>
          </h1>
          <p className="lp-hero-sub">
            Source of truth for trust-sensitive stakeholders: security, compliance, operations and
            risk teams.
          </p>
          <div className="lp-hero-actions">
            <Link to="/policy" className="lp-btn lp-btn--primary lp-btn--lg">
              Review Policies
            </Link>
            <Link to="/contact" className="lp-btn lp-btn--ghost lp-btn--lg">
              Contact Security Team
            </Link>
          </div>
        </div>
      </section>

      <section className="lp-section lp-features">
        <div className="lp-section__header">
          <span className="lp-tag">Control Family</span>
          <h2>Explore key control families</h2>
          <p>
            Select a control family to surface the active controls that drive trust across platform
            operations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {CONTROL_FAMILIES.map((family) => (
            <button
              key={family.id}
              type="button"
              className="lp-btn"
              onClick={() => setActiveFamily(family.id)}
              style={{
                border:
                  activeFamily === family.id ? '1px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                background:
                  activeFamily === family.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                color: activeFamily === family.id ? '#fff' : 'var(--text)',
                fontWeight: 700,
                padding: '0.5rem 0.9rem',
              }}
            >
              {family.title}
            </button>
          ))}
        </div>

        <div className="lp-features-grid">
          {currentFamily.details.map((detail) => (
            <article className="lp-feature-card" key={detail}>
              <p>{detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-section lp-how lp-how--bg">
        <div className="lp-section__header">
          <span className="lp-tag">Policy Map</span>
          <h2>What governs the platform</h2>
        </div>
        <div className="lp-features-grid">
          {POLICIES.map(([title, text]) => (
            <article className="lp-feature-card" key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-section lp-security">
        <div className="lp-section__header">
          <span className="lp-tag">Operational Signals</span>
          <h2>How trust is sustained day to day</h2>
        </div>
        <div className="lp-features-grid">
          {TRUST_PRIORITIES.map((item) => (
            <article className="lp-feature-card" key={item}>
              <p>{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-section lp-features">
        <div className="lp-section__header">
          <span className="lp-tag">Readiness</span>
          <h2>Current trust metrics</h2>
          <p>Snapshot of operational readiness across key risk profiles.</p>
        </div>
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          }}
        >
          {TRUST_METRICS.map((metric) => (
            <article className="lp-feature-card" key={metric.label}>
              <p className="lp-hero-note">{metric.label}</p>
              <h3>{metric.value}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-section lp-features">
        <div className="lp-section__header">
          <span className="lp-tag">Audit timeline</span>
          <h2>Recent compliance and audit history</h2>
          <p>
            Track the latest audit milestones and remediation steps for full traceability and
            transparency.
          </p>
        </div>
        <div className="lpTimeline" style={{ display: 'grid', gap: '0.8rem' }}>
          {AUDIT_TIMELINE.map((event) => (
            <article className="lp-feature-card" key={`${event.date}-${event.title}`}>
              <p className="lp-hero-note" style={{ marginBottom: '0.35rem' }}>
                {event.date}
              </p>
              <h3 style={{ margin: 0 }}>{event.title}</h3>
              <p style={{ marginTop: '0.5rem', color: 'var(--secondary)' }}>{event.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-section lp-how lp-how--bg">
        <div className="lp-section__header">
          <span className="lp-tag">Action</span>
          <h2>Confirm trust readiness with your team</h2>
          <p>Share this page with stakeholders or submit inquiries directly to security ops.</p>
        </div>
        <div className="lp-center" style={{ marginTop: '1rem' }}>
          <Link to="/contact" className="lp-btn lp-btn--primary lp-btn--lg">
            Contact security operations
          </Link>
        </div>
      </section>
    </div>
  );
};
