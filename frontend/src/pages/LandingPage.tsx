import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { LiveChartBanner } from '../components/LiveChartBanner';
import '../styles.css';

const STATS = [
  { value: '12,000+', label: 'Patients Served' },
  { value: '650+', label: 'Healthcare Providers' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '$2M+', label: 'Payments Processed' },
];

const FEATURES = [
  {
    icon: '🛏️',
    title: 'MedBed Access',
    description: 'Book advanced quantum healing sessions at certified clinics worldwide. Priority scheduling included.',
    badge: 'New',
  },
  {
    icon: '💳',
    title: 'Multi-Rail Payments',
    description: 'Accept fiat, crypto, and wallet payments in one unified dashboard with instant settlement.',
    badge: null,
  },
  {
    icon: '🔐',
    title: 'HIPAA Compliance',
    description: 'End-to-end encrypted patient data with full audit trails and role-based access control.',
    badge: null,
  },
  {
    icon: '🪙',
    title: 'Crypto Wallet',
    description: 'Send and receive SOL, ETH and stablecoins. Non-custodial wallet with hardware key support.',
    badge: null,
  },
  {
    icon: '📅',
    title: 'Smart Scheduling',
    description: 'AI-assisted appointment booking with automated reminders via SMS and email.',
    badge: null,
  },
  {
    icon: '📊',
    title: 'Analytics & Reporting',
    description: 'Real-time revenue, compliance, and patient engagement dashboards for your whole organisation.',
    badge: null,
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Create Your Account',
    description: 'Sign up in minutes. Choose a patient, provider, or admin role and get instantly verified.',
  },
  {
    step: '02',
    title: 'Connect & Configure',
    description: 'Link your Stripe account or crypto wallet, set up your schedule and compliance preferences.',
  },
  {
    step: '03',
    title: 'Start Transacting',
    description: 'Book appointments, process payments and generate compliance reports — all in one place.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Dr. Sarah Chen',
    role: 'Chief Medical Officer, Quantum Health',
    avatar: '👩‍⚕️',
    quote: 'Advancia cut our billing cycle from two weeks to same-day. The HIPAA audit trails alone saved us thousands in compliance work.',
  },
  {
    name: 'Marcus Williams',
    role: 'Patient',
    avatar: '🧑',
    quote: 'Paying for my MedBed sessions with crypto is seamless. No bank delays, no hidden fees — just instant confirmations.',
  },
  {
    name: 'Priya Nair',
    role: 'Operations Director, FutureCare Inc.',
    avatar: '👩‍💼',
    quote: 'The provider dashboard gives us full visibility across 40 clinics. Advancia is the backbone of our payment infrastructure.',
  },
];

