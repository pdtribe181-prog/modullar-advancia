import React from 'react';
import { Link } from 'react-router-dom';
import '../styles.css';

export const LandingPage: React.FC = () => {
  return (
    <div className="landing-container">
      <header className="hero-section">
        <div className="hero-content">
          <h1>Advancia PayLedger</h1>
          <p className="hero-subtitle">The Future of Healthcare Payments & MedBed Access</p>
          <div className="cta-buttons">
            <Link to="/features" className="btn btn-primary">Explore Features</Link>
            <Link to="/subscriptions" className="btn btn-secondary">Get Started</Link>
          </div>
        </div>
      </header>

      <section className="features-preview">
        <div className="feature-card">
          <h3>MedBed Access</h3>
          <p>Book advanced healing sessions with quantum technology.</p>
        </div>
        <div className="feature-card">
          <h3>Crypto Payments</h3>
          <p>Secure, instant transactions with minimal fees.</p>
        </div>
        <div className="feature-card">
          <h3>Healthcare Compliance</h3>
          <p>HIPAA-compliant data handling and privacy.</p>
        </div>
      </section>

      <section className="trust-section">
        <h2>Trusted by Leading Healthcare Providers</h2>
        <div className="partners-grid">
          {/* Add partner logos here */}
          <span>Quantum Health</span>
          <span>MediTech Global</span>
          <span>FutureCare Inc.</span>
        </div>
        <div style={{ marginTop: '40px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
          <Link to="/faq" className="btn btn-secondary">Read FAQ</Link>
          <Link to="/wallet-tools" className="btn btn-primary">Open Crypto Wallet</Link>
        </div>
      </section>
    </div>
  );
};
