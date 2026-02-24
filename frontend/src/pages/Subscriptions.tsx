import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles.css';

interface PlanFeature { text: string; included: boolean; }
interface Plan {
  name: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  period: string;
  accent: string;
  highlight: boolean;
  badge: string | null;
  desc: string;
  features: PlanFeature[];
  cta: string;
  href: string;
  ctaClass: string;
}

const PLANS: Plan[] = [
  {
    name: 'Patient Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    period: '/mo',
    accent: '#22d3ee',
    highlight: false,
    badge: null,
    desc: 'Perfect for individual patients managing personal health payments.',
    features: [
      { text: 'MedBed session booking', included: true },
      { text: 'Crypto wallet (ETH, BTC, SOL, USDC)', included: true },
      { text: 'Card & bank payments', included: true },
      { text: 'Payment history & receipts', included: true },
      { text: 'Basic appointment reminders', included: true },
      { text: 'Revenue analytics dashboard', included: false },
      { text: 'SMS reminders', included: false },
      { text: 'Priority support', included: false },
      { text: 'Custom webhook endpoints', included: false },
    ],
    cta: 'Get Started Free',
    href: '/signup',
    ctaClass: 'lp-btn--outline',
  },
  {
    name: 'Provider Pro',
    monthlyPrice: 49,
    yearlyPrice: 39,
    period: '/mo',
    accent: '#818cf8',
    highlight: true,
    badge: 'Most Popular',
    desc: 'Everything a growing clinic needs to manage patients and process payments at scale.',
    features: [
      { text: 'Everything in Patient Free', included: true },
      { text: 'Revenue & refund analytics', included: true },
      { text: 'SMS & email reminders', included: true },
      { text: 'Stripe Connect payouts', included: true },
      { text: '10% MedBed session discount', included: true },
      { text: 'Custom webhook endpoints', included: true },
      { text: 'Priority support (4 h SLA)', included: true },
      { text: 'Multi-provider roster', included: true },
      { text: 'White-label branding', included: false },
    ],
    cta: 'Start 14-Day Free Trial',
    href: '/signup',
    ctaClass: 'lp-btn--primary',
  },
  {
    name: 'Enterprise',
    monthlyPrice: null,
    yearlyPrice: null,
    period: '',
    accent: '#34d399',
    highlight: false,
    badge: null,
    desc: 'Custom contracts for hospital networks, insurance groups, and regulated entities.',
    features: [
      { text: 'Everything in Provider Pro', included: true },
      { text: 'White-label branding', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'Custom API rate limits', included: true },
      { text: 'HIPAA BAA agreement', included: true },
      { text: 'EU data residency option', included: true },
      { text: 'Guaranteed 99.9% uptime SLA', included: true },
      { text: 'SSO / SAML integration', included: true },
      { text: 'Quarterly compliance review', included: true },
    ],
    cta: 'Contact Sales',
    href: '/faq',
    ctaClass: 'lp-btn--outline',
  },
];

const FAQS = [
  { q: 'Is there a free trial for Pro?', a: 'Yes — Provider Pro includes a 14-day free trial. No credit card required to start.' },
  { q: 'Can I switch plans mid-cycle?', a: 'Yes. Upgrades take effect immediately and are prorated. Downgrades take effect at the end of the billing period.' },
  { q: 'What payment methods are accepted for subscriptions?', a: 'Visa, Mastercard, Amex, and bank transfers. Crypto payment for subscriptions is coming in Q2 2026.' },
  { q: 'Is there a minimum contract for Enterprise?', a: 'Enterprise agreements are typically annual. Month-to-month is available at a 20% premium.' },
];

