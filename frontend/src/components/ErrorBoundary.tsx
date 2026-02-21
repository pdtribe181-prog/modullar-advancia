import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Log to analytics if enabled
    if (import.meta.env.VITE_ENABLE_ANALYTICS === 'true') {
      // Future: Send to error tracking service (Sentry, etc.)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <h2 style={styles.title}>Something went wrong</h2>
            <p style={styles.message}>
              We apologize for the inconvenience. Please try refreshing the page.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre style={styles.errorDetail}>
                {this.state.error.message}
              </pre>
            )}
            <div style={styles.actions}>
              <button style={styles.button} onClick={this.handleRetry}>
                Try Again
              </button>
              <button
                style={{ ...styles.button, ...styles.secondaryButton }}
                onClick={() => window.location.href = '/'}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '500px',
    textAlign: 'center',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  title: {
    color: '#dc3545',
    marginBottom: '16px',
    fontSize: '24px',
  },
  message: {
    color: '#666',
    marginBottom: '24px',
    lineHeight: '1.6',
  },
  errorDetail: {
    backgroundColor: '#f8f9fa',
    padding: '12px',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#dc3545',
    textAlign: 'left',
    overflow: 'auto',
    marginBottom: '24px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  button: {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#0066cc',
    color: 'white',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
};

/**
 * HOC to wrap components in an error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> {
  return function ComponentWithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * Simple error fallback component for smaller sections
 */
interface ErrorFallbackProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorFallback({
  message = 'This section failed to load',
  onRetry
}: ErrorFallbackProps) {
  return (
    <div style={{
      backgroundColor: '#fff3cd',
      border: '1px solid #ffc107',
      borderRadius: '8px',
      padding: '16px',
      textAlign: 'center',
    }}>
      <p style={{ color: '#856404', marginBottom: onRetry ? '12px' : '0' }}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: '#ffc107',
            color: '#212529',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
