import { Link } from 'react-router-dom';

export function Home() {
  return (
    <div className="home-page">
      <section className="hero">
        <h1>Secure Healthcare Payments</h1>
        <p>Pay your medical bills safely and securely online.</p>
        <div className="hero-actions">
          <Link to="/payment" className="btn btn-primary">
            Make a Payment
          </Link>
          <Link to="/login" className="btn btn-secondary">
            Patient Portal
          </Link>
        </div>
      </section>

      <section className="features">
        <div className="feature">
          <h3>🔒 Secure</h3>
          <p>Bank-level encryption and PCI-compliant payment processing</p>
        </div>
        <div className="feature">
          <h3>💳 Multiple Options</h3>
          <p>Pay with credit card, debit card, or bank transfer</p>
        </div>
        <div className="feature">
          <h3>📱 Mobile Friendly</h3>
          <p>Pay from any device, anytime, anywhere</p>
        </div>
        <div className="feature">
          <h3>🧾 Instant Receipts</h3>
          <p>Get email confirmation and downloadable receipts</p>
        </div>
      </section>
    </div>
  );
}
