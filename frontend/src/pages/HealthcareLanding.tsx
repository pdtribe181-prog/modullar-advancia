import React from 'react';
import { SIGNUP_ORIGIN } from '../config/domains';
import '../styles.css';

export const HealthcareLanding: React.FC = () => {
  return (
    <div className="lp-root">
      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-hero-glow lp-hero-glow--a" />
        <div className="lp-hero-glow lp-hero-glow--b" />
        <div className="lp-hero-inner">
          <span className="lp-eyebrow">Advancia Healthcare Wallet</span>
          <h1 className="lp-hero-title">
            One Wallet for
            <br />
            <span className="lp-gradient-text">Health, Cards &amp; Care</span>
          </h1>
          <p className="lp-hero-sub">
            Store health cards, pay medical bills, and control who can see your records — all in a
            single secure healthcare wallet.
          </p>
          <div className="lp-hero-actions">
            <a href={`${SIGNUP_ORIGIN}/signup`} className="lp-btn lp-btn--primary lp-btn--lg">
              Get Started in PayLedger →
            </a>
            <a href="#wallet" className="lp-btn lp-btn--ghost lp-btn--lg">
              Learn How It Works
            </a>
          </div>
          <p className="lp-hero-note">Accounts and payments are powered by Advancia PayLedger.</p>
        </div>
      </section>

      {/* WALLET */}
      <section id="wallet" className="lp-section lp-features">
        <div className="lp-section__header">
          <span className="lp-tag">Wallet</span>
          <h2>Healthcare-first smart wallet</h2>
          <p>
            A simple, gasless wallet experience designed for patients and providers — no seed
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
            Share only what&apos;s needed with each provider — and revoke access any time. Every
            access is logged for your peace of mind.
          </p>
        </div>
        <div className="lp-how-grid">
          <div className="lp-how-card">
            <span className="lp-how-step">01</span>
            <h3>Create your health card</h3>
            <p>
              Add insurance, key medical details, and emergency contacts to a single digital health
              card.
            </p>
          </div>
          <div className="lp-how-card">
            <span className="lp-how-step">02</span>
            <h3>Control who can see it</h3>
            <p>
              Grant per‑provider access and choose whether they see billing only, clinical notes, or
              both.
            </p>
          </div>
          <div className="lp-how-card">
            <span className="lp-how-step">03</span>
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
            Use your wallet for one‑off invoices, co‑pays, or installment plans — with providers
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
        <div className="lp-how-grid">
          <div className="lp-how-card">
            <h3>Strong authentication</h3>
            <p>Support for passkeys, 2FA, and device‑level checks on sensitive actions.</p>
          </div>
          <div className="lp-how-card">
            <h3>Encryption &amp; logging</h3>
            <p>
              Data encrypted in transit and at rest, with detailed logs for security and compliance
              review.
            </p>
          </div>
          <div className="lp-how-card">
            <h3>Healthcare‑ready posture</h3>
            <p>
              Designed to integrate into HIPAA‑focused workflows. Formal certifications and BAAs are
              managed via Advancia PayLedger.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="lp-section lp-cta-banner">
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
          <a href={`${SIGNUP_ORIGIN}/signup`} className="lp-btn lp-btn--primary lp-btn--lg">
            Get Started in PayLedger
          </a>
          <a
            href="mailto:support@advancia-healthcare.com"
            className="lp-btn lp-btn--ghost lp-btn--lg"
          >
            Talk to Our Team
          </a>
        </div>
      </section>
    </div>
  );
};

export default HealthcareLanding;
