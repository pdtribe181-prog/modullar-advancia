import React, { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import '../styles.css';

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg)',
  padding: '120px 24px 80px',
};

const containerStyle: CSSProperties = {
  maxWidth: '800px',
  margin: '0 auto',
};

const headerStyle: CSSProperties = {
  textAlign: 'center',
  marginBottom: '48px',
};

const tagStyle: CSSProperties = {
  display: 'inline-block',
  padding: '6px 16px',
  borderRadius: '100px',
  background: 'rgba(96, 128, 245, 0.15)',
  color: 'var(--primary)',
  fontSize: '13px',
  fontWeight: 600,
  marginBottom: '16px',
  letterSpacing: '0.5px',
};

const titleStyle: CSSProperties = {
  fontSize: 'clamp(32px, 5vw, 42px)',
  fontWeight: 800,
  color: '#ffffff',
  marginBottom: '16px',
};

const lastUpdatedStyle: CSSProperties = {
  fontSize: '14px',
  color: 'rgba(255,255,255,0.5)',
};

const sectionStyle: CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: '16px',
  padding: '32px',
  marginBottom: '24px',
  border: '1px solid rgba(255,255,255,0.06)',
};

const sectionTitleStyle: CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  color: '#ffffff',
  marginBottom: '16px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const sectionNumStyle: CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  background: 'rgba(96, 128, 245, 0.15)',
  color: 'var(--primary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '14px',
  fontWeight: 700,
  flexShrink: 0,
};

const textStyle: CSSProperties = {
  fontSize: '15px',
  color: 'rgba(255,255,255,0.7)',
  lineHeight: 1.8,
  marginBottom: '16px',
};

const listStyle: CSSProperties = {
  margin: '16px 0',
  paddingLeft: '24px',
};

const listItemStyle: CSSProperties = {
  fontSize: '15px',
  color: 'rgba(255,255,255,0.7)',
  lineHeight: 1.8,
  marginBottom: '8px',
};

const highlightBoxStyle: CSSProperties = {
  background: 'rgba(245, 158, 11, 0.1)',
  border: '1px solid rgba(245, 158, 11, 0.2)',
  borderRadius: '10px',
  padding: '16px 20px',
  marginTop: '16px',
};

const highlightTextStyle: CSSProperties = {
  fontSize: '14px',
  color: '#f59e0b',
  fontWeight: 500,
  lineHeight: 1.6,
};

const linkStyle: CSSProperties = {
  color: 'var(--primary)',
  textDecoration: 'none',
};

const tocStyle: CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: '16px',
  padding: '24px 32px',
  marginBottom: '32px',
  border: '1px solid rgba(255,255,255,0.06)',
};

const tocTitleStyle: CSSProperties = {
  fontSize: '16px',
  fontWeight: 700,
  color: '#ffffff',
  marginBottom: '16px',
};

const tocListStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '8px',
};

const tocLinkStyle: CSSProperties = {
  fontSize: '14px',
  color: 'rgba(255,255,255,0.6)',
  textDecoration: 'none',
  padding: '6px 0',
  transition: 'color 0.2s',
};

const footerStyle: CSSProperties = {
  textAlign: 'center',
  padding: '32px',
  background: 'var(--bg-card)',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.06)',
};

const footerTextStyle: CSSProperties = {
  fontSize: '14px',
  color: 'rgba(255,255,255,0.5)',
  marginBottom: '16px',
};

