import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { StripeProvider } from './providers/StripeProvider';
import { AuthProvider } from './providers/AuthProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmDialog';
import { initSentry, SentryErrorBoundary } from './lib/sentry';
import './styles.css';

// Initialize Sentry before rendering
initSentry({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SentryErrorBoundary fallback={<ErrorBoundary><div /></ErrorBoundary>}>
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <StripeProvider>
              <ToastProvider>
                <ConfirmProvider>
                  <App />
                </ConfirmProvider>
              </ToastProvider>
            </StripeProvider>
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </SentryErrorBoundary>
  </React.StrictMode>
);
