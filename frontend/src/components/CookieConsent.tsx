import React, { useState } from 'react';
import '../styles.css';

export const CookieConsent: React.FC = () => {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="cookie-banner">
      <p>We use cookies to enhance your experience and secure your payments.</p>
      <div className="cookie-actions">
        <button onClick={() => setVisible(false)} className="btn btn-sm btn-primary">Accept All</button>
        <button onClick={() => setVisible(false)} className="btn btn-sm btn-outline">Reject</button>
      </div>
    </div>
  );
};
