import React, { useState, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles.css';

type OnboardingStep = 1 | 2 | 3 | 4 | 5;

interface Feature {
  icon: string;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: '💳',
    title: 'Secure Payments',
    description: 'Process and receive healthcare payments with bank-level encryption and PCI compliance.',
  },
  {
    icon: '📊',
    title: 'Real-time Analytics',
    description: 'Track your transactions, revenue trends, and financial performance at a glance.',
  },
  {
    icon: '🔐',
    title: 'HIPAA Compliant',
    description: 'All patient data is protected with enterprise-grade security and compliance standards.',
  },
  {
    icon: '💰',
    title: 'Multi-currency Wallet',
    description: 'Manage crypto and fiat currencies in one place with instant conversions.',
  },
];

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 24px',
};

const containerStyle: CSSProperties = {
  width: '100%',
  maxWidth: '700px',
};

const cardStyle: CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: '24px',
  padding: '48px',
  border: '1px solid rgba(255,255,255,0.06)',
  textAlign: 'center',
};

const progressBarContainerStyle: CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginBottom: '40px',
};

const progressBarStyle = (active: boolean, completed: boolean): CSSProperties => ({
  flex: 1,
  height: '4px',
  borderRadius: '2px',
  background: completed ? 'var(--primary)' : active ? 'rgba(96, 128, 245, 0.5)' : 'rgba(255,255,255,0.1)',
  transition: 'all 0.3s',
});

const welcomeIconStyle: CSSProperties = {
  width: '120px',
  height: '120px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, rgba(96, 128, 245, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 32px',
  fontSize: '56px',
};

const titleStyle: CSSProperties = {
  fontSize: '32px',
  fontWeight: 800,
  color: '#ffffff',
  marginBottom: '12px',
};

const subtitleStyle: CSSProperties = {
  fontSize: '16px',
  color: 'rgba(255,255,255,0.6)',
  marginBottom: '40px',
  lineHeight: 1.6,
};

const featureGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '16px',
  marginBottom: '40px',
  textAlign: 'left',
};

const featureCardStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.02)',
  borderRadius: '16px',
  padding: '24px',
  border: '1px solid rgba(255,255,255,0.06)',
};

const featureIconStyle: CSSProperties = {
  fontSize: '32px',
  marginBottom: '12px',
};

const featureTitleStyle: CSSProperties = {
  fontSize: '16px',
  fontWeight: 700,
  color: '#ffffff',
  marginBottom: '8px',
};

const featureDescStyle: CSSProperties = {
  fontSize: '14px',
  color: 'rgba(255,255,255,0.6)',
  lineHeight: 1.5,
};

const checklistStyle: CSSProperties = {
  textAlign: 'left',
  marginBottom: '32px',
};

const checklistItemStyle = (completed: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  padding: '16px 20px',
  background: completed ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.02)',
  borderRadius: '12px',
  marginBottom: '12px',
  cursor: 'pointer',
  border: `1px solid ${completed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.06)'}`,
  transition: 'all 0.2s',
});

const checkboxStyle = (completed: boolean): CSSProperties => ({
  width: '24px',
  height: '24px',
  borderRadius: '6px',
  border: `2px solid ${completed ? '#10b981' : 'rgba(255,255,255,0.2)'}`,
  background: completed ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#10b981',
  fontSize: '14px',
  fontWeight: 700,
  flexShrink: 0,
});

const checkItemTextStyle: CSSProperties = {
  flex: 1,
};

const checkItemTitleStyle: CSSProperties = {
  fontSize: '15px',
  fontWeight: 600,
  color: '#ffffff',
  marginBottom: '2px',
};

const checkItemDescStyle: CSSProperties = {
  fontSize: '13px',
  color: 'rgba(255,255,255,0.5)',
};

const btnStyle: CSSProperties = {
  padding: '16px 32px',
  borderRadius: '12px',
  fontSize: '16px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  border: 'none',
};

const btnPrimaryStyle: CSSProperties = {
  ...btnStyle,
  background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
  color: '#ffffff',
  width: '100%',
};

const btnSecondaryStyle: CSSProperties = {
  ...btnStyle,
  background: 'transparent',
  color: 'rgba(255,255,255,0.6)',
  padding: '12px 20px',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const preferenceGroupStyle: CSSProperties = {
  textAlign: 'left',
  marginBottom: '20px',
};

const preferenceLabelStyle: CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.8)',
  marginBottom: '12px',
  display: 'block',
};

