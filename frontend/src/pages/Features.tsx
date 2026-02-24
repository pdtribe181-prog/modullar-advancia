import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles.css';

const CATEGORIES = ['All', 'Payments', 'MedBed', 'Security', 'Analytics', 'Integrations'];

const FEATURES = [
  {
    icon: '🛏️', title: 'Quantum MedBeds', category: 'MedBed',
    desc: 'Book Standard, Quantum, and Premium MedBed sessions at certified clinics worldwide. Real-time availability, online deposits, and automated post-session invoicing.',
    bullets: ['Multi-tier session types', 'Real-time slot availability', 'Automated invoicing', 'HSA/FSA receipt export'],
  },
  {
    icon: '💳', title: 'Stripe Payments', category: 'Payments',
    desc: 'Fully integrated Stripe payment intents, refunds, and subscription billing. PCI DSS Level 1 compliant with 3D Secure support.',
    bullets: ['Card, ACH & SEPA', 'Partial refunds', 'Subscription billing', '3D Secure / SCA'],
  },
  {
    icon: '🪙', title: 'Crypto Wallet', category: 'Payments',
    desc: 'Non-custodial wallet supporting ETH, BTC, SOL, USDC, and USDT. Connect MetaMask, Phantom, or any WalletConnect-compatible app.',
    bullets: ['Non-custodial', 'ETH · BTC · SOL · USDC', 'WalletConnect support', 'On-chain receipts'],
  },
  {
    icon: '🔐', title: 'HIPAA Compliance', category: 'Security',
    desc: 'AES-256 encryption at rest, TLS 1.3 in transit, full audit trails, role-based access, and BAA agreements for enterprise customers.',
    bullets: ['AES-256 encryption', 'Row-level security', 'Full audit logs', 'BAA available'],
  },
  {
    icon: '🛡️', title: 'SOC 2 & GDPR', category: 'Security',
    desc: 'Annual independent SOC 2 Type II audits. EU data residency, right-to-erasure workflows, and data processing agreements.',
    bullets: ['SOC 2 Type II', 'GDPR compliant', 'EU data residency', 'Right-to-erasure'],
  },
  {
    icon: '📅', title: 'Smart Scheduling', category: 'MedBed',
    desc: 'AI-assisted appointment booking with conflict detection, SMS and email reminders, provider calendar sync, and waitlist management.',
    bullets: ['Conflict detection', 'SMS & email reminders', 'Calendar sync', 'Waitlist management'],
  },
  {
    icon: '📊', title: 'Revenue Analytics', category: 'Analytics',
    desc: 'Real-time dashboards for revenue, refund rates, session utilisation, and payout summaries. Exportable to CSV and PDF.',
    bullets: ['Real-time dashboards', 'Payout summaries', 'Refund analytics', 'CSV & PDF export'],
  },
  {
    icon: '🔔', title: 'Smart Notifications', category: 'Analytics',
    desc: 'Customisable notification rules for payment events, appointment changes, compliance alerts, and custom webhooks.',
    bullets: ['Payment events', 'Appointment alerts', 'Compliance alerts', 'Webhook delivery'],
  },
  {
    icon: '🔗', title: 'Stripe Connect', category: 'Integrations',
    desc: 'Multi-party payment flows with automatic split payouts to providers. Supports standard, express, and custom Connect account types.',
    bullets: ['Split payouts', 'Express accounts', 'Instant transfers', 'Payout scheduling'],
  },
  {
    icon: '🌐', title: 'REST API & Webhooks', category: 'Integrations',
    desc: 'OpenAPI 3.0 documented REST API with JWT auth, idempotency keys, and signed webhooks. Client SDKs available for Node and Python.',
    bullets: ['OpenAPI 3.0 docs', 'Idempotency keys', 'Signed webhooks', 'Node & Python SDK'],
  },
  {
    icon: '📱', title: 'MFA & SSO', category: 'Security',
    desc: 'TOTP, SMS OTP, WebAuthn/FIDO2 hardware keys, and Google OAuth 2.0 SSO. Enforced MFA policies for provider and admin roles.',
    bullets: ['TOTP authenticator', 'SMS OTP', 'WebAuthn / FIDO2', 'Google SSO'],
  },
  {
    icon: '⚡', title: 'Rate Limiting & DDoS', category: 'Security',
    desc: 'Layered rate limiting via Redis / Upstash per endpoint category. Automatic IP-level blocking and Cloudflare-ready headers.',
    bullets: ['Per-endpoint limits', 'Redis-backed', 'Auto IP blocking', 'Cloudflare-ready'],
  },
];

