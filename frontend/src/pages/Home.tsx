import { Link } from 'react-router-dom';

export function Home() {
  return (
    <div className="home-page" style={{ minHeight: '100vh' }}>
      {/* Hero Section */}
      <section style={{
        background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        padding: '80px 20px 120px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Animated Background Elements */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(102, 126, 234, 0.3) 0%, transparent 50%)',
          zIndex: 0,
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '900px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-block',
            padding: '8px 20px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '20px',
            marginBottom: '24px',
            backdropFilter: 'blur(10px)',
          }}>
            <span style={{ color: '#a78bfa', fontWeight: '600', fontSize: '14px' }}>
              🚀 Web3 Healthcare Payments
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 64px)',
            fontWeight: '800',
            color: 'white',
            marginBottom: '24px',
            lineHeight: '1.1',
          }}>
            The Future of<br />
            <span style={{
              background: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>Healthcare Payments</span>
          </h1>

          <p style={{
            fontSize: '20px',
            color: 'rgba(255,255,255,0.8)',
            marginBottom: '40px',
            maxWidth: '600px',
            margin: '0 auto 40px',
            lineHeight: '1.6',
          }}>
            Secure, decentralized payment platform for medical services.
            Pay with crypto or traditional methods. HIPAA compliant.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/login"
              style={{
                padding: '16px 40px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                borderRadius: '12px',
                textDecoration: 'none',
                fontWeight: '700',
                fontSize: '16px',
                boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
            >
              🚀 Launch App
            </Link>
            <Link
              to="/payment"
              style={{
                padding: '16px 40px',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                borderRadius: '12px',
                textDecoration: 'none',
                fontWeight: '700',
                fontSize: '16px',
                border: '2px solid rgba(255,255,255,0.3)',
                backdropFilter: 'blur(10px)',
              }}
            >
              💳 Quick Pay
            </Link>
          </div>

          {/* Features Summary */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '48px',
            marginTop: '60px',
            flexWrap: 'wrap',
          }}>
            <StatItem value="Crypto" label="Payments" />
            <StatItem value="HIPAA" label="Compliant" />
            <StatItem value="24/7" label="Uptime" />
            <StatItem value="Secure" label="Platform" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: '80px 20px', background: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            textAlign: 'center',
            fontSize: '36px',
            fontWeight: '700',
            marginBottom: '16px',
            color: '#1a1a2e',
          }}>
            Why Choose Advancia?
          </h2>
          <p style={{
            textAlign: 'center',
            color: '#6b7280',
            marginBottom: '60px',
            maxWidth: '600px',
            margin: '0 auto 60px',
          }}>
            Built for the future of healthcare with cutting-edge technology and unmatched security.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
          }}>
            <FeatureCard
              icon="🔒"
              title="Bank-Level Security"
              description="256-bit encryption, HIPAA compliant, and SOC 2 certified infrastructure."
              gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            />
            <FeatureCard
              icon="🪙"
              title="Crypto Native"
              description="Pay with ETH, SOL, USDC, and more. Connect your favorite Web3 wallet."
              gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
            />
            <FeatureCard
              icon="⚡"
              title="Instant Settlement"
              description="Real-time payment processing with immediate confirmation and receipts."
              gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
            />
            <FeatureCard
              icon="🛏️"
              title="MedBed Booking"
              description="Book cutting-edge regenerative therapy sessions directly through the platform."
              gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
            />
            <FeatureCard
              icon="📱"
              title="Mobile Ready"
              description="Fully responsive design. Manage healthcare payments from any device."
              gradient="linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section style={{ padding: '80px 20px', background: '#f8fafc' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{
            textAlign: 'center',
            fontSize: '36px',
            fontWeight: '700',
            marginBottom: '60px',
            color: '#1a1a2e',
          }}>
            How It Works
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <StepCard number={1} title="Create Account" description="Sign up with email or connect your Web3 wallet. Verification takes less than 2 minutes." />
            <StepCard number={2} title="Add Funds" description="Deposit USD, ETH, SOL, or other supported currencies. Multiple payment methods available." />
            <StepCard number={3} title="Book & Pay" description="Schedule MedBed sessions, pay medical bills, or send funds to healthcare providers." />
            <StepCard number={4} title="Track Everything" description="View transaction history, download receipts, and monitor your health spending." />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '80px 20px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '36px', fontWeight: '700', color: 'white', marginBottom: '20px' }}>
            Ready to Get Started?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '32px', fontSize: '18px' }}>
            Join thousands of users who trust Advancia for their healthcare payments.
          </p>
          <Link
            to="/login"
            style={{
              display: 'inline-block',
              padding: '18px 48px',
              background: 'white',
              color: '#764ba2',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: '700',
              fontSize: '18px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            }}
          >
            Create Free Account →
          </Link>
        </div>
      </section>
    </div>
  );
}

// Stat Item Component
function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: '32px', fontWeight: '700', color: 'white', marginBottom: '4px' }}>{value}</p>
      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>{label}</p>
    </div>
  );
}

// Feature Card Component
function FeatureCard({ icon, title, description, gradient }: { icon: string; title: string; description: string; gradient: string }) {
  return (
    <div style={{
      padding: '32px',
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      transition: 'transform 0.2s, box-shadow 0.2s',
      border: '1px solid #f0f0f0',
    }}>
      <div style={{
        width: '60px',
        height: '60px',
        borderRadius: '14px',
        background: gradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px',
        fontSize: '28px',
      }}>
        {icon}
      </div>
      <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px', color: '#1a1a2e' }}>
        {title}
      </h3>
      <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
        {description}
      </p>
    </div>
  );
}

// Step Card Component
function StepCard({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '24px',
      padding: '24px',
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '700',
        fontSize: '20px',
        flexShrink: 0,
      }}>
        {number}
      </div>
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#1a1a2e' }}>{title}</h3>
        <p style={{ color: '#6b7280', lineHeight: '1.6' }}>{description}</p>
      </div>
    </div>
  );
}
