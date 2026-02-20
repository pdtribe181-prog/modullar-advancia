import { useState } from 'react';
import { cardStyle, btnPrimary, btnSecondary, badgeStyle, type UsageMetrics, type PlanInfo } from './shared';

const plans: PlanInfo[] = [
  { name: 'free', features: ['50 transactions/mo', '1 team member', '100 API calls/day', '1 GB storage'], price: 0 },
  { name: 'pro', features: ['Unlimited transactions', '10 team members', '10,000 API calls/day', '50 GB storage', 'Priority support', 'Custom webhooks'], price: 49 },
  { name: 'enterprise', features: ['Everything in Pro', 'Unlimited team', 'Unlimited API calls', '500 GB storage', 'Dedicated support', 'SLA guarantee', 'Custom integrations'], price: 199 },
];

const defaultUsage: UsageMetrics = {
  apiCalls: { current: 72, limit: 100 },
  storage: { current: 320, limit: 1024 },
  bandwidth: { current: 1.2, limit: 10 },
  transactions: { current: 35, limit: 50 },
};

function UsageBar({ label, used, limit, unit }: { label: string; used: number; limit: number; unit?: string }) {
  const pct = Math.min((used / limit) * 100, 100);
  const isHigh = pct >= 80;
  const isCritical = pct >= 95;

  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
        <span style={{ fontWeight: '500', color: '#374151' }}>{label}</span>
        <span style={{ color: isCritical ? '#dc2626' : isHigh ? '#d97706' : '#6b7280' }}>
          {used.toLocaleString()}{unit ? ` ${unit}` : ''} / {limit.toLocaleString()}{unit ? ` ${unit}` : ''}
        </span>
      </div>
      <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: isCritical ? '#dc2626' : isHigh ? '#d97706' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '3px',
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  );
}

/**
 * Usage meter that shows current plan usage and prompts upgrade when usage is high.
 */
export function UpgradePrompt({ usage = defaultUsage, currentPlan = 'free' }: { usage?: UsageMetrics; currentPlan?: string } = {}) {
  const [showCompare, setShowCompare] = useState(false);

  const txPct = (usage.transactions.current / usage.transactions.limit) * 100;
  const apiPct = (usage.apiCalls.current / usage.apiCalls.limit) * 100;
  const anyHigh = txPct >= 80 || apiPct >= 80;

  return (
    <>
      <div style={{ ...cardStyle, marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600' }}>📊 Usage & Plan</h3>
          <span style={badgeStyle(currentPlan === 'enterprise' ? '#7c3aed' : currentPlan === 'pro' ? '#2563eb' : '#6b7280')}>
            {currentPlan.toUpperCase()}
          </span>
        </div>

        <UsageBar label="Transactions" used={usage.transactions.current} limit={usage.transactions.limit} />
        <UsageBar label="API Calls" used={usage.apiCalls.current} limit={usage.apiCalls.limit} />
        <UsageBar label="Storage" used={usage.storage.current} limit={usage.storage.limit} unit="MB" />
        <UsageBar label="Bandwidth" used={usage.bandwidth.current} limit={usage.bandwidth.limit} unit="GB" />

        {anyHigh && currentPlan !== 'enterprise' && (
          <div style={{
            marginTop: '16px',
            padding: '14px 16px',
            background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
            borderRadius: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <p style={{ fontWeight: '600', fontSize: '14px', color: '#92400e' }}>⚡ Approaching limits</p>
              <p style={{ fontSize: '13px', color: '#a16207' }}>Upgrade to unlock more capacity</p>
            </div>
            <button onClick={() => setShowCompare(true)} style={btnPrimary}>Upgrade</button>
          </div>
        )}

        {!anyHigh && currentPlan !== 'enterprise' && (
          <button
            onClick={() => setShowCompare(true)}
            style={{ ...btnSecondary, width: '100%', marginTop: '12px', fontSize: '13px' }}
          >
            Compare Plans
          </button>
        )}
      </div>

      {/* Plan Comparison Modal */}
      {showCompare && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px',
        }} onClick={() => setShowCompare(false)}>
          <div style={{
            background: 'white', borderRadius: '16px', padding: '32px',
            maxWidth: '800px', width: '100%', maxHeight: '90vh', overflow: 'auto',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '700' }}>Choose Your Plan</h2>
              <button onClick={() => setShowCompare(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              {plans.map((plan) => (
                <div key={plan.name} style={{
                  padding: '24px',
                  borderRadius: '14px',
                  border: plan.name === currentPlan ? '2px solid #667eea' : '1px solid #e5e7eb',
                  background: plan.name === currentPlan ? '#f5f3ff' : 'white',
                  position: 'relative',
                }}>
                  {plan.name === currentPlan && (
                    <span style={{
                      position: 'absolute', top: '-10px', right: '16px',
                      background: '#667eea', color: 'white', fontSize: '11px',
                      padding: '2px 10px', borderRadius: '10px', fontWeight: '600',
                    }}>Current</span>
                  )}
                  <h3 style={{ fontSize: '18px', fontWeight: '700', textTransform: 'capitalize', marginBottom: '8px' }}>{plan.name}</h3>
                  <p style={{ fontSize: '28px', fontWeight: '700', marginBottom: '16px' }}>
                    ${plan.price}<span style={{ fontSize: '14px', fontWeight: '400', color: '#6b7280' }}>/mo</span>
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {plan.features.map((f) => (
                      <li key={f} style={{ fontSize: '13px', padding: '4px 0', color: '#374151', display: 'flex', gap: '6px' }}>
                        <span style={{ color: '#16a34a' }}>✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  {plan.name !== currentPlan && (
                    <button style={{ ...btnPrimary, width: '100%', marginTop: '16px', fontSize: '13px' }}>
                      {plan.price > 0 ? `Upgrade to ${plan.name}` : 'Downgrade'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Small inline badge showing locked PRO features.
 */
export function ProBadge({ feature }: { feature: string }) {
  return (
    <span
      title={`${feature} requires PRO plan`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        padding: '2px 8px', borderRadius: '6px', fontSize: '11px',
        background: '#ede9fe', color: '#7c3aed', fontWeight: '600', cursor: 'default',
      }}
    >
      🔒 PRO
    </span>
  );
}
