interface SpinnerProps {
  /** Size in pixels (default: 24) */
  size?: number;
  /** CSS color (default: currentColor) */
  color?: string;
  /** Additional CSS classes */
  className?: string;
  /** Accessible label for screen readers */
  label?: string;
}

/**
 * Animated loading spinner component
 */
export function Spinner({ 
  size = 24, 
  color = 'currentColor', 
  className = '',
  label = 'Loading...'
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`spinner ${className}`}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderWidth: Math.max(2, size / 8),
        borderStyle: 'solid',
        borderColor: color,
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  );
}

/**
 * Full-page loading overlay
 */
export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="loading-overlay" role="status" aria-busy="true">
      <div className="loading-content">
        <Spinner size={48} />
        <p>{message}</p>
      </div>
    </div>
  );
}

/**
 * Button with built-in loading state
 */
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export function LoadingButton({ 
  loading = false, 
  loadingText,
  children, 
  disabled,
  ...props 
}: LoadingButtonProps) {
  return (
    <button {...props} disabled={disabled || loading}>
      {loading ? (
        <>
          <Spinner size={16} className="button-spinner" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
