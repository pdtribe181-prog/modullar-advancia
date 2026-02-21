import React from 'react';
import '../styles.css';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "How do I book a MedBed session?",
    answer: "You can book a session through your dashboard by navigating to the 'Appointments' tab and selecting 'Book New Session'. Choose your preferred MedBed type and time slot."
  },
  {
    question: "What cryptocurrencies do you accept?",
    answer: "We currently accept Ethereum (ETH), Bitcoin (BTC), USDC, and our native text tokens. We are constantly expanding our supported assets."
  },
  {
    question: "Is my medical data secure?",
    answer: "Yes, we use military-grade encryption and strictly adhere to HIPAA and GDPR regulations. Your data is stored on secure, decentralized encrypted storage."
  },
  {
    question: "How does the Crypto Wallet work?",
    answer: "Our built-in non-custodial wallet allows you to manage your assets directly. You can connect your existing MetaMask or create a new wallet to pay for services instantly."
  },
  {
    question: "Can I cancel my subscription?",
    answer: "Yes, you can cancel or downgrade your subscription plan at any time from the 'Settings' menu in your dashboard."
  }
];

export const FAQ: React.FC = () => {
  return (
    <div className="page-container">
      <h1>Frequently Asked Questions</h1>
      <div className="faq-container">
        {faqs.map((faq, index) => (
          <div key={index} className="faq-item">
            <h3>{faq.question}</h3>
            <p>{faq.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
