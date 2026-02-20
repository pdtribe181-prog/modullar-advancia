import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { Suspense, lazy } from 'react';

// Lazy load AI Chat
const AIChat = lazy(() => import('./AIChat'));

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="layout">
      <header className="header" style={{
        background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 100%)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}>
        <div className="container">
          <Link to="/" className="logo" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: 'white',
            textDecoration: 'none',
          }}>
            <span style={{ fontSize: '24px' }}>💎</span>
            <span style={{ fontWeight: '700', fontSize: '18px' }}>Advancia PayLedger</span>
          </Link>
          <nav className="nav" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <Link to="/" style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none', fontWeight: '500' }}>Home</Link>
            <Link to="/payment" style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none', fontWeight: '500' }}>Make Payment</Link>
            {user ? (
              <>
                <Link to="/dashboard" style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none', fontWeight: '500' }}>Dashboard</Link>
                <Link to="/booking/medbed" style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none', fontWeight: '500' }}>MedBed</Link>
                <Link to="/wallet" style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none', fontWeight: '500' }}>Wallet</Link>
                {user.role === 'admin' && (
                  <Link to="/admin" style={{
                    color: 'white',
                    textDecoration: 'none',
                    fontWeight: '600',
                    background: 'rgba(255,255,255,0.2)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                  }}>⚙️ Admin</Link>
                )}
                <Link to="/profile" style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none', fontWeight: '500' }}>Profile</Link>
                <button
                  onClick={logout}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '500',
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '10px 24px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '600',
              }}>Login</Link>
            )}
          </nav>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <Outlet />
        </div>
      </main>

      <footer className="footer" style={{
        background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 100%)',
        color: 'rgba(255,255,255,0.8)',
        padding: '32px 0',
      }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '20px' }}>💎</span> Advancia PayLedger
          </p>
          <p style={{ fontSize: '14px', opacity: 0.7 }}>
            &copy; 2026 Advancia PayLedger. Web3 Healthcare Payments. HIPAA Compliant.
          </p>
        </div>
      </footer>

      {/* AI Chat Assistant */}
      <Suspense fallback={null}>
        <AIChat />
      </Suspense>
    </div>
  );
}
