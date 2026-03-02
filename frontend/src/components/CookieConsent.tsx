import React, { useState, useEffect } from 'react';
import '../styles.css';

type Prefs = { analytics: boolean; preferences: boolean; marketing: boolean };
const STORAGE_KEY = 'adv_cookie_consent';

const CATEGORIES = [
  {
    key: 'necessary' as const,
    label: 'Strictly Necessary',
    desc: 'Required for session auth, CSRF protection, and core functionality. Cannot be disabled.',
    locked: true,
  },
  {
    key: 'analytics' as const,
    label: 'Analytics',
    desc: 'Helps us understand which features are used (Sentry, internal metrics). No health data is included.',
    locked: false,
  },
  {
    key: 'preferences' as const,
    label: 'Preferences',
    desc: 'Remembers your language, theme, and notification settings across sessions.',
    locked: false,
  },
  {
    key: 'marketing' as const,
    label: 'Marketing',
    desc: 'Ad conversion tracking. Only activated with your explicit opt-in.',
    locked: false,
  },
];

export const OPEN_COOKIE_PREFS_EVENT = 'adv-open-cookie-prefs';

export const CookieConsent: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({
    analytics: true,
    preferences: true,
    marketing: false,
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setVisible(true);
    } else {
      try {
        const parsed = JSON.parse(stored) as Prefs & { savedAt?: number };
        if (parsed.analytics !== undefined)
          setPrefs((p) => ({ ...p, analytics: parsed.analytics }));
        if (parsed.preferences !== undefined)
          setPrefs((p) => ({ ...p, preferences: parsed.preferences }));
        if (parsed.marketing !== undefined)
          setPrefs((p) => ({ ...p, marketing: parsed.marketing }));
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    const onOpen = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Prefs & { savedAt?: number };
          setPrefs({
            analytics: parsed.analytics ?? true,
            preferences: parsed.preferences ?? true,
            marketing: parsed.marketing ?? false,
          });
        } catch {
          /* ignore */
        }
      }
      setVisible(true);
      setExpanded(true);
    };
    window.addEventListener(OPEN_COOKIE_PREFS_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_COOKIE_PREFS_EVENT, onOpen);
  }, []);

  const save = (override?: Partial<Prefs>) => {
    const final = { ...prefs, ...override };
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ necessary: true, ...final, savedAt: Date.now() })
    );
    setVisible(false);
  };

  const toggle = (key: keyof Prefs) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  if (!visible) return null;

  return (
    <div className="ck-banner" role="dialog" aria-label="Cookie consent">
      <div className="ck-banner__inner">
        <div className="ck-banner__left">
          <span className="ck-banner__cookie">🍪</span>
          <div className="ck-banner__text">
            <strong>We use cookies</strong>
            <p>
              We use cookies to keep you logged in, secure payments, and improve your experience.
              You control what optional cookies we set.{' '}
              <a href="/policy#cookies" className="ck-link">
                Learn more
              </a>
            </p>
          </div>
        </div>

        <div className="ck-banner__actions">
          <button className="ck-btn ck-btn--ghost" onClick={() => setExpanded((e) => !e)}>
            {expanded ? 'Hide settings' : 'Customise'}
          </button>
          <button
            className="ck-btn ck-btn--outline"
            onClick={() => save({ analytics: false, preferences: false, marketing: false })}
          >
            Reject optional
          </button>
          <button
            className="ck-btn ck-btn--accept"
            onClick={() => save({ analytics: true, preferences: true, marketing: false })}
          >
            Accept all
          </button>
        </div>
      </div>

      {expanded && (
        <div className="ck-prefs">
          <p className="ck-prefs__intro">
            Manage which cookies are active. Necessary cookies cannot be disabled.
          </p>
          {CATEGORIES.map((cat) => {
            const value = cat.key === 'necessary' ? true : prefs[cat.key as keyof Prefs];
            return (
              <div key={cat.key} className="ck-pref-row">
                <div className="ck-pref-row__info">
                  <strong>{cat.label}</strong>
                  <span>{cat.desc}</span>
                </div>
                <button
                  className={`ck-toggle${value ? ' ck-toggle--on' : ''}${cat.locked ? ' ck-toggle--locked' : ''}`}
                  disabled={cat.locked}
                  aria-pressed={value}
                  aria-label={`${cat.locked ? 'Always on' : value ? 'Disable' : 'Enable'} ${cat.label}`}
                  onClick={() => !cat.locked && toggle(cat.key as keyof Prefs)}
                >
                  <span className="ck-toggle__knob" />
                </button>
              </div>
            );
          })}
          <div className="ck-prefs__footer">
            <button className="ck-btn ck-btn--accept" onClick={() => save()}>
              Save my preferences
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
