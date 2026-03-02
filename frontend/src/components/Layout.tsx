import { Outlet, Link, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { isHealthcareHost, getSupportEmail } from '../config/domains';

export function Layout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isHealthcare = isHealthcareHost(host);
  const brandProductLabel = isHealthcare ? 'Healthcare' : 'PayLedger';
  const supportEmail = getSupportEmail(host);
  const copyrightEntity = isHealthcare ? 'Advancia Healthcare' : 'Advancia PayLedger, Inc.';

  return (
    <div className="layout">
      {/* ── Header ─────────────────────────────────────── */}
      <header className="app-header">
        <div className="app-header__inner">
          {/* Logo */}
          <Link to="/" className="app-logo" onClick={closeMenu}>
            <svg
              className="app-logo__mark"
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              aria-hidden="true"
            >
              <rect width="32" height="32" rx="9" fill="url(#lg-nav)" />
              <path
                d="M16 7L24 25H19.5L18 21.5H14L12.5 25H8L16 7ZM16 12.5L14.8 17H17.2L16 12.5Z"
                fill="white"
              />
              <defs>
                <linearGradient
                  id="lg-nav"
                  x1="0"
                  y1="0"
                  x2="32"
                  y2="32"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#818cf8" />
                  <stop offset="1" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
            </svg>
            <span className="app-logo__text">
              <span className="app-logo__name">
                <span className="app-logo__grad">Advancia</span>
                <span className="app-logo__sub"> {brandProductLabel}</span>
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="app-nav">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/features"
              className={({ isActive }) =>
                `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
              }
            >
              Features
            </NavLink>
            <NavLink
              to="/payment"
              className={({ isActive }) =>
                `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
              }
            >
              Make Payment
            </NavLink>
            <NavLink
              to="/subscriptions"
              className={({ isActive }) =>
                `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
              }
            >
              Pricing
            </NavLink>
            <NavLink
              to="/faq"
              className={({ isActive }) =>
                `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
              }
            >
              FAQ
            </NavLink>
            <NavLink
              to="/contact"
              className={({ isActive }) =>
                `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
              }
            >
              Contact
            </NavLink>
            {user ? (
              <>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
                  }
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/wallet-balance"
                  className={({ isActive }) =>
                    `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
                  }
                >
                  Balance
                </NavLink>
                <NavLink
                  to="/convert"
                  className={({ isActive }) =>
                    `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
                  }
                >
                  Convert
                </NavLink>
                <NavLink
                  to="/withdraw"
                  className={({ isActive }) =>
                    `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
                  }
                >
                  Withdraw
                </NavLink>
                <NavLink
                  to="/appointments"
                  className={({ isActive }) =>
                    `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
                  }
                >
                  Appointments
                </NavLink>
                <NavLink
                  to="/history"
                  className={({ isActive }) =>
                    `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
                  }
                >
                  History
                </NavLink>
                <NavLink
                  to="/medbed"
                  className={({ isActive }) =>
                    `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
                  }
                >
                  MedBed
                </NavLink>
                <NavLink
                  to="/notifications"
                  className={({ isActive }) =>
                    `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
                  }
                >
                  Notifications
                </NavLink>
                <NavLink
                  to="/security"
                  className={({ isActive }) =>
                    `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
                  }
                >
                  Security
                </NavLink>
                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
                  }
                >
                  Profile
                </NavLink>
                {user.role === 'admin' && (
                  <NavLink
                    to="/admin"
                    className={({ isActive }) =>
                      `app-nav__link app-nav__link--admin${isActive ? ' app-nav__link--active' : ''}`
                    }
                  >
                    ⚙️ Admin
                  </NavLink>
                )}
                <button className="app-nav__logout" onClick={logout}>
                  Log out
                </button>
              </>
            ) : (
              <Link to="/login" className="app-nav__cta">
                Get Started
              </Link>
            )}
          </nav>

          {/* Hamburger (mobile) */}
          <button
            className={`app-hamburger${menuOpen ? ' app-hamburger--open' : ''}`}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div className="app-mobile-nav">
            <NavLink to="/" end className="app-mobile-nav__link" onClick={closeMenu}>
              Home
            </NavLink>
            <NavLink to="/features" className="app-mobile-nav__link" onClick={closeMenu}>
              Features
            </NavLink>
            <NavLink to="/payment" className="app-mobile-nav__link" onClick={closeMenu}>
              Make Payment
            </NavLink>
            <NavLink to="/subscriptions" className="app-mobile-nav__link" onClick={closeMenu}>
              Pricing
            </NavLink>
            <NavLink to="/faq" className="app-mobile-nav__link" onClick={closeMenu}>
              FAQ
            </NavLink>
            <NavLink to="/contact" className="app-mobile-nav__link" onClick={closeMenu}>
              Contact
            </NavLink>
            {user ? (
              <>
                <NavLink to="/dashboard" className="app-mobile-nav__link" onClick={closeMenu}>
                  Dashboard
                </NavLink>
                <NavLink to="/wallet-balance" className="app-mobile-nav__link" onClick={closeMenu}>
                  Balance
                </NavLink>
                <NavLink to="/convert" className="app-mobile-nav__link" onClick={closeMenu}>
                  Convert
                </NavLink>
                <NavLink to="/withdraw" className="app-mobile-nav__link" onClick={closeMenu}>
                  Withdraw
                </NavLink>
                <NavLink to="/appointments" className="app-mobile-nav__link" onClick={closeMenu}>
                  Appointments
                </NavLink>
                <NavLink to="/history" className="app-mobile-nav__link" onClick={closeMenu}>
                  History
                </NavLink>
                <NavLink to="/medbed" className="app-mobile-nav__link" onClick={closeMenu}>
                  MedBed
                </NavLink>
                <NavLink to="/security" className="app-mobile-nav__link" onClick={closeMenu}>
                  Security
                </NavLink>
                <NavLink to="/notifications" className="app-mobile-nav__link" onClick={closeMenu}>
                  Notifications
                </NavLink>
                <NavLink to="/profile" className="app-mobile-nav__link" onClick={closeMenu}>
                  Profile
                </NavLink>
                {user.role === 'admin' && (
                  <NavLink to="/admin" className="app-mobile-nav__link" onClick={closeMenu}>
                    ⚙️ Admin
                  </NavLink>
                )}
                <button
                  className="app-mobile-nav__logout"
                  onClick={() => {
                    logout();
                    closeMenu();
                  }}
                >
                  Log out
                </button>
              </>
            ) : (
              <NavLink to="/login" className="app-mobile-nav__cta" onClick={closeMenu}>
                Get Started →
              </NavLink>
            )}
          </div>
        )}
      </header>

      {/* ── Main ───────────────────────────────────────── */}
      <main className="app-main">
        <Outlet />
      </main>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="app-footer">
        <div className="app-footer__inner">
          <div className="app-footer__brand">
            <svg
              className="app-footer__mark"
              width="30"
              height="30"
              viewBox="0 0 32 32"
              fill="none"
              aria-hidden="true"
            >
              <rect width="32" height="32" rx="9" fill="url(#lg-ftr)" />
              <path
                d="M16 7L24 25H19.5L18 21.5H14L12.5 25H8L16 7ZM16 12.5L14.8 17H17.2L16 12.5Z"
                fill="white"
              />
              <defs>
                <linearGradient
                  id="lg-ftr"
                  x1="0"
                  y1="0"
                  x2="32"
                  y2="32"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#818cf8" />
                  <stop offset="1" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
            </svg>
            <span className="app-footer__name">
              <span className="app-logo__grad">Advancia</span> {brandProductLabel}
            </span>
            <p className="app-footer__tagline">
              {isHealthcare ? (
                <>Healthcare wallet and encrypted health records.</>
              ) : (
                <>
                  Web3-native healthcare payments,
                  <br />
                  HIPAA-compliant &amp; PCI DSS Level 1.
                </>
              )}
            </p>
          </div>

          <div className="app-footer__cols">
            <div className="app-footer__col">
              <p className="app-footer__col-title">Platform</p>
              <Link to="/features" className="app-footer__link">
                Features
              </Link>
              <Link to="/subscriptions" className="app-footer__link">
                Pricing
              </Link>
              <Link to="/wallet-tools" className="app-footer__link">
                Crypto Wallet
              </Link>
              <Link to="/payment" className="app-footer__link">
                Make Payment
              </Link>
            </div>
            <div className="app-footer__col">
              <p className="app-footer__col-title">Support</p>
              <Link to="/faq" className="app-footer__link">
                FAQ
              </Link>
              <Link to="/policy" className="app-footer__link">
                Privacy Policy
              </Link>
              <Link to="/policy#terms" className="app-footer__link">
                Terms of Service
              </Link>
              <a href={`mailto:${supportEmail}`} className="app-footer__link">
                Contact
              </a>
            </div>
            <div className="app-footer__col">
              <p className="app-footer__col-title">Compliance</p>
              <span className="app-footer__badge">🏥 HIPAA</span>
              <span className="app-footer__badge">🌐 GDPR</span>
              <span className="app-footer__badge">🔒 PCI DSS L1</span>
              <span className="app-footer__badge">✅ SOC 2</span>
            </div>
          </div>
        </div>

        <div className="app-footer__bottom">
          <span>&copy; 2026 {copyrightEntity}. All rights reserved.</span>
          <span className="app-footer__bottom-links">
            <Link to="/policy">Privacy</Link>
            <Link to="/policy#terms">Terms</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
