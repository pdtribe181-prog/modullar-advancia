import React from 'react';
import { Link } from 'react-router-dom';
import '../styles.css';

const HEALTHCARE_STATS = [
  { value: '24/7', label: 'Patient access to bills and records' },
  { value: '<2 min', label: 'Average checkout and payment flow' },
  { value: 'Granular', label: 'Per-provider record permissions' },
  { value: 'One hub', label: 'Cards, invoices, approvals, and receipts' },
];

const CARE_JOURNEYS = [
  {
    title: 'For patients',
    points: [
      'Keep insurance, prescriptions, and emergency details in one health wallet.',
      'Pay invoices, copays, or recurring treatment plans without calling the front desk.',
      'Share only the exact records a clinic needs, then revoke access when care is complete.',
    ],
  },
  {
    title: 'For providers',
    points: [
      'Collect payments faster with a guided wallet and checkout experience built for healthcare.',
      'Review consent history, access logs, and billing events from the same operational view.',
      'Support digital intake, eligibility review, and ongoing patient communication without tool sprawl.',
    ],
  },
];

const OPERATING_PANELS = [
  {
    title: 'Patient wallet',
    description: 'A guided home base for cards, bills, receipts, and record-sharing requests.',
  },
  {
    title: 'Provider approvals',
    description:
      'Review permissions, confirm charges, and track outstanding balances in one queue.',
  },
  {
    title: 'Care timeline',
    description:
      'See upcoming visits, payment milestones, and every access event in a single timeline.',
  },
];

const TRUST_ITEMS = [
  'Encrypted record sharing',
  'Audit-ready access logs',
  '2FA and passkey support',
  'Payment history and receipts',
];

const HERO_METRICS = [
  { label: 'Open balances', value: '$18.4k' },
  { label: 'Access requests', value: '12' },
  { label: 'Check-ins today', value: '34' },
];

const HERO_TIMELINE = [
  'Pre-visit forms completed',
  'Copay approved and collected',
  'Cardiology record shared with clinic',
];

const CARE_FLOW_STAGES = [
  {
    phase: 'Before the visit',
    items: [
      'Digital intake forms',
      'Insurance and eligibility review',
      'Pre-visit payment estimate',
    ],
  },
  {
    phase: 'During care',
    items: [
      'One-tap record access sharing',
      'Real-time approvals and copays',
      'Shared patient-provider activity log',
    ],
  },
  {
    phase: 'After checkout',
    items: [
      'Installment reminders and receipts',
      'Follow-up document requests',
      'Persistent care and billing timeline',
    ],
  },
];

const TRUST_BADGES = [
  { icon: '🛡️', title: 'Protected access', note: 'Role-based views and strong login controls' },
  { icon: '🧾', title: 'Audit visibility', note: 'Every payment and record access is traceable' },
  { icon: '🏥', title: 'Provider ready', note: 'Built for patient intake, billing, and follow-up' },
  {
    icon: '📬',
    title: 'Clear communication',
    note: 'Receipts, reminders, and document prompts in one flow',
  },
];

const TESTIMONIALS = [
  {
    quote:
      'Patients stopped calling our front desk just to ask for balances and receipts. The wallet gave them a much cleaner experience.',
    name: 'Amara Okafor',
    role: 'Clinic Operations Lead',
  },
  {
    quote:
      'The strongest part is not just payment. It is the link between consent, access history, and what the patient actually sees.',
    name: 'Dr. Luis Bennett',
    role: 'Care Platform Advisor',
  },
  {
    quote:
      'The product finally explains healthcare finance in a way patients can follow from intake through follow-up.',
    name: 'Mina Rahman',
    role: 'Patient Experience Manager',
  },
];

