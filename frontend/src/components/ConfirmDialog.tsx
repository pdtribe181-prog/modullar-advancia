import { useEffect, useCallback, createContext, useContext, useState, ReactNode } from 'react';
import { LoadingButton } from './Spinner';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Focus trap and escape key handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Prevent body scroll when dialog is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, isLoading, onCancel]);

  // Click outside to close
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !isLoading) {
        onCancel();
      }
    },
    [isLoading, onCancel]
  );

  if (!isOpen) return null;

  const variantClass = {
    danger: 'confirm-dialog--danger',
    warning: 'confirm-dialog--warning',
    info: 'confirm-dialog--info',
  }[variant];

  return (
    <div className="confirm-dialog-overlay" onClick={handleBackdropClick}>
      <div
        className={`confirm-dialog ${variantClass}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <h3 id="confirm-dialog-title" className="confirm-dialog-title">
          {title}
        </h3>
        <p id="confirm-dialog-message" className="confirm-dialog-message">
          {message}
        </p>
        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <LoadingButton
            type="button"
            className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            loading={isLoading}
            autoFocus
          >
            {confirmText}
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}

// Context for programmatic confirm dialogs
interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: ((value: boolean) => void) | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    options: { title: '', message: '' },
    resolve: null,
    isLoading: false,
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        options,
        resolve,
        isLoading: false,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    dialogState.resolve?.(true);
    setDialogState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  }, [dialogState.resolve]);

  const handleCancel = useCallback(() => {
    dialogState.resolve?.(false);
    setDialogState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  }, [dialogState.resolve]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog
        isOpen={dialogState.isOpen}
        title={dialogState.options.title}
        message={dialogState.options.message}
        confirmText={dialogState.options.confirmText}
        cancelText={dialogState.options.cancelText}
        variant={dialogState.options.variant}
        isLoading={dialogState.isLoading}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
}
