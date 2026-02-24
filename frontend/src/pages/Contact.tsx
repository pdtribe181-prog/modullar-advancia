import React, { useState, CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import '../styles.css';

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  category: string;
  message: string;
}

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg)',
  padding: '120px 24px 80px',
};

const containerStyle: CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
};

const headerStyle: CSSProperties = {
  textAlign: 'center',
  marginBottom: '64px',
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
  fontSize: 'clamp(32px, 5vw, 48px)',
  fontWeight: 800,
  color: '#ffffff',
  marginBottom: '16px',
};

const subtitleStyle: CSSProperties = {
  fontSize: '18px',
  color: 'rgba(255,255,255,0.6)',
  maxWidth: '600px',
  margin: '0 auto',
  lineHeight: 1.6,
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
  gap: '48px',
  alignItems: 'start',
};

const formCardStyle: CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: '16px',
  padding: '32px',
  border: '1px solid rgba(255,255,255,0.06)',
};

const formTitleStyle: CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  color: '#ffffff',
  marginBottom: '24px',
};

const fieldStyle: CSSProperties = {
  marginBottom: '20px',
};

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.8)',
  marginBottom: '8px',
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.03)',
  color: '#ffffff',
  fontSize: '15px',
  transition: 'all 0.2s ease',
  outline: 'none',
};

const selectStyle: CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 16px center',
  paddingRight: '40px',
  backgroundColor: '#0d1424',
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: '140px',
  resize: 'vertical',
  fontFamily: 'inherit',
};

const btnStyle: CSSProperties = {
  width: '100%',
  padding: '16px 32px',
  borderRadius: '10px',
  background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  marginTop: '8px',
};

const infoSectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
};

const infoCardStyle: CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: '16px',
  padding: '24px',
  border: '1px solid rgba(255,255,255,0.06)',
  display: 'flex',
  gap: '16px',
  alignItems: 'flex-start',
};

const iconBoxStyle: CSSProperties = {
  width: '48px',
  height: '48px',
  borderRadius: '12px',
  background: 'rgba(96, 128, 245, 0.15)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '22px',
  flexShrink: 0,
};

const infoContentStyle: CSSProperties = {
  flex: 1,
};

const infoTitleStyle: CSSProperties = {
  fontSize: '16px',
  fontWeight: 700,
  color: '#ffffff',
  marginBottom: '4px',
};

const infoTextStyle: CSSProperties = {
  fontSize: '14px',
  color: 'rgba(255,255,255,0.6)',
  lineHeight: 1.5,
};

const linkStyle: CSSProperties = {
  color: 'var(--primary)',
  textDecoration: 'none',
  fontWeight: 500,
};

const hoursGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '8px',
  marginTop: '8px',
};

const hourRowStyle: CSSProperties = {
  fontSize: '13px',
  color: 'rgba(255,255,255,0.5)',
};

const socialRowStyle: CSSProperties = {
  display: 'flex',
  gap: '12px',
  marginTop: '12px',
};

const socialBtnStyle: CSSProperties = {
  width: '40px',
  height: '40px',
  borderRadius: '10px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '18px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  textDecoration: 'none',
};

const badgeStyle: CSSProperties = {
  display: 'inline-block',
  padding: '4px 10px',
  borderRadius: '6px',
  background: 'rgba(16, 185, 129, 0.15)',
  color: '#10b981',
  fontSize: '11px',
  fontWeight: 600,
  marginLeft: '8px',
};

const successBoxStyle: CSSProperties = {
  padding: '24px',
  borderRadius: '12px',
  background: 'rgba(16, 185, 129, 0.1)',
  border: '1px solid rgba(16, 185, 129, 0.2)',
  textAlign: 'center',
};

const successIconStyle: CSSProperties = {
  fontSize: '48px',
  marginBottom: '16px',
};

const successTitleStyle: CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  color: '#10b981',
  marginBottom: '8px',
};

const successTextStyle: CSSProperties = {
  fontSize: '14px',
  color: 'rgba(255,255,255,0.6)',
};

