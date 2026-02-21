import React from 'react';
import '../styles.css';

export const Features: React.FC = () => {
  return (
    <div className="page-container">
      <h1>Advancia Features</h1>
      <div className="features-grid">
        <div className="feature-item">
          <h2>Quantum MedBeds</h2>
          <p>State-of-the-art healing chambers available for booking.</p>
        </div>
        <div className="feature-item">
          <h2>Secure Crypto Wallet</h2>
          <p>Send and receive payments globally with instant settlement.</p>
        </div>
        <div className="feature-item">
          <h2>Smart Contracts</h2>
          <p>Automated payment logic for healthcare providers.</p>
        </div>
        <div className="feature-item">
          <h2>Privacy First</h2>
          <p>Your health data is encrypted and user-controlled.</p>
        </div>
      </div>
    </div>
  );
};