const PLANS = [
  {
    name: 'Patient',
    price: 'Free',
    period: '',
    color: 'plan-free',
    features: ['Appointment booking', 'Payment history', 'Crypto wallet', 'MedBed scheduling'],
    cta: 'Sign Up Free',
    href: '/signup',
    highlight: false,
  },
  {
    name: 'Provider',
    price: '$49',
    period: '/mo',
    color: 'plan-pro',
    features: ['Everything in Patient', 'Revenue analytics', 'SMS & email reminders', 'Stripe Connect payouts', 'Priority support'],
    cta: 'Start Free Trial',
    href: '/signup',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    color: 'plan-enterprise',
    features: ['Everything in Provider', 'Dedicated SLA', 'Custom integrations', 'HIPAA BAA included', 'Dedicated account manager'],
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
        <div className="lp-hero-inner">
          <span className="lp-eyebrow">Healthcare Payments · Reimagined</span>
          <h1 className="lp-hero-title">
            The Complete Platform for<br />
            <span className="lp-gradient-text">Modern Healthcare Finance</span>
          </h1>
          <p className="lp-hero-sub">
            One secure platform for healthcare payments, crypto wallets,
            HIPAA compliance and provider scheduling.
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
          <div className="lp-hero-card__sub">MedBed Session — Dr. Chen · just now</div>
          <div className="lp-hero-card__bar">
            <div className="lp-hero-card__bar-fill" />
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="lp-stats">
        {STATS.map(s => (
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
          <h2>Everything your practice needs</h2>
          <p>A fully integrated suite built specifically for healthcare organisations at every scale.</p>
        </div>
        <div className="lp-features-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="lp-feature-card">
              <div className="lp-feature-card__icon">{f.icon}</div>
              {f.badge && <span className="lp-badge lp-badge--new">{f.badge}</span>}
              <h3>{f.title}</h3>
              <p>{f.description}</p>
            </div>
          ))}
        </div>
        <div className="lp-center" style={{ marginTop: '2.5rem' }}>
          <Link to="/features" className="lp-btn lp-btn--outline">View All Features</Link>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="lp-section lp-how lp-how--bg">
        <div className="lp-section__header">
          <span className="lp-tag">Process</span>
          <h2>Up and running in minutes</h2>
          <p>Three simple steps to transform how your clinic handles payments and compliance.</p>
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

      {/* ── TESTIMONIALS ── */}
      <section className="lp-section lp-testimonials">
        <div className="lp-section__header">
          <span className="lp-tag">Testimonials</span>
          <h2>Loved by patients &amp; providers</h2>
        </div>
        <div className="lp-testimonials-grid">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="lp-testimonial">
              <div className="lp-testimonial__stars">★★★★★</div>
              <p className="lp-testimonial__quote">"{t.quote}"</p>
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
          <p>Start free. Scale as you grow. No hidden fees, ever.</p>
        </div>
        <div className="lp-plans-grid">
          {PLANS.map(p => (
            <div key={p.name} className={`lp-plan ${p.highlight ? 'lp-plan--highlight' : ''}`}>
              {p.highlight && <div className="lp-plan__popular">Most Popular</div>}
              <div className={`lp-plan__color-bar ${p.color}`} />
              <div className="lp-plan__name">{p.name}</div>
              <div className="lp-plan__price">
                {p.price}<span className="lp-plan__period">{p.period}</span>
              </div>
              <ul className="lp-plan__features">
                {p.features.map(f => (
                  <li key={f}><span className="lp-check">✓</span>{f}</li>
                ))}
              </ul>
              <Link to={p.href} className={`lp-btn ${p.highlight ? 'lp-btn--primary' : 'lp-btn--outline'} lp-btn--full`}>
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
          <p>We take compliance seriously so you don't have to worry about it.</p>
        </div>
        <div className="lp-badges">
          <div className="lp-badge-card"><span>🏥</span><strong>HIPAA Compliant</strong><p>Full audit trails &amp; BAA available</p></div>
          <div className="lp-badge-card"><span>🔒</span><strong>PCI DSS Level 1</strong><p>Highest card payment security</p></div>
          <div className="lp-badge-card"><span>✅</span><strong>SOC 2 Type II</strong><p>Annual independent audits</p></div>
          <div className="lp-badge-card"><span>🌐</span><strong>GDPR Ready</strong><p>EU data residency available</p></div>
          <div className="lp-badge-card"><span>⚡</span><strong>256-bit Encryption</strong><p>AES-256 at rest &amp; in transit</p></div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="lp-cta-banner">
        <div className="lp-cta-banner__glow" aria-hidden="true" />
        <h2>Ready to modernise your<br /><span className="lp-gradient-text">healthcare payments?</span></h2>
        <p>Join thousands of providers and patients already on Advancia PayLedger.</p>
        <div className="lp-hero-actions" style={{ justifyContent: 'center' }}>
          <Link to="/signup" className="lp-btn lp-btn--primary lp-btn--lg">Create Free Account</Link>
          <Link to="/faq" className="lp-btn lp-btn--ghost lp-btn--lg">Talk to Sales</Link>
        </div>
        <div className="lp-partners">
          <span className="lp-partners__label">Trusted by</span>
          {['Quantum Health', 'MediTech Global', 'FutureCare Inc.', 'NovaClinics', 'Alethea Medical'].map(p => (
            <span key={p} className="lp-partner-name">{p}</span>
          ))}
        </div>
      </section>

    </div>
  );
};