export const Subscriptions: React.FC = () => {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="sub-page">

      {/* Hero */}
      <div className="sub-hero">
        <span className="lp-tag">Pricing</span>
        <h1>Simple, transparent pricing</h1>
        <p>Start free. Upgrade as your practice grows. No hidden fees — ever.</p>

        {/* Annual toggle */}
        <div className="sub-toggle">
          <span className={!annual ? 'sub-toggle__label--active' : 'sub-toggle__label'}>Monthly</span>
          <button
            className={`sub-toggle__btn${annual ? ' sub-toggle__btn--on' : ''}`}
            onClick={() => setAnnual(a => !a)}
            aria-label="Toggle annual billing"
          >
            <span className="sub-toggle__knob" />
          </button>
          <span className={annual ? 'sub-toggle__label--active' : 'sub-toggle__label'}>
            Annual <span className="sub-save-badge">Save 20%</span>
          </span>
        </div>
      </div>

      {/* Plans */}
      <div className="sub-plans">
        {PLANS.map(plan => (
          <div key={plan.name} className={`sub-plan${plan.highlight ? ' sub-plan--highlight' : ''}`} style={{ '--plan-accent': plan.accent } as React.CSSProperties}>
            <div className="sub-plan__bar" />
            {plan.badge && <div className="sub-plan__badge">{plan.badge}</div>}
            <div className="sub-plan__name">{plan.name}</div>
            <div className="sub-plan__price">
              {plan.monthlyPrice === null ? (
                <span className="sub-plan__custom">Custom</span>
              ) : plan.monthlyPrice === 0 ? (
                <span className="sub-plan__amount">Free</span>
              ) : (
                <>
                  <span className="sub-plan__amount">${annual ? plan.yearlyPrice : plan.monthlyPrice}</span>
                  <span className="sub-plan__period">{plan.period}</span>
                </>
              )}
            </div>
            {annual && plan.monthlyPrice !== null && plan.monthlyPrice > 0 && (
              <p className="sub-plan__saving">
                Billed ${((plan.yearlyPrice ?? 0) * 12).toLocaleString()}/yr &middot; Save ${((plan.monthlyPrice - (plan.yearlyPrice ?? 0)) * 12)}/yr
              </p>
            )}
            <p className="sub-plan__desc">{plan.desc}</p>
            <ul className="sub-plan__features">
              {plan.features.map(f => (
                <li key={f.text} className={`sub-plan__feature${f.included ? '' : ' sub-plan__feature--no'}`}>
                  <span>{f.included ? '✅' : '—'}</span>{f.text}
                </li>
              ))}
            </ul>
            <Link to={plan.href} className={`lp-btn ${plan.ctaClass} sub-plan__cta`}>{plan.cta}</Link>
          </div>
        ))}
      </div>

      {/* Trust bar */}
      <div className="sub-trust">
        <span>🔒 PCI DSS Level 1</span>
        <span>🏥 HIPAA Compliant</span>
        <span>↩️ Cancel anytime</span>
        <span>🌐 GDPR Ready</span>
        <span>⚡ 99.9% Uptime SLA</span>
      </div>

      {/* Billing FAQ */}
      <div className="sub-faq-section">
        <div className="lp-section__header">
          <span className="lp-tag">FAQ</span>
          <h2>Common billing questions</h2>
        </div>
        <div className="sub-faq-list">
          {FAQS.map((f, i) => (
            <div key={i} className={`faq-item${openFaq === i ? ' faq-item--open' : ''}`}>
              <button className="faq-item__question" onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}>
                <span className="faq-item__q-text">{f.q}</span>
                <span className="faq-item__chevron">{openFaq === i ? '−' : '+'}</span>
              </button>
              <div className={`faq-item__answer${openFaq === i ? ' faq-item__answer--open' : ''}`}>
                <p>{f.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="feat-cta">
        <h2>Not sure which plan fits your practice?</h2>
        <p>Talk to our team — we'll recommend the best fit based on your patient volume and workflow.</p>
        <Link to="/faq" className="lp-btn lp-btn--primary lp-btn--lg">Talk to Sales</Link>
      </div>

    </div>
  );
};
