import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { LiveChartBanner } from '../components/LiveChartBanner';
import '../styles.css';

const STATS = [
  { value: 'MedBed-ready', label: 'Booking, billing, and follow-up in one flow' },
  { value: 'Checkout-first', label: 'Cards, bank transfers, and wallet flows' },
  { value: 'Role-based', label: 'Patient, provider, and admin experiences' },
  { value: 'Audit-ready', label: 'Payment, access, and dispute visibility' },
  { value: '24/7', label: 'Always-on account access, booking, and billing' },
];

const FEATURES = [
  {
    icon: '🛏️',
    title: 'MedBed booking',
    description:
      'Run MedBed session discovery, scheduling, deposits, and post-session billing from the same product surface.',
    badge: 'New',
  },
  {
    icon: '🧾',
    title: 'Secure checkout',
    description:
      'Move patients from invoice or booking to secure checkout with card and crypto payment options built into the flow.',
    badge: null,
  },
  {
    icon: '💳',
    title: 'Multi-Rail Payments',
    description:
      'Accept cards, bank rails, and wallet-based payments in one unified dashboard with clear settlement tracking.',
    badge: null,
  },
  {
    icon: '🔐',
    title: 'Access controls',
    description:
      'Protect sensitive actions with role-based access, verification steps, and event-level visibility.',
    badge: null,
  },
  {
    icon: '👛',
    title: 'Customer wallet',
    description:
      'Give customers one place to manage balances, receipts, saved payment methods, booking history, and billing status.',
    badge: null,
  },
  {
    icon: '📊',
    title: 'Analytics & Reporting',
    description:
      'Monitor revenue flow, disputes, payment completion, and team performance from a single reporting layer.',
    badge: null,
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Create your workspace',
    description:
      'Sign up in minutes, define your operating roles, and set the right access level for each team member.',
  },
  {
    step: '02',
    title: 'Connect payments and policies',
    description:
      'Set up your payment rails, MedBed booking rules, customer flows, notification rules, and internal approval checkpoints.',
  },
  {
    step: '03',
    title: 'Run bookings and checkout',
    description:
      'Launch bookings, move users through checkout, collect payments, and review the full operational trail in one place.',
  },
];

const OUTCOMES = [
  {
    name: 'Faster collections',
    role: 'Operational outcome',
    avatar: '⚡',
    quote:
      'Replace scattered booking and payment follow-up with a single workflow for balances, reminders, receipts, and session status.',
  },
  {
    name: 'Cleaner handoffs',
    role: 'Team outcome',
    avatar: '🔁',
    quote:
      'Patients, providers, and finance teams see the same booking and checkout state instead of chasing updates across tools.',
  },
  {
    name: 'Better visibility',
    role: 'Leadership outcome',
    avatar: '📈',
    quote:
      'Give leadership a clear view of MedBed demand, checkout completion, disputes, approvals, and throughput without manual reporting.',
  },
];