const COMPARE_ROWS = [
  { feature: 'MedBed booking', free: true, pro: true, ent: true },
  { feature: 'Crypto wallet', free: true, pro: true, ent: true },
  { feature: 'Card payments', free: true, pro: true, ent: true },
  { feature: 'Revenue analytics', free: false, pro: true, ent: true },
  { feature: 'SMS reminders', free: false, pro: true, ent: true },
  { feature: 'Priority support', free: false, pro: true, ent: true },
  { feature: 'Stripe Connect payouts', free: false, pro: true, ent: true },
  { feature: 'Custom webhooks', free: false, pro: false, ent: true },
  { feature: 'White-label branding', free: false, pro: false, ent: true },
  { feature: 'HIPAA BAA agreement', free: false, pro: false, ent: true },
  { feature: 'Dedicated SLA', free: false, pro: false, ent: true },
];

export const Features: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = FEATURES.filter(f => activeCategory === 'All' || f.category === activeCategory);

  return (
    <div className="feat-page">

      {/* Hero */}
      <div className="feat-hero">
        <span className="lp-tag">Platform Features</span>
        <h1>Built for modern healthcare finance</h1>
        <p>Every tool your clinic needs — payments, compliance, scheduling and analytics — in one deeply integrated platform.</p>
        <div className="lp-hero-actions" style={{ justifyContent: 'center', marginTop: '1.5rem' }}>
          <Link to="/signup" className="lp-btn lp-btn--primary lp-btn--lg">Get Started Free</Link>
          <Link to="/subscriptions" className="lp-btn lp-btn--outline lp-btn--lg">View Pricing</Link>
        </div>
      </div>

      {/* Category filter */}
      <div className="feat-filter">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`faq-tab ${activeCategory === cat ? 'faq-tab--active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
            <span className="faq-tab__count">
              {cat === 'All' ? FEATURES.length : FEATURES.filter(f => f.category === cat).length}
            </span>
          </button>
        ))}
      </div>

      {/* Features grid */}
      <div className="feat-grid">
        {filtered.map(f => (
          <div key={f.title} className="feat-card">
            <div className="feat-card__icon">{f.icon}</div>
            <div className="feat-card__cat">{f.category}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
            <ul className="feat-card__bullets">
              {f.bullets.map(b => <li key={b}><span className="lp-check">✓</span>{b}</li>)}
            </ul>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="feat-compare">
        <div className="lp-section__header">
          <span className="lp-tag">Compare Plans</span>
          <h2>See what's included</h2>
        </div>
        <div className="feat-compare__wrap">
          <table className="feat-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th><span className="feat-plan-label feat-plan-label--free">Free</span></th>
                <th><span className="feat-plan-label feat-plan-label--pro">Pro</span></th>
                <th><span className="feat-plan-label feat-plan-label--ent">Enterprise</span></th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map(row => (
                <tr key={row.feature}>
                  <td>{row.feature}</td>
                  <td>{row.free ? '✅' : '—'}</td>
                  <td>{row.pro ? '✅' : '—'}</td>
                  <td>{row.ent ? '✅' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="lp-center" style={{ marginTop: '2rem' }}>
          <Link to="/subscriptions" className="lp-btn lp-btn--primary">View Full Pricing →</Link>
        </div>
      </div>

      {/* CTA */}
      <div className="feat-cta">
        <h2>Ready to transform your practice?</h2>
        <p>Start free — no credit card required. Upgrade when you're ready.</p>
        <Link to="/signup" className="lp-btn lp-btn--primary lp-btn--lg">Create Free Account</Link>
      </div>
    </div>
  );
};
