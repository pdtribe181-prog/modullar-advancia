import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import '../styles.css';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const ALL_FAQS: FAQItem[] = [
  // Payments
  {
    category: 'Payments',
    question: 'What payment methods are accepted?',
    answer:
      'Advancia PayLedger supports Visa, Mastercard, American Express, bank transfers (ACH/SEPA), and cryptocurrency payments including ETH, USDC, SOL, and BTC via our built-in non-custodial wallet.',
  },
  {
    category: 'Payments',
    question: 'Is there a minimum or maximum payment amount?',
    answer:
      'The minimum payment is $0.50. There is no hard maximum, though very large transactions may require additional verification for compliance purposes.',
  },
  {
    category: 'Payments',
    question: 'How do refunds work?',
    answer:
      'Refund requests can be submitted from your Payment History page within 30 days of the original charge. Refunds are processed back to the original payment method and typically settle within 5–10 business days.',
  },
  {
    category: 'Payments',
    question: 'Are there any transaction fees?',
    answer:
      'Card payments incur a 2.9% + $0.30 Stripe fee. Crypto payments have near-zero fees — only the standard network gas cost. ACH/bank transfers are free for amounts over $500.',
  },
  {
    category: 'Payments',
    question: 'Can providers receive payouts directly?',
    answer:
      'Yes. Providers connect their Stripe account via Stripe Connect. Payouts are automatically split and settled to the provider\'s bank account on a configurable schedule (daily, weekly, or monthly).',
  },
  // MedBed & Appointments
  {
    category: 'MedBed & Appointments',
    question: 'How do I book a MedBed session?',
    answer:
      'Navigate to the Appointments tab in your dashboard and click "Book New Session". Select the MedBed type (Standard, Quantum, or Premium), choose a provider and time slot, then confirm and pay in one step.',
  },
  {
    category: 'MedBed & Appointments',
    question: 'Can I cancel or reschedule an appointment?',
    answer:
      'Yes. Cancellations made more than 24 hours in advance are fully refunded. Rescheduling is free at any time before the session starts. Last-minute cancellations (under 24 h) may incur a 20% fee.',
  },
  {
    category: 'MedBed & Appointments',
    question: 'What are the different MedBed tiers?',
    answer:
      'Standard MedBeds cover general wellness and recovery protocols. Quantum MedBeds add bioresonance and frequency therapy. Premium suites include full-body scans, personalised AI health reports, and private attendants.',
  },
  {
    category: 'MedBed & Appointments',
    question: 'Do I need an insurance referral?',
    answer:
      'Insurance referrals are not required, though some insurers may partially reimburse sessions. We provide itemised receipts suitable for HSA/FSA claims and insurance pre-authorisation requests.',
  },
  // Crypto Wallet
  {
    category: 'Crypto Wallet',
    question: 'What cryptocurrencies do you support?',
    answer:
      'We currently support Ethereum (ETH), Bitcoin (BTC), Solana (SOL), USDC, and USDT. Additional assets are added regularly — check the wallet settings for the current list.',
  },
  {
    category: 'Crypto Wallet',
    question: 'Is the wallet custodial or non-custodial?',
    answer:
      'The built-in wallet is non-custodial — you hold your own private keys. You can also connect an external wallet such as MetaMask, Phantom, or any WalletConnect-compatible app.',
  },
  {
    category: 'Crypto Wallet',
    question: 'Are crypto transactions reversible?',
    answer:
      'Blockchain transactions are irreversible once confirmed. Always verify the recipient address before sending. In the event of a double-charge or dispute, our team can coordinate a manual refund via stablecoin.',
  },
  // Security & Privacy
  {
    category: 'Security & Privacy',
    question: 'Is my medical data secure?',
    answer:
      'All patient data is encrypted at rest (AES-256) and in transit (TLS 1.3). We are fully HIPAA compliant and GDPR ready. Business Associate Agreements (BAA) are available for enterprise customers.',
  },
  {
    category: 'Security & Privacy',
    question: 'Do you sell or share patient data?',
    answer:
      'Never. Patient data is never sold, rented, or shared with third parties for marketing purposes. Data is only shared with your treating provider and only with your explicit consent.',
  },
  {
    category: 'Security & Privacy',
    question: 'How is two-factor authentication set up?',
    answer:
      'Visit your Security Settings page to enable TOTP-based MFA or SMS OTP. We strongly recommend enabling MFA for all accounts. Hardware security keys (WebAuthn/FIDO2) are also supported.',
  },
  {
    category: 'Security & Privacy',
    question: 'What certifications does Advancia hold?',
    answer:
      'We are HIPAA Compliant, PCI DSS Level 1, SOC 2 Type II certified, and GDPR ready. Certification documentation is available to enterprise customers upon request.',
  },
  // Account & Billing
  {
    category: 'Account & Billing',
    question: 'Can I cancel my subscription at any time?',
    answer:
      'Yes. You can downgrade or cancel from the Subscriptions page in your dashboard. Cancellation takes effect at the end of the current billing period — you will not be charged again.',
  },
  {
    category: 'Account & Billing',
    question: 'What happens to my data if I delete my account?',
    answer:
      'Upon account deletion, personal data is anonymised within 30 days in line with GDPR. Medical records required for legal retention periods (typically 7 years) are stored in compliance-only read-only form.',
  },
  {
    category: 'Account & Billing',
    question: 'Can I have multiple accounts or roles?',
    answer:
      'Each email address corresponds to one account. Your account can hold multiple roles — for example, a clinician can simultaneously have a patient profile. Contact support to add roles to your account.',
  },
];