export const TermsOfService: React.FC = () => {
  const sections = [
    {
      id: 'acceptance',
      title: 'Acceptance of Terms',
      content: (
        <>
          <p style={textStyle}>
            By accessing or using Advancia PayLedger ("Service"), you agree to be bound by these Terms of Service ("Terms").
            If you disagree with any part of the terms, you may not access the Service.
          </p>
          <p style={textStyle}>
            These Terms apply to all visitors, users, and others who access or use the Service, including patients,
            healthcare providers, administrators, and enterprise clients.
          </p>
        </>
      ),
    },
    {
      id: 'eligibility',
      title: 'Eligibility',
      content: (
        <>
          <p style={textStyle}>You must meet the following requirements to use our Service:</p>
          <ul style={listStyle}>
            <li style={listItemStyle}>Be at least 18 years old or the age of majority in your jurisdiction</li>
            <li style={listItemStyle}>Have the legal capacity to enter into a binding agreement</li>
            <li style={listItemStyle}>Not be prohibited from using the Service under applicable laws</li>
            <li style={listItemStyle}>Provide accurate and complete registration information</li>
          </ul>
          <p style={textStyle}>
            Healthcare providers must additionally maintain valid licensure and comply with all applicable healthcare
            regulations in their jurisdiction.
          </p>
        </>
      ),
    },
    {
      id: 'accounts',
      title: 'User Accounts',
      content: (
        <>
          <p style={textStyle}>
            When you create an account with us, you must provide accurate, complete, and current information.
            Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account.
          </p>
          <p style={textStyle}>You are responsible for:</p>
          <ul style={listStyle}>
            <li style={listItemStyle}>Safegrading your account password and any authentication credentials</li>
            <li style={listItemStyle}>All activities that occur under your account</li>
            <li style={listItemStyle}>Notifying us immediately of any unauthorized access or security breach</li>
            <li style={listItemStyle}>Ensuring your account information remains accurate and up-to-date</li>
          </ul>
          <div style={highlightBoxStyle}>
            <p style={highlightTextStyle}>
              ⚠️ We strongly recommend enabling two-factor authentication (2FA) for enhanced account security,
              especially for accounts with administrative privileges.
            </p>
          </div>
        </>
      ),
    },
    {
      id: 'payments',
      title: 'Payments & Billing',
      content: (
        <>
          <p style={textStyle}>
            Advancia PayLedger facilitates payment processing for healthcare services. By using our payment features, you agree to:
          </p>
          <ul style={listStyle}>
            <li style={listItemStyle}>Provide valid payment information for all transactions</li>
            <li style={listItemStyle}>Authorize charges for services rendered</li>
            <li style={listItemStyle}>Pay all applicable fees, including processing fees where disclosed</li>
            <li style={listItemStyle}>Comply with applicable payment card industry (PCI) standards</li>
          </ul>
          <p style={textStyle}>
            <strong>Cryptocurrency Payments:</strong> For crypto transactions, you acknowledge the volatility of
            digital assets and accept responsibility for any value fluctuations between transaction initiation and settlement.
          </p>
          <p style={textStyle}>
            <strong>Refunds:</strong> Refund policies are determined by individual healthcare providers. Advancia facilitates
            refunds as directed but is not responsible for provider refund decisions.
          </p>
        </>
      ),
    },
    {
      id: 'hipaa',
      title: 'HIPAA Compliance',
      content: (
        <>
          <p style={textStyle}>
            Advancia PayLedger is designed to support HIPAA compliance for covered entities and their business associates.
            We maintain:
          </p>
          <ul style={listStyle}>
            <li style={listItemStyle}>Administrative, physical, and technical safeguards for PHI protection</li>
            <li style={listItemStyle}>Encrypted data transmission and storage (AES-256)</li>
            <li style={listItemStyle}>Comprehensive audit logging of all system access</li>
            <li style={listItemStyle}>Business Associate Agreements (BAA) for enterprise clients</li>
          </ul>
          <p style={textStyle}>
            Healthcare providers using our Service must ensure their own HIPAA compliance and are responsible for
            proper handling of patient health information.
          </p>
        </>
      ),
    },
    {
      id: 'prohibited',
      title: 'Prohibited Activities',
      content: (
        <>
          <p style={textStyle}>You agree not to engage in any of the following prohibited activities:</p>
          <ul style={listStyle}>
            <li style={listItemStyle}>Using the Service for any unlawful purpose or fraudulent activity</li>
            <li style={listItemStyle}>Attempting to gain unauthorized access to any systems or data</li>
            <li style={listItemStyle}>Interfering with or disrupting the Service's infrastructure</li>
            <li style={listItemStyle}>Transmitting malware, viruses, or other harmful code</li>
            <li style={listItemStyle}>Impersonating another person or entity</li>
            <li style={listItemStyle}>Money laundering or terrorist financing</li>
            <li style={listItemStyle}>Circumventing security measures or access controls</li>
            <li style={listItemStyle}>Scraping, harvesting, or collecting user data without consent</li>
          </ul>
        </>
      ),
    },
    {
      id: 'intellectual',
      title: 'Intellectual Property',
      content: (
        <>
          <p style={textStyle}>
            The Service and its original content, features, and functionality are owned by Advancia Health Technologies Inc.
            and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
          </p>
          <p style={textStyle}>
            You may not copy, modify, distribute, sell, or lease any part of our Service or included software,
            nor may you reverse engineer or attempt to extract the source code of that software.
          </p>
        </>
      ),
    },
    {
      id: 'termination',
      title: 'Termination',
      content: (
        <>
          <p style={textStyle}>
            We may terminate or suspend your account immediately, without prior notice or liability, for any reason,
            including without limitation if you breach the Terms.
          </p>
          <p style={textStyle}>Upon termination:</p>
          <ul style={listStyle}>
            <li style={listItemStyle}>Your right to use the Service will immediately cease</li>
            <li style={listItemStyle}>You may request export of your data within 30 days</li>
            <li style={listItemStyle}>We will retain data as required by law and for compliance purposes</li>
            <li style={listItemStyle}>Any pending transactions will be processed as appropriate</li>
          </ul>
        </>
      ),
    },
    {
      id: 'disclaimers',
      title: 'Disclaimers & Limitations',
      content: (
        <>
          <p style={textStyle}>
            THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. ADVANCIA DISCLAIMS ALL WARRANTIES,
            EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR
            A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
          <p style={textStyle}>
            IN NO EVENT SHALL ADVANCIA BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
            DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
          </p>
          <div style={highlightBoxStyle}>
            <p style={highlightTextStyle}>
              ⚠️ Advancia is not a healthcare provider and does not provide medical advice. The Service is a payment
              and administrative platform only.
            </p>
          </div>
        </>
      ),
    },
    {
      id: 'governing',
      title: 'Governing Law',
      content: (
        <>
          <p style={textStyle}>
            These Terms shall be governed by and construed in accordance with the laws of the State of California,
            United States, without regard to its conflict of law provisions.
          </p>
          <p style={textStyle}>
            Any disputes arising under these Terms shall be resolved through binding arbitration in San Francisco,
            California, in accordance with the rules of the American Arbitration Association.
          </p>
        </>
      ),
    },
    {
      id: 'changes',
      title: 'Changes to Terms',
      content: (
        <>
          <p style={textStyle}>
            We reserve the right to modify or replace these Terms at any time. Material changes will be notified
            at least 30 days before they take effect.
          </p>
          <p style={textStyle}>
            By continuing to access or use our Service after revisions become effective, you agree to be bound
            by the revised terms. If you do not agree to the new terms, please stop using the Service.
          </p>
        </>
      ),
    },
  ];

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <header style={headerStyle}>
          <span style={tagStyle}>Legal</span>
          <h1 style={titleStyle}>Terms of Service</h1>
          <p style={lastUpdatedStyle}>Last Updated: February 23, 2026</p>
        </header>

        {/* Table of Contents */}
        <nav style={tocStyle}>
          <h2 style={tocTitleStyle}>Table of Contents</h2>
          <div style={tocListStyle}>
            {sections.map((s, i) => (
              <a key={s.id} href={`#${s.id}`} style={tocLinkStyle}>
                {i + 1}. {s.title}
              </a>
            ))}
          </div>
        </nav>

        {/* Sections */}
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} style={sectionStyle}>
            <h2 style={sectionTitleStyle}>
              <span style={sectionNumStyle}>{i + 1}</span>
              {s.title}
            </h2>
            {s.content}
          </section>
        ))}

        {/* Footer */}
        <footer style={footerStyle}>
          <p style={footerTextStyle}>
            Questions about these Terms? Contact us at{' '}
            <Link to="/contact" style={linkStyle}>legal@advanciapayledger.com</Link>
          </p>
          <p style={footerTextStyle}>
            See also: <Link to="/policy" style={linkStyle}>Privacy Policy</Link>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default TermsOfService;
