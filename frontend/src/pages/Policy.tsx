import React, { useState } from 'react';
import '../styles.css';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'data-collection', label: 'Data We Collect' },
  { id: 'data-use', label: 'How We Use Data' },
  { id: 'cookies', label: 'Cookies & Tracking' },
  { id: 'sharing', label: 'Data Sharing' },
  { id: 'rights', label: 'Your Rights' },
  { id: 'hipaa', label: 'HIPAA Compliance' },
  { id: 'gdpr', label: 'GDPR' },
  { id: 'security', label: 'Security' },
  { id: 'terms', label: 'Terms of Service' },
  { id: 'contact', label: 'Contact Us' },
];

export const Policy: React.FC = () => {
  const [activeSection, setActiveSection] = useState('overview');

  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="pol-page">

      {/* Hero */}
      <div className="pol-hero">
        <span className="lp-tag">Legal</span>
        <h1>Privacy Policy &amp; Terms</h1>
        <p>Last updated: <strong>February 23, 2026</strong> &middot; Effective immediately</p>
        <div className="pol-badges">
          <span>🏥 HIPAA Compliant</span>
          <span>🌐 GDPR Ready</span>
          <span>🔒 PCI DSS Level 1</span>
          <span>✅ SOC 2 Type II</span>
        </div>
      </div>

      <div className="pol-layout">

        {/* Sticky TOC */}
        <aside className="pol-toc">
          <p className="pol-toc__title">Contents</p>
          <nav>
            {SECTIONS.map(s => (
              <button
                key={s.id}
                className={`pol-toc__link${activeSection === s.id ? ' pol-toc__link--active' : ''}`}
                onClick={() => scrollTo(s.id)}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Body */}
        <div className="pol-body">

          <section id="overview">
            <h2>Overview</h2>
            <p>Advancia PayLedger, Inc. ("Advancia", "we", "our") operates the healthcare payment and MedBed scheduling platform available at <strong>advanciapayledger.com</strong>. This Privacy Policy explains what personal data we collect, how we use and protect it, and the rights you hold as a user or patient.</p>
            <p>By accessing or using our platform you agree to this policy. If you do not agree, please discontinue use immediately.</p>
          </section>

          <section id="data-collection">
            <h2>Data We Collect</h2>
            <div className="pol-table-wrap">
              <table className="pol-table">
                <thead><tr><th>Category</th><th>Examples</th><th>Required?</th></tr></thead>
                <tbody>
                  <tr><td>Identity</td><td>Name, date of birth, government ID</td><td>Yes</td></tr>
                  <tr><td>Contact</td><td>Email address, phone number</td><td>Yes</td></tr>
                  <tr><td>Health</td><td>Appointment records, MedBed session notes</td><td>Conditional</td></tr>
                  <tr><td>Financial</td><td>Payment method (tokenised), billing address</td><td>Yes</td></tr>
                  <tr><td>Technical</td><td>IP address, browser, device identifiers</td><td>Automatic</td></tr>
                  <tr><td>Usage</td><td>Pages visited, features used, click events</td><td>Automatic</td></tr>
                  <tr><td>Communications</td><td>Support tickets, email exchanges</td><td>When provided</td></tr>
                </tbody>
              </table>
            </div>
            <p>We <strong>never</strong> store raw card numbers. All card data is tokenised by Stripe and subject to PCI DSS standards.</p>
          </section>

          <section id="data-use">
            <h2>How We Use Data</h2>
            <ul className="pol-list">
              <li><strong>Service delivery</strong> — processing payments, booking appointments, sending invoices.</li>
              <li><strong>Compliance</strong> — meeting HIPAA, GDPR, PCI DSS, and AML obligations.</li>
              <li><strong>Security</strong> — fraud detection, rate limiting, audit trail generation.</li>
              <li><strong>Improvement</strong> — analysing aggregated usage to enhance features (never individual health data).</li>
              <li><strong>Communication</strong> — transactional emails, appointment reminders, security alerts. Marketing emails only with explicit opt-in.</li>
            </ul>
            <div className="pol-callout pol-callout--info">
              <span>ℹ️</span>
              <p>We never use health or financial data to train AI/ML models without explicit, written consent.</p>
            </div>
          </section>

          <section id="cookies">
            <h2>Cookies &amp; Tracking</h2>
            <p>We use cookies and similar technologies for the following purposes:</p>
            <div className="pol-table-wrap">
              <table className="pol-table">
                <thead><tr><th>Cookie Type</th><th>Purpose</th><th>Duration</th><th>Can Opt Out?</th></tr></thead>
                <tbody>
                  <tr><td>Strictly Necessary</td><td>Session auth, CSRF protection</td><td>Session</td><td>No — required for platform to function</td></tr>
                  <tr><td>Analytics</td><td>Page views, feature usage (Sentry)</td><td>30 days</td><td>Yes — via cookie banner</td></tr>
                  <tr><td>Preference</td><td>Language, theme, notification settings</td><td>1 year</td><td>Yes</td></tr>
                  <tr><td>Marketing</td><td>Ad conversion tracking (opt-in only)</td><td>90 days</td><td>Yes — must opt in</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="sharing">
            <h2>Data Sharing</h2>
            <p>We share data only with:</p>
            <ul className="pol-list">
              <li><strong>Stripe</strong> — payment processing (PCI DSS Level 1).</li>
              <li><strong>Supabase</strong> — database hosting (EU and US regions).</li>
              <li><strong>Resend / Twilio</strong> — transactional email and SMS delivery.</li>
              <li><strong>Sentry</strong> — anonymised error telemetry (no health data).</li>
              <li><strong>Your treating provider</strong> — appointment and session data, only with your consent.</li>
              <li><strong>Regulators</strong> — when legally required (e.g. court orders, HIPAA audits).</li>
            </ul>
            <div className="pol-callout pol-callout--warn">
              <span>⚠️</span>
              <p>We will never sell, rent, or trade your personal data to third parties for commercial gain.</p>
            </div>
          </section>

          <section id="rights">
            <h2>Your Rights</h2>
            <div className="pol-rights-grid">
              {[
                { icon: '🔍', right: 'Access', desc: 'Request a copy of all personal data we hold about you.' },
                { icon: '✏️', right: 'Rectification', desc: 'Correct inaccurate or incomplete data at any time.' },
                { icon: '🗑️', right: 'Erasure', desc: 'Request deletion of your data (subject to legal retention rules).' },
                { icon: '📦', right: 'Portability', desc: 'Receive your data in a structured, machine-readable format.' },
                { icon: '🚫', right: 'Objection', desc: 'Opt out of processing for marketing or profiling purposes.' },
                { icon: '⏸️', right: 'Restriction', desc: 'Restrict how we process your data while a dispute is resolved.' },
              ].map(r => (
                <div key={r.right} className="pol-right-card">
                  <span>{r.icon}</span>
                  <strong>{r.right}</strong>
                  <p>{r.desc}</p>
                </div>
              ))}
            </div>
            <p>To exercise any right, email <a href="mailto:privacy@advanciapayledger.com">privacy@advanciapayledger.com</a>. We respond within 30 days.</p>
          </section>

          <section id="hipaa">
            <h2>HIPAA Compliance</h2>
            <p>Advancia PayLedger qualifies as a Business Associate under HIPAA. We maintain:</p>
            <ul className="pol-list">
              <li>Signed Business Associate Agreements (BAA) with covered-entity customers.</li>
              <li>Technical safeguards: AES-256 encryption, access logging, automatic session timeouts.</li>
              <li>Physical safeguards: SOC 2 certified data centres with physical access controls.</li>
              <li>Administrative safeguards: role-based access, workforce training, incident response plans.</li>
            </ul>
            <p>In the event of a PHI breach, we will notify affected parties within 60 days as required by the HIPAA Breach Notification Rule.</p>
          </section>

          <section id="gdpr">
            <h2>GDPR</h2>
            <p>For users in the EEA and UK, processing is carried out under the following lawful bases:</p>
            <ul className="pol-list">
              <li><strong>Contract</strong> — processing necessary to deliver the service you signed up for.</li>
              <li><strong>Legal obligation</strong> — compliance with financial and healthcare regulations.</li>
              <li><strong>Legitimate interests</strong> — fraud prevention, platform security.</li>
              <li><strong>Consent</strong> — marketing emails, analytics cookies (freely given and withdrawable).</li>
            </ul>
            <p>Our EU representative is reachable at <a href="mailto:gdpr@advanciapayledger.com">gdpr@advanciapayledger.com</a>.</p>
          </section>

          <section id="security">
            <h2>Security</h2>
            <ul className="pol-list">
              <li>All data encrypted at rest (AES-256) and in transit (TLS 1.3).</li>
              <li>Passwords stored as bcrypt hashes — never in plain text.</li>
              <li>Row-level security in Supabase — every query scoped to the authenticated user.</li>
              <li>CSRF tokens on all mutating requests.</li>
              <li>Rate limiting and automatic IP blocking via Redis.</li>
              <li>Continuous monitoring and real-time alerting via Sentry.</li>
            </ul>
            <p>To report a vulnerability, email <a href="mailto:security@advanciapayledger.com">security@advanciapayledger.com</a>. We aim to respond within 24 hours.</p>
          </section>

          <section id="terms">
            <h2>Terms of Service</h2>
            <h3>Eligibility</h3>
            <p>You must be at least 18 years old and possess the legal authority to enter into binding agreements in your jurisdiction.</p>
            <h3>Acceptable Use</h3>
            <ul className="pol-list">
              <li>You may not use the platform to process fraudulent transactions or falsify medical records.</li>
              <li>Crypto payments must comply with applicable AML/KYC regulations in your country.</li>
              <li>API rate limits must be respected; automated scraping is prohibited.</li>
            </ul>
            <h3>Limitation of Liability</h3>
            <p>Advancia PayLedger is not liable for losses arising from third-party service outages (Stripe, blockchain networks), user error, or force majeure events. Our maximum liability is limited to fees paid in the 30 days preceding the claim.</p>
            <h3>Governing Law</h3>
            <p>These terms are governed by the laws of the State of Delaware, USA, without regard to conflict-of-law provisions.</p>
          </section>

          <section id="contact">
            <h2>Contact Us</h2>
            <div className="pol-contact-grid">
              <div className="pol-contact-card"><span>✉️</span><strong>General</strong><a href="mailto:hello@advanciapayledger.com">hello@advanciapayledger.com</a></div>
              <div className="pol-contact-card"><span>🔒</span><strong>Privacy</strong><a href="mailto:privacy@advanciapayledger.com">privacy@advanciapayledger.com</a></div>
              <div className="pol-contact-card"><span>🛡️</span><strong>Security</strong><a href="mailto:security@advanciapayledger.com">security@advanciapayledger.com</a></div>
              <div className="pol-contact-card"><span>⚖️</span><strong>GDPR / DPO</strong><a href="mailto:gdpr@advanciapayledger.com">gdpr@advanciapayledger.com</a></div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};