const PLANS = [
  {
    name: 'Patient',
    price: 'Free',
    period: '',
    color: 'plan-free',
    features: ['Account access', 'MedBed booking', 'Checkout history', 'Receipts and reminders'],
    cta: 'Sign Up Free',
    href: '/signup',
    highlight: false,
  },
  {
    name: 'Provider',
    price: '$49',
    period: '/mo',
    color: 'plan-pro',
    features: [
      'Everything in Patient',
      'Revenue analytics',
      'SMS & email reminders',
      'Stripe Connect payouts',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    href: '/signup',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    color: 'plan-enterprise',
    features: [
      'Everything in Provider',
      'Dedicated SLA',
      'Custom integrations',
      'HIPAA BAA included',
      'Dedicated account manager',
    ],
    cta: 'Contact Sales',
    href: '/contact',
    highlight: false,
  },
];

export const LandingPage: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const { left, top, width, height } = el.getBoundingClientRect();
      const x = ((e.clientX - left) / width - 0.5) * 20;
      const y = ((e.clientY - top) / height - 0.5) * -20;
      el.style.setProperty('--tilt-x', `${y}deg`);
      el.style.setProperty('--tilt-y', `${x}deg`);
    };
    el.addEventListener('mousemove', onMove);
    return () => el.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div className="lp-root">
      {/* ── HERO ── */}
      <section className="lp-hero" ref={heroRef}>
        <div className="lp-hero-glow lp-hero-glow--a" />
        <div className="lp-hero-glow lp-hero-glow--b" />
        <div className="lp-hero-glow lp-hero-glow--c" aria-hidden="true" />
        <div className="lp-hero-inner">
          <span className="lp-eyebrow">Healthcare Payments · Reimagined</span>
          <h1 className="lp-hero-title">
            The operating layer for
            <br />
            <span className="lp-gradient-text">MedBeds, checkout, and payments</span>
          </h1>
          <p className="lp-hero-sub">
            One secure platform for MedBed booking, secure checkout, payment collection, customer
            wallets, approvals, and reporting across your organisation.
          </p>
          <div className="lp-hero-actions">
            <Link to="/signup" className="lp-btn lp-btn--primary lp-btn--lg">
              Get Started Free →
            </Link>
            <Link to="/features" className="lp-btn lp-btn--ghost lp-btn--lg">
              See How It Works
            </Link>
          </div>
          <p className="lp-hero-note">No credit card required · Setup in 5 minutes</p>
        </div>
        {/* floating card decoration */}
        <div className="lp-hero-card" aria-hidden="true">
          <div className="lp-hero-card__header">
            <span className="lp-hero-card__dot lp-dot--green" />
            <span className="lp-hero-card__label">Last transaction</span>
          </div>
          <div className="lp-hero-card__amount">+$1,240.00</div>
          <div className="lp-hero-card__sub">MedBed checkout confirmed · just now</div>
          <div className="lp-hero-card__bar">
            <div className="lp-hero-card__bar-fill" />
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="lp-stats">
        {STATS.map((s) => (
          <div key={s.label} className="lp-stat">
            <div className="lp-stat__value">{s.value}</div>
            <div className="lp-stat__label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── LIVE CHART BANNER ── */}
      <section className="lp-section" style={{ paddingBottom: 0 }}>
        <LiveChartBanner />
      </section>

      {/* ── FEATURES ── */}
      <section className="lp-section lp-features">
        <div className="lp-section__header">
          <span className="lp-tag">Features</span>
          <h2>Everything your practice needs to book and get paid</h2>
          <p>
            A fully integrated suite for MedBed operations, secure checkout, and ongoing healthcare
            billing.
          </p>
        </div>
        <div className="lp-features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="lp-feature-card">
              <div className="lp-feature-card__icon">{f.icon}</div>
              {f.badge && <span className="lp-badge lp-badge--new">{f.badge}</span>}
              <h3>{f.title}</h3>
              <p>{f.description}</p>
            </div>
          ))}
        </div>
        <div className="lp-center" style={{ marginTop: '2.5rem' }}>
          <Link to="/features" className="lp-btn lp-btn--outline">
            View All Features
          </Link>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="lp-section lp-how lp-how--bg">
        <div className="lp-section__header">
          <span className="lp-tag">Process</span>
          <h2>Up and running in minutes</h2>
          <p>
            Three simple steps to transform how your clinic handles MedBed bookings, checkout, and
            payment operations.
          </p>
        </div>
        <div className="lp-steps">
          {STEPS.map((s, i) => (
            <div key={s.step} className="lp-step">
              <div className="lp-step__num">{s.step}</div>
              {i < STEPS.length - 1 && <div className="lp-step__connector" aria-hidden="true" />}
              <h3>{s.title}</h3>
              <p>{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── OUTCOMES ── */}
      <section className="lp-section lp-testimonials">
        <div className="lp-section__header">
          <span className="lp-tag">Outcomes</span>
          <h2>What teams actually improve</h2>
        </div>
        <div className="lp-testimonials-grid">
          {OUTCOMES.map((t) => (
            <div key={t.name} className="lp-testimonial">
              <div className="lp-testimonial__stars">★★★★★</div>
              <p className="lp-testimonial__quote">{t.quote}</p>
              <div className="lp-testimonial__author">
                <span className="lp-testimonial__avatar">{t.avatar}</span>
                <div>
                  <strong>{t.name}</strong>
                  <span>{t.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="lp-section lp-pricing lp-how--bg">
        <div className="lp-section__header">
          <span className="lp-tag">Pricing</span>
          <h2>Simple, transparent pricing</h2>
          <p>Start free. Scale MedBed operations, checkout, and billing as you grow.</p>
        </div>
        <div className="lp-plans-grid">
          {PLANS.map((p) => (
            <div key={p.name} className={`lp-plan ${p.highlight ? 'lp-plan--highlight' : ''}`}>
              {p.highlight && <div className="lp-plan__popular">Most Popular</div>}
              <div className={`lp-plan__color-bar ${p.color}`} />
              <div className="lp-plan__name">{p.name}</div>
              <div className="lp-plan__price">
                {p.price}
                <span className="lp-plan__period">{p.period}</span>
              </div>
              <ul className="lp-plan__features">
                {p.features.map((f) => (
                  <li key={f}>
                    <span className="lp-check">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to={p.href}
                className={`lp-btn ${p.highlight ? 'lp-btn--primary' : 'lp-btn--outline'} lp-btn--full`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECURITY BADGES ── */}
      <section className="lp-section lp-security">
        <div className="lp-section__header">
          <span className="lp-tag">Security &amp; Compliance</span>
          <h2>Built for regulated industries</h2>
          <p>
            Use strong controls, clear audit trails, and modern payment protections across the
            platform.
          </p>
        </div>
        <div className="lp-badges">
          <div className="lp-badge-card">
            <span>🔐</span>
            <strong>Role-based access</strong>
            <p>Limit sensitive actions by user type and workflow</p>
          </div>
          <div className="lp-badge-card">
            <span>🔒</span>
            <strong>PCI DSS Level 1</strong>
            <p>Highest card payment security</p>
          </div>
          <div className="lp-badge-card">
            <span>✅</span>
            <strong>SOC 2 Type II</strong>
            <p>Annual independent audits</p>
          </div>
          <div className="lp-badge-card">
            <span>🌐</span>
            <strong>GDPR Ready</strong>
            <p>EU data residency available</p>
          </div>
          <div className="lp-badge-card">
            <span>⚡</span>
            <strong>256-bit Encryption</strong>
            <p>AES-256 at rest &amp; in transit</p>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="lp-cta-banner">
        <div className="lp-cta-banner__glow" aria-hidden="true" />
        <h2>
          Ready to modernise your
          <br />
          <span className="lp-gradient-text">MedBed and checkout operations?</span>
        </h2>
        <p>
          Bring MedBed booking, secure checkout, billing, wallets, approvals, and reporting into one
          operating layer.
        </p>
        <div className="lp-hero-actions" style={{ justifyContent: 'center' }}>
          <Link to="/signup" className="lp-btn lp-btn--primary lp-btn--lg">
            Create Free Account
          </Link>
          <Link to="/contact" className="lp-btn lp-btn--ghost lp-btn--lg">
            Talk to Sales
          </Link>
        </div>
        <div className="lp-partners">
          <span className="lp-partners__label">Trusted by</span>
          {[
            'Provider teams',
            'Finance teams',
            'Operations leads',
            'Care coordinators',
            'Billing admins',
          ].map((p) => (
            <span key={p} className="lp-partner-name">
              {p}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
};
