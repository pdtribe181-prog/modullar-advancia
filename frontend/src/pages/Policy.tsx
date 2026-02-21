import React from 'react';
import '../styles.css';

export const Policy: React.FC = () => {
  return (
    <div className="page-container policy-page">
      <h1>Privacy Policy & Terms</h1>
      <section>
        <h2>Data Privacy</h2>
        <p>We use advanced encryption to protect your medical and financial data. Your data is never sold to third parties.</p>
      </section>
      <section>
        <h2>Compliance</h2>
        <p>Advancia PayLedger is HIPAA and GDPR compliant.</p>
      </section>
      <section>
        <h2>Terms of Service</h2>
        <p>By using our platform, you agree to our terms regarding digital asset usage and healthcare bookings.</p>
      </section>
    </div>
  );
};
