import React from 'react';
import '../styles.css';

export const Subscriptions: React.FC = () => {
  return (
    <div className="page-container">
      <h1>Choose your Plan</h1>
      <div className="pricing-grid">
        <div className="pricing-card">
          <h2>Basic</h2>
          <p className="price">$0/mo</p>
          <ul>
            <li>Pay-as-you-go MedBed Usage</li>
            <li>Standard Support</li>
            <li>Basic Wallet Features</li>
          </ul>
          <button className="btn btn-primary">Select Basic</button>
        </div>
        <div className="pricing-card featured">
          <h2>Pro</h2>
          <p className="price">$29/mo</p>
          <ul>
            <li>10% Discount on MedBed</li>
            <li>Priority Support</li>
            <li>Advanced Crypto Analytics</li>
          </ul>
          <button className="btn btn-primary">Select Pro</button>
        </div>
        <div className="pricing-card">
          <h2>Enterprise</h2>
          <p className="price">Custom</p>
          <ul>
            <li>Unlimited Access</li>
            <li>Dedicated Account Manager</li>
            <li>White-label Wallet Solution</li>
          </ul>
          <button className="btn btn-secondary">Contact Sales</button>
        </div>
      </div>
    </div>
  );
};