export const HealthcareLanding: React.FC = () => {
  return (
    <div className="lp-root hc-root">
      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-hero-glow lp-hero-glow--a" />
        <div className="lp-hero-glow lp-hero-glow--b" />
        <div className="lp-hero-glow lp-hero-glow--c" aria-hidden="true" />
        <div className="lp-hero-inner hc-hero-inner">
          <div className="hc-hero-copy">
            <span className="lp-eyebrow">Advancia Healthcare Wallet</span>
            <h1 className="lp-hero-title hc-hero-title">
              One wallet for
              <br />
              <span className="lp-gradient-text">care access, records, and payments</span>
            </h1>
            <p className="lp-hero-sub hc-hero-sub">
              Give patients a simpler front door to healthcare while giving providers a cleaner way
              to manage intake, invoices, permissions, and follow-up in one secure flow.
            </p>
            <div className="lp-hero-actions hc-hero-actions">
              <Link to="/signup" className="lp-btn lp-btn--primary lp-btn--lg">
                Get Started
              </Link>
              <a href="#wallet" className="lp-btn lp-btn--ghost lp-btn--lg">
                Explore the experience
              </a>
            </div>
            <p className="lp-hero-note hc-hero-note">
              Accounts and payment rails are powered by Advancia PayLedger.
            </p>
            <div className="hc-trust-row" aria-label="Healthcare wallet highlights">
              {TRUST_ITEMS.map((item) => (
                <span key={item} className="hc-trust-chip">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="hc-hero-visual" aria-hidden="true">
            <div className="hc-hero-board">
              <div className="hc-hero-panel hc-hero-panel--primary hc-hero-panel--dashboard">
                <div className="hc-panel-header">
                  <span className="hc-panel-kicker">Provider command view</span>
                  <span className="hc-panel-status">Live operations</span>
                </div>
                <div className="hc-panel-title">Healthcare wallet cockpit</div>

                <div className="hc-metrics-row">
                  {HERO_METRICS.map((metric) => (
                    <div key={metric.label} className="hc-metric-card">
                      <span>{metric.label}</span>
                      <strong>{metric.value}</strong>
                    </div>
                  ))}
                </div>

                <div className="hc-dashboard-grid">
                  <div className="hc-balance-card hc-balance-card--main">
                    <span>Outstanding balance</span>
                    <strong>$480.00</strong>
                    <small>Next payment due in 6 days</small>
                    <div className="hc-progress-rail">
                      <div className="hc-progress-rail__fill" />
                    </div>
                  </div>

                  <div className="hc-mini-grid">
                    {OPERATING_PANELS.map((panel) => (
                      <div key={panel.title} className="hc-mini-card">
                        <strong>{panel.title}</strong>
                        <p>{panel.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="hc-timeline-panel">
                  <span className="hc-panel-kicker">Today&apos;s care timeline</span>
                  <ul className="hc-timeline-list">
                    {HERO_TIMELINE.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="hc-hero-side">
                <div className="hc-hero-panel hc-hero-panel--secondary">
                  <div className="hc-panel-header">
                    <span className="hc-panel-kicker">Today</span>
                    <span className="hc-panel-status">3 active requests</span>
                  </div>
                  <ul className="hc-activity-list">
                    <li>
                      <strong>Share cardiology record</strong>
                      <span>Approved for Riverside Clinic - expires in 24 hours</span>
                    </li>
                    <li>
                      <strong>Installment plan check-in</strong>
                      <span>$120 auto-pay scheduled for Friday</span>
                    </li>
                    <li>
                      <strong>Upcoming appointment</strong>
                      <span>Pre-visit forms ready for review</span>
                    </li>
                  </ul>
                </div>

                <div className="hc-hero-panel hc-hero-panel--patient">
                  <div className="hc-panel-header">
                    <span className="hc-panel-kicker">Patient card</span>
                    <span className="hc-panel-status">Consent active</span>
                  </div>
                  <div className="hc-patient-card">
                    <strong>Ada N.</strong>
                    <span>Follow-up visit in 2 days</span>
                    <small>Billing, insurance, and clinical summary synced</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-stats hc-stats">
        {HEALTHCARE_STATS.map((stat) => (
          <div key={stat.label} className="lp-stat hc-stat">
            <div className="lp-stat__value">{stat.value}</div>
            <div className="lp-stat__label">{stat.label}</div>
          </div>
        ))}
      </section>

      <section className="lp-section hc-journeys">
        <div className="lp-section__header">
          <span className="lp-tag">Experience</span>
          <h2>Built for both sides of the care journey</h2>
          <p>
            The page needed more than a headline. These flows show how the wallet actually helps
            patients and providers move through care without friction.
          </p>
        </div>
        <div className="hc-journey-grid">
          {CARE_JOURNEYS.map((journey) => (
            <div key={journey.title} className="hc-journey-card">
              <h3>{journey.title}</h3>
              <ul className="hc-journey-list">
                {journey.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* WALLET */}
      <section id="wallet" className="lp-section lp-features">
        <div className="lp-section__header">
          <span className="lp-tag">Wallet</span>
          <h2>Healthcare-first smart wallet</h2>
          <p>
            A simple, gasless wallet experience designed for patients and providers - no seed
            phrases or crypto expertise required.
          </p>
        </div>
        <div className="lp-features-grid">
          <div className="lp-feature-card">
            <div className="lp-feature-card__icon">⚡</div>
            <h3>Gasless experience</h3>
            <p>
              We sponsor network fees so transactions feel like a normal app, not a blockchain
              console.
            </p>
          </div>
          <div className="lp-feature-card">
            <div className="lp-feature-card__icon">🔑</div>
            <h3>Secure access</h3>
            <p>
              Log in with passkeys or 2FA and lock down sensitive actions with an extra approval
              step.
            </p>
          </div>
          <div className="lp-feature-card">
            <div className="lp-feature-card__icon">🧾</div>
            <h3>Unified balances</h3>
            <p>See wallet balances, recent health payments, and upcoming bills in a single view.</p>
          </div>
        </div>
      </section>

      {/* HEALTH MODULE */}
      <section className="lp-section lp-how lp-how--bg">
        <div className="lp-section__header">
          <span className="lp-tag">Health Module</span>
          <h2>Encrypted health cards &amp; records</h2>
          <p>
            Share only what&apos;s needed with each provider - and revoke access any time. Every
            access is logged for your peace of mind.
          </p>
        </div>
        <div className="lp-steps hc-record-steps">
          <div className="lp-step hc-record-step">
            <div className="lp-step__num">01</div>
            <h3>Create your health card</h3>
            <p>
              Add insurance, key medical details, and emergency contacts to a single digital health
              card.
            </p>
          </div>
          <div className="lp-step hc-record-step">
            <div className="lp-step__num">02</div>
            <h3>Control who can see it</h3>
            <p>
              Grant per-provider access and choose whether they see billing only, clinical notes, or
              both.
            </p>
          </div>
          <div className="lp-step hc-record-step">
            <div className="lp-step__num">03</div>
            <h3>Track every access</h3>
            <p>
              View a timestamped audit log of which clinic accessed which data, from which device.
            </p>
          </div>
        </div>
      </section>

      {/* PAYMENTS */}
      <section className="lp-section">
        <div className="lp-section__header">
          <span className="lp-tag">Payments</span>
          <h2>Pay medical bills on your terms</h2>
          <p>
            Use your wallet for one-off invoices, co-pays, or installment plans - with providers
            settled through Advancia PayLedger.
          </p>
        </div>
        <div className="lp-features-grid">
          <div className="lp-feature-card">
            <div className="lp-feature-card__icon">💳</div>
            <h3>Cards &amp; bank</h3>
            <p>Pay with cards or bank rails where your clinic supports them.</p>
          </div>
          <div className="lp-feature-card">
            <div className="lp-feature-card__icon">📆</div>
            <h3>Installments</h3>
            <p>
              Split eligible bills into predictable monthly payments where providers enable
              financing.
            </p>
          </div>
          <div className="lp-feature-card">
            <div className="lp-feature-card__icon">📊</div>
            <h3>Spending overview</h3>
            <p>
              Track health spending over time and download receipts for insurance or HSA/FSA
              reporting.
            </p>
          </div>
        </div>
      </section>

      <section className="lp-section hc-ops-strip">
        <div className="lp-section__header">
          <span className="lp-tag">Operations</span>
          <h2>Fill the gaps between intake, billing, and follow-up</h2>
          <p>
            Positioning improves when the page explains the operating model. These are the moments
            the healthcare wallet is designed to handle well.
          </p>
        </div>
        <div className="lp-features-grid">
          <div className="lp-feature-card hc-ops-card">
            <div className="lp-feature-card__icon">🗂️</div>
            <h3>Digital intake</h3>
            <p>
              Collect required patient details before the visit and keep them attached to the care
              timeline.
            </p>
          </div>
          <div className="lp-feature-card hc-ops-card">
            <div className="lp-feature-card__icon">✅</div>
            <h3>Consent and approvals</h3>
            <p>
              Record patient consent, provider approvals, and billing acknowledgements with clear
              timestamps.
            </p>
          </div>
          <div className="lp-feature-card hc-ops-card">
            <div className="lp-feature-card__icon">📨</div>
            <h3>Post-visit follow-up</h3>
            <p>
              Send reminders, payment prompts, and record requests without moving patients into
              another system.
            </p>
          </div>
        </div>
      </section>

      <section className="lp-section hc-flow-board">
        <div className="lp-section__header">
          <span className="lp-tag">Care Flow</span>
          <h2>One workflow from intake to follow-up</h2>
          <p>
            Patients do not think in product modules. This page should show the full care and
            payment rhythm as one connected experience.
          </p>
        </div>
        <div className="hc-flow-grid">
          {CARE_FLOW_STAGES.map((stage) => (
            <div key={stage.phase} className="hc-flow-card">
              <span className="hc-flow-phase">{stage.phase}</span>
              <ul className="hc-flow-list">
                {stage.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* SECURITY & COMPLIANCE */}
      <section className="lp-section lp-how lp-how--bg">
        <div className="lp-section__header">
          <span className="lp-tag">Security &amp; Compliance</span>
          <h2>Built for sensitive health data</h2>
          <p>
            The wallet and health module are designed for regulated healthcare environments with
            strong encryption and auditability.
          </p>
        </div>
        <div className="lp-features-grid">
          <div className="lp-feature-card">
            <h3>Strong authentication</h3>
            <p>Support for passkeys, 2FA, and device-level checks on sensitive actions.</p>
          </div>
          <div className="lp-feature-card">
            <h3>Encryption &amp; logging</h3>
            <p>
              Data encrypted in transit and at rest, with detailed logs for security and compliance
              review.
            </p>
          </div>
          <div className="lp-feature-card">
            <h3>Healthcare‑ready posture</h3>
            <p>
              Designed to integrate into HIPAA‑focused workflows. Formal certifications and BAAs are
              managed via Advancia PayLedger.
            </p>
          </div>
        </div>
      </section>

      <section className="lp-section hc-proof-strip">
        <div className="lp-section__header">
          <span className="lp-tag">Trust</span>
          <h2>Proof that the experience is built for real care operations</h2>
          <p>
            This should not end on promises alone. The page needs visible trust markers and real
            operational outcomes.
          </p>
        </div>
        <div className="lp-badges hc-badges-grid">
          {TRUST_BADGES.map((badge) => (
            <div key={badge.title} className="lp-badge-card hc-badge-card">
              <span>{badge.icon}</span>
              <strong>{badge.title}</strong>
              <p>{badge.note}</p>
            </div>
          ))}
        </div>
        <div className="lp-testimonials-grid hc-testimonials-grid">
          {TESTIMONIALS.map((item) => (
            <article key={item.name} className="lp-testimonial hc-testimonial">
              <div className="lp-testimonial__stars">★★★★★</div>
              <p className="lp-testimonial__quote">{item.quote}</p>
              <div className="lp-testimonial__author">
                <div className="lp-testimonial__avatar">+</div>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.role}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="lp-section lp-cta-banner hc-cta-banner">
        <div className="lp-cta-banner__glow" aria-hidden="true" />
        <h2>
          Ready to simplify your
          <br />
          <span className="lp-gradient-text">healthcare payments &amp; records?</span>
        </h2>
        <p>
          Create your account in Advancia PayLedger and start using the Healthcare Wallet and Health
          Module today.
        </p>
        <div className="lp-hero-actions" style={{ justifyContent: 'center' }}>
          <Link to="/signup" className="lp-btn lp-btn--primary lp-btn--lg">
            Create Your Account
          </Link>
          <a
            href="mailto:support@advancia-healthcare.com"
            className="lp-btn lp-btn--ghost lp-btn--lg"
          >
            Talk to Our Team
          </a>
        </div>
        <div className="lp-partners hc-partners">
          <span className="lp-partners__label">Designed for</span>
          <span className="lp-partner-name">Outpatient clinics</span>
          <span className="lp-partner-name">Specialist networks</span>
          <span className="lp-partner-name">Care coordinators</span>
          <span className="lp-partner-name">Healthcare finance teams</span>
        </div>
      </section>
    </div>
  );
};

export default HealthcareLanding;
