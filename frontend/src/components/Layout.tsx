import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="layout">
      <header className="header">
        <div className="container">
          <Link to="/" className="logo">
            Advancia PayLedger
          </Link>
          <nav className="nav">
            <Link to="/">Home</Link>
            <Link to="/payment">Make Payment</Link>
            {user ? (
              <>
                <Link to="/dashboard">Dashboard</Link>
                <Link to="/appointments">Appointments</Link>
                <Link to="/history">Payment History</Link>
                <Link to="/provider">Provider Portal</Link>
                <Link to="/profile">Profile</Link>
                <button onClick={logout} className="btn-link">
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login">Login</Link>
            )}
          </nav>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <Outlet />
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <p>&copy; 2026 Advancia PayLedger. Secure payments powered by Stripe.</p>
        </div>
      </footer>
    </div>
  );
}