export const Contact: React.FC = () => {
  const [form, setForm] = useState<ContactForm>({
    name: '',
    email: '',
    subject: '',
    category: '',
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    setSending(false);
    setSent(true);
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <header style={headerStyle}>
          <span style={tagStyle}>Contact Us</span>
          <h1 style={titleStyle}>Get in Touch</h1>
          <p style={subtitleStyle}>
            Have questions about Advancia PayLedger? Our team is here to help with billing,
            technical support, partnerships, or general inquiries.
          </p>
        </header>

        <div style={gridStyle}>
          {/* Contact Form */}
          <div style={formCardStyle}>
            <h2 style={formTitleStyle}>Send us a Message</h2>

            {sent ? (
              <div style={successBoxStyle}>
                <div style={successIconStyle}>✅</div>
                <h3 style={successTitleStyle}>Message Sent!</h3>
                <p style={successTextStyle}>
                  Thank you for reaching out. We'll get back to you within 24 hours.
                </p>
                <button
                  style={{ ...btnStyle, marginTop: '20px', background: 'rgba(255,255,255,0.1)' }}
                  onClick={() => {
                    setSent(false);
                    setForm({ name: '', email: '', subject: '', category: '', message: '' });
                  }}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Your Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    required
                    style={inputStyle}
                  />
                </div>

                <div style={fieldStyle}>
                  <label style={labelStyle}>Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="john@example.com"
                    required
                    style={inputStyle}
                  />
                </div>

                <div style={fieldStyle}>
                  <label style={labelStyle}>Category</label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    style={selectStyle}
                  >
                    <option value="">Select a category...</option>
                    <option value="billing">Billing & Payments</option>
                    <option value="technical">Technical Support</option>
                    <option value="account">Account Issues</option>
                    <option value="medbed">MedBed Bookings</option>
                    <option value="crypto">Crypto Wallet</option>
                    <option value="compliance">HIPAA Compliance</option>
                    <option value="partnership">Partnership Inquiry</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div style={fieldStyle}>
                  <label style={labelStyle}>Subject *</label>
                  <input
                    type="text"
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    placeholder="Brief description of your inquiry"
                    required
                    style={inputStyle}
                  />
                </div>

                <div style={fieldStyle}>
                  <label style={labelStyle}>Message *</label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Please provide as much detail as possible..."
                    required
                    style={textareaStyle}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    ...btnStyle,
                    opacity: sending ? 0.7 : 1,
                    cursor: sending ? 'not-allowed' : 'pointer',
                  }}
                  disabled={sending}
                >
                  {sending ? 'Sending...' : 'Send Message →'}
                </button>
              </form>
            )}
          </div>

          {/* Contact Info */}
          <div style={infoSectionStyle}>
            {/* Email Support */}
            <div style={infoCardStyle}>
              <div style={iconBoxStyle}>📧</div>
              <div style={infoContentStyle}>
                <h3 style={infoTitleStyle}>Email Support</h3>
                <p style={infoTextStyle}>
                  For general inquiries and support
                </p>
                <a href="mailto:support@advanciapayledger.com" style={{ ...linkStyle, display: 'block', marginTop: '8px' }}>
                  support@advanciapayledger.com
                </a>
                <p style={{ ...infoTextStyle, marginTop: '8px', fontSize: '12px' }}>
                  Response time: Within 24 hours
                </p>
              </div>
            </div>

            {/* Phone Support */}
            <div style={infoCardStyle}>
              <div style={iconBoxStyle}>📞</div>
              <div style={infoContentStyle}>
                <h3 style={infoTitleStyle}>
                  Phone Support
                  <span style={badgeStyle}>Priority</span>
                </h3>
                <p style={infoTextStyle}>
                  For urgent matters and enterprise clients
                </p>
                <a href="tel:+18005551234" style={{ ...linkStyle, display: 'block', marginTop: '8px' }}>
                  +1 (800) 555-1234
                </a>
                <div style={hoursGridStyle}>
                  <span style={hourRowStyle}>Mon-Fri:</span>
                  <span style={hourRowStyle}>9AM - 6PM EST</span>
                  <span style={hourRowStyle}>Sat-Sun:</span>
                  <span style={hourRowStyle}>10AM - 4PM EST</span>
                </div>
              </div>
            </div>

            {/* Live Chat */}
            <div style={infoCardStyle}>
              <div style={{ ...iconBoxStyle, background: 'rgba(16, 185, 129, 0.15)' }}>💬</div>
              <div style={infoContentStyle}>
                <h3 style={infoTitleStyle}>
                  Live Chat
                  <span style={{ ...badgeStyle, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                    Coming Soon
                  </span>
                </h3>
                <p style={infoTextStyle}>
                  Real-time chat support is coming soon. In the meantime, check our FAQ for quick answers.
                </p>
                <Link to="/faq" style={{ ...linkStyle, display: 'block', marginTop: '8px' }}>
                  Browse FAQ →
                </Link>
              </div>
            </div>

            {/* Office Location */}
            <div style={infoCardStyle}>
              <div style={iconBoxStyle}>📍</div>
              <div style={infoContentStyle}>
                <h3 style={infoTitleStyle}>Headquarters</h3>
                <p style={infoTextStyle}>
                  Advancia Health Technologies Inc.<br />
                  123 Innovation Drive, Suite 400<br />
                  San Francisco, CA 94105<br />
                  United States
                </p>
              </div>
            </div>

            {/* Social Media */}
            <div style={infoCardStyle}>
              <div style={iconBoxStyle}>🌐</div>
              <div style={infoContentStyle}>
                <h3 style={infoTitleStyle}>Follow Us</h3>
                <p style={infoTextStyle}>
                  Stay updated with the latest features and announcements
                </p>
                <div style={socialRowStyle}>
                  <a
                    href="https://twitter.com/advancia"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={socialBtnStyle}
                    title="Twitter/X"
                  >
                    𝕏
                  </a>
                  <a
                    href="https://linkedin.com/company/advancia"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={socialBtnStyle}
                    title="LinkedIn"
                  >
                    in
                  </a>
                  <a
                    href="https://discord.gg/advancia"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={socialBtnStyle}
                    title="Discord"
                  >
                    🎮
                  </a>
                  <a
                    href="https://t.me/advancia"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={socialBtnStyle}
                    title="Telegram"
                  >
                    ✈️
                  </a>
                </div>
              </div>
            </div>

            {/* Enterprise */}
            <div style={{ ...infoCardStyle, background: 'linear-gradient(135deg, rgba(96, 128, 245, 0.1) 0%, var(--bg-card) 100%)' }}>
              <div style={{ ...iconBoxStyle, background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)' }}>🏢</div>
              <div style={infoContentStyle}>
                <h3 style={infoTitleStyle}>Enterprise Solutions</h3>
                <p style={infoTextStyle}>
                  Need a custom implementation for your healthcare organization? Contact our enterprise team for dedicated support and SLAs.
                </p>
                <a href="mailto:enterprise@advanciapayledger.com" style={{ ...linkStyle, display: 'block', marginTop: '8px' }}>
                  enterprise@advanciapayledger.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Sections */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          marginTop: '64px',
        }}>
          {/* Still have questions */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(96, 128, 245, 0.12) 0%, rgba(96, 128, 245, 0.04) 100%)',
            borderRadius: '16px',
            padding: '32px',
            border: '1px solid rgba(96, 128, 245, 0.2)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>💬</div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
              Still have questions?
            </h3>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '20px', lineHeight: 1.6 }}>
              Our support team is available Monday–Friday, 9 am–6 pm EST.
            </p>
            <a
              href="mailto:support@advanciapayledger.com"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                borderRadius: '10px',
                background: 'var(--primary)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '14px',
                textDecoration: 'none',
                transition: 'opacity 0.2s',
              }}
            >
              Email Support
            </a>
          </div>

          {/* Developer Docs */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.04) 100%)',
            borderRadius: '16px',
            padding: '32px',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>📖</div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
              Developer Docs
            </h3>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '20px', lineHeight: 1.6 }}>
              Integrate our API into your clinic management system.
            </p>
            <a
              href="/api/docs"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                borderRadius: '10px',
                background: '#10b981',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '14px',
                textDecoration: 'none',
                transition: 'opacity 0.2s',
              }}
            >
              View API Docs
            </a>
          </div>

          {/* Get Started */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(168, 85, 247, 0.04) 100%)',
            borderRadius: '16px',
            padding: '32px',
            border: '1px solid rgba(168, 85, 247, 0.2)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🚀</div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
              Get Started Now
            </h3>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '20px', lineHeight: 1.6 }}>
              Create a free account and explore all features risk-free.
            </p>
            <Link
              to="/signup"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                borderRadius: '10px',
                background: '#a855f7',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '14px',
                textDecoration: 'none',
                transition: 'opacity 0.2s',
              }}
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