const optionStyle = (selected: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '14px 16px',
  background: selected ? 'rgba(96, 128, 245, 0.1)' : 'rgba(255,255,255,0.02)',
  borderRadius: '10px',
  marginBottom: '8px',
  cursor: 'pointer',
  border: `1px solid ${selected ? 'var(--primary)' : 'rgba(255,255,255,0.06)'}`,
  transition: 'all 0.2s',
});

const radioStyle = (selected: boolean): CSSProperties => ({
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  border: `2px solid ${selected ? 'var(--primary)' : 'rgba(255,255,255,0.2)'}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

const radioDotStyle: CSSProperties = {
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  background: 'var(--primary)',
};

const optionTextStyle: CSSProperties = {
  fontSize: '14px',
  color: '#ffffff',
};

const celebrationStyle: CSSProperties = {
  fontSize: '80px',
  marginBottom: '24px',
};

const tipBoxStyle: CSSProperties = {
  background: 'rgba(59, 130, 246, 0.1)',
  borderRadius: '12px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'left',
};

const tipTitleStyle: CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#3b82f6',
  marginBottom: '8px',
};

const tipTextStyle: CSSProperties = {
  fontSize: '14px',
  color: 'rgba(255,255,255,0.7)',
  lineHeight: 1.5,
};

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [preferences, setPreferences] = useState({
    notifications: 'all',
    currency: 'usd',
    theme: 'dark',
  });

  const setupItems = [
    { id: 1, title: 'Verify your email', desc: 'Confirm your email address', link: '/verify-email' },
    { id: 2, title: 'Complete your profile', desc: 'Add personal details', link: '/profile' },
    { id: 3, title: 'Enable 2FA security', desc: 'Protect your account', link: '/security/2fa-setup' },
    { id: 4, title: 'Connect payment method', desc: 'Add a card or bank', link: '/settings' },
  ];

  const toggleStep = (id: number) => {
    setCompletedSteps(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleFinish = () => {
    localStorage.setItem('onboardingCompleted', 'true');
    navigate('/dashboard');
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={cardStyle}>
          {/* Progress Bar */}
          <div style={progressBarContainerStyle}>
            {[1, 2, 3, 4, 5].map(s => (
              <div key={s} style={progressBarStyle(step === s, step > s)} />
            ))}
          </div>

          {/* Step 1: Welcome */}
          {step === 1 && (
            <>
              <div style={welcomeIconStyle}>👋</div>
              <h1 style={titleStyle}>Welcome to Advancia!</h1>
              <p style={subtitleStyle}>
                Your healthcare payment journey starts here. Let's take a quick tour to help you
                get the most out of your new account.
              </p>
              <div style={actionsStyle}>
                <button style={btnPrimaryStyle} onClick={() => setStep(2)}>
                  Get Started →
                </button>
                <button style={btnSecondaryStyle} onClick={() => navigate('/dashboard')}>
                  Skip tour
                </button>
              </div>
            </>
          )}

          {/* Step 2: Key Features */}
          {step === 2 && (
            <>
              <h1 style={{ ...titleStyle, fontSize: '28px' }}>Key Features</h1>
              <p style={{ ...subtitleStyle, marginBottom: '32px' }}>
                Discover what you can do with Advancia PayLedger
              </p>
              <div style={featureGridStyle}>
                {features.map((f, i) => (
                  <div key={i} style={featureCardStyle}>
                    <div style={featureIconStyle}>{f.icon}</div>
                    <div style={featureTitleStyle}>{f.title}</div>
                    <div style={featureDescStyle}>{f.description}</div>
                  </div>
                ))}
              </div>
              <div style={actionsStyle}>
                <button style={btnPrimaryStyle} onClick={() => setStep(3)}>
                  Continue →
                </button>
                <button style={btnSecondaryStyle} onClick={() => setStep(1)}>
                  ← Back
                </button>
              </div>
            </>
          )}

          {/* Step 3: Setup Checklist */}
          {step === 3 && (
            <>
              <h1 style={{ ...titleStyle, fontSize: '28px' }}>Quick Setup</h1>
              <p style={{ ...subtitleStyle, marginBottom: '24px' }}>
                Complete these steps to get your account ready
              </p>
              <div style={checklistStyle}>
                {setupItems.map(item => (
                  <div
                    key={item.id}
                    style={checklistItemStyle(completedSteps.includes(item.id))}
                    onClick={() => toggleStep(item.id)}
                  >
                    <div style={checkboxStyle(completedSteps.includes(item.id))}>
                      {completedSteps.includes(item.id) && '✓'}
                    </div>
                    <div style={checkItemTextStyle}>
                      <div style={checkItemTitleStyle}>{item.title}</div>
                      <div style={checkItemDescStyle}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={tipBoxStyle}>
                <div style={tipTitleStyle}>💡 Pro Tip</div>
                <div style={tipTextStyle}>
                  You can complete these steps later from your settings.
                  Enabling 2FA is highly recommended for account security.
                </div>
              </div>
              <div style={actionsStyle}>
                <button style={btnPrimaryStyle} onClick={() => setStep(4)}>
                  Continue →
                </button>
                <button style={btnSecondaryStyle} onClick={() => setStep(2)}>
                  ← Back
                </button>
              </div>
            </>
          )}

          {/* Step 4: Preferences */}
          {step === 4 && (
            <>
              <h1 style={{ ...titleStyle, fontSize: '28px' }}>Your Preferences</h1>
              <p style={{ ...subtitleStyle, marginBottom: '24px' }}>
                Customize your experience
              </p>

              <div style={preferenceGroupStyle}>
                <label style={preferenceLabelStyle}>Email Notifications</label>
                {[
                  { value: 'all', label: 'All notifications' },
                  { value: 'important', label: 'Important only' },
                  { value: 'none', label: 'None' },
                ].map(opt => (
                  <div
                    key={opt.value}
                    style={optionStyle(preferences.notifications === opt.value)}
                    onClick={() => setPreferences({ ...preferences, notifications: opt.value })}
                  >
                    <div style={radioStyle(preferences.notifications === opt.value)}>
                      {preferences.notifications === opt.value && <div style={radioDotStyle} />}
                    </div>
                    <span style={optionTextStyle}>{opt.label}</span>
                  </div>
                ))}
              </div>

              <div style={preferenceGroupStyle}>
                <label style={preferenceLabelStyle}>Default Currency</label>
                {[
                  { value: 'usd', label: 'USD ($)' },
                  { value: 'eur', label: 'EUR (€)' },
                  { value: 'gbp', label: 'GBP (£)' },
                ].map(opt => (
                  <div
                    key={opt.value}
                    style={optionStyle(preferences.currency === opt.value)}
                    onClick={() => setPreferences({ ...preferences, currency: opt.value })}
                  >
                    <div style={radioStyle(preferences.currency === opt.value)}>
                      {preferences.currency === opt.value && <div style={radioDotStyle} />}
                    </div>
                    <span style={optionTextStyle}>{opt.label}</span>
                  </div>
                ))}
              </div>

              <div style={actionsStyle}>
                <button style={btnPrimaryStyle} onClick={() => setStep(5)}>
                  Continue →
                </button>
                <button style={btnSecondaryStyle} onClick={() => setStep(3)}>
                  ← Back
                </button>
              </div>
            </>
          )}

          {/* Step 5: Complete */}
          {step === 5 && (
            <>
              <div style={celebrationStyle}>🎉</div>
              <h1 style={titleStyle}>You're All Set!</h1>
              <p style={subtitleStyle}>
                Your account is ready to use. Start exploring your dashboard or
                make your first payment.
              </p>
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    borderRadius: '12px',
                    padding: '16px 24px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>$0.00</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Current Balance</div>
                  </div>
                  <div style={{
                    background: 'rgba(96, 128, 245, 0.1)',
                    borderRadius: '12px',
                    padding: '16px 24px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)' }}>{completedSteps.length}/4</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Setup Complete</div>
                  </div>
                </div>
              </div>
              <div style={actionsStyle}>
                <button style={btnPrimaryStyle} onClick={handleFinish}>
                  Go to Dashboard →
                </button>
                <button
                  style={btnSecondaryStyle}
                  onClick={() => navigate('/wallet')}
                >
                  Add Funds Instead
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
