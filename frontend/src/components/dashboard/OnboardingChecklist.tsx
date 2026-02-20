import { useState, useEffect } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { cardStyle, type OnboardingStep } from './shared';

const STORAGE_KEY = 'advancia_onboarding_dismissed';

function getDefaultSteps(userRole?: string): OnboardingStep[] {
  return [
    { id: 'profile', label: 'Complete your profile', completed: false, href: '/profile', icon: '👤' },
    { id: 'mfa', label: 'Enable two-factor auth', completed: false, href: '/security/mfa', icon: '🔐' },
    { id: 'payment', label: 'Add a payment method', completed: false, href: '/payment', icon: '💳' },
    { id: 'wallet', label: 'Connect a wallet', completed: false, href: '/wallet', icon: '🦊' },
    ...(userRole === 'provider'
      ? [{ id: 'onboarding', label: 'Complete provider onboarding', completed: false, href: '/provider', icon: '👨‍⚕️' }]
      : []),
    { id: 'appointment', label: 'Book your first appointment', completed: false, href: '/appointments', icon: '📅' },
  ];
}

/**
 * Onboarding Checklist — shown to new users to guide them through setup.
 * Persists dismissed state in localStorage.
 */
export function OnboardingChecklist() {
  const { user } = useAuth();
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === 'true') {
      setDismissed(true);
      return;
    }
    // In production, fetch completion status from the API
    const defaults = getDefaultSteps(user?.role);
    // Simulate checking which steps are done
    if (user?.email) {
      defaults[0].completed = true; // Profile is implicitly started
    }
    setSteps(defaults);
  }, [user]);

  const completedCount = steps.filter((s) => s.completed).length;
  const totalCount = steps.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (dismissed || completedCount === totalCount) return null;

  return (
    <div style={{ ...cardStyle, border: '2px solid #667eea20', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a2e' }}>
            🚀 Get Started with Advancia
          </h3>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
            {completedCount}/{totalCount} steps complete
          </p>
        </div>
        <button
          onClick={() => { setDismissed(true); localStorage.setItem(STORAGE_KEY, 'true'); }}
          style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '18px' }}
          title="Dismiss"
        >
          ✕
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '3px', marginBottom: '20px', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '3px',
            transition: 'width 0.5s ease',
          }}
        />
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {steps.map((step) => (
          <a
            key={step.id}
            href={step.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '10px',
              background: step.completed ? '#f0fdf4' : '#f9fafb',
              textDecoration: 'none',
              color: step.completed ? '#16a34a' : '#374151',
              transition: 'background 0.2s',
              border: '1px solid ' + (step.completed ? '#bbf7d0' : '#e5e7eb'),
            }}
          >
            <span style={{ fontSize: '20px' }}>{step.completed ? '✅' : step.icon}</span>
            <span style={{ flex: 1, fontWeight: '500', fontSize: '14px', textDecoration: step.completed ? 'line-through' : 'none' }}>
              {step.label}
            </span>
            {!step.completed && <span style={{ color: '#667eea', fontSize: '14px' }}>→</span>}
          </a>
        ))}
      </div>
    </div>
  );
}