const CATEGORIES = ['All', ...Array.from(new Set(ALL_FAQS.map(f => f.category)))];

export const FAQ: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_FAQS.filter(f => {
      const matchCat = activeCategory === 'All' || f.category === activeCategory;
      const matchQ =
        !q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [activeCategory, query]);

  const toggle = (i: number) => setOpenIndex(prev => (prev === i ? null : i));

  return (
    <div className="faq-page">
      {/* Hero */}
      <div className="faq-hero">
        <span className="lp-tag">Support</span>
        <h1>Frequently Asked Questions</h1>
        <p>Everything you need to know about Advancia PayLedger. Can't find an answer? <Link to="/faq">Contact support →</Link></p>

        <div className="faq-search-wrap">
          <span className="faq-search-icon">🔍</span>
          <input
            className="faq-search"
            type="search"
            placeholder="Search questions…"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpenIndex(null); }}
            aria-label="Search FAQ"
          />
          {query && (
            <button className="faq-search-clear" onClick={() => setQuery('')} aria-label="Clear search">✕</button>
          )}
        </div>
      </div>

      <div className="faq-body">
        {/* Category Tabs */}
        <div className="faq-tabs" role="tablist">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              role="tab"
              aria-selected={activeCategory === cat}
              className={`faq-tab ${activeCategory === cat ? 'faq-tab--active' : ''}`}
              onClick={() => { setActiveCategory(cat); setOpenIndex(null); }}
            >
              {cat}
              <span className="faq-tab__count">
                {cat === 'All' ? ALL_FAQS.length : ALL_FAQS.filter(f => f.category === cat).length}
              </span>
            </button>
          ))}
        </div>

        {/* Accordion */}
        <div className="faq-list" role="list">
          {filtered.length === 0 ? (
            <div className="faq-empty">
              <span>🔭</span>
              <p>No results for "<strong>{query}</strong>"</p>
              <button className="lp-btn lp-btn--outline" onClick={() => { setQuery(''); setActiveCategory('All'); }}>
                Clear filters
              </button>
            </div>
          ) : (
            filtered.map((faq, i) => (
              <div
                key={i}
                className={`faq-item ${openIndex === i ? 'faq-item--open' : ''}`}
                role="listitem"
              >
                <button
                  className="faq-item__question"
                  onClick={() => toggle(i)}
                  aria-expanded={openIndex === i}
                >
                  <span className="faq-item__q-text">{faq.question}</span>
                  <span className="faq-item__category-pill">{faq.category}</span>
                  <span className="faq-item__chevron" aria-hidden="true">
                    {openIndex === i ? '−' : '+'}
                  </span>
                </button>
                <div className={`faq-item__answer ${openIndex === i ? 'faq-item__answer--open' : ''}`}>
                  <p>{faq.answer}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Result count */}
        {filtered.length > 0 && (
          <p className="faq-results-count">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>
        )}
      </div>

      {/* Contact CTA */}
      <div className="faq-contact">
        <div className="faq-contact__card">
          <span>💬</span>
          <h3>Still have questions?</h3>
          <p>Our support team is available Monday–Friday, 9 am–6 pm EST.</p>
          <a href="mailto:support@advanciapayledger.com" className="lp-btn lp-btn--primary">Email Support</a>
        </div>
        <div className="faq-contact__card">
          <span>📖</span>
          <h3>Developer Docs</h3>
          <p>Integrate our API into your clinic management system.</p>
          <Link to="/features" className="lp-btn lp-btn--outline">View API Docs</Link>
        </div>
        <div className="faq-contact__card">
          <span>🚀</span>
          <h3>Get Started Now</h3>
          <p>Create a free account and explore all features risk-free.</p>
          <Link to="/signup" className="lp-btn lp-btn--primary">Sign Up Free</Link>
        </div>
      </div>
    </div>
  );
};
