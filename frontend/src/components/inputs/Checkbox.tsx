import React, { forwardRef, InputHTMLAttributes, useId } from 'react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  hint?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, hint, error, className = '', id, disabled, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const hasError = !!error;

    return (
      <div className={`${hasError ? 'has-error' : ''} ${className}`}>
        <label htmlFor={inputId} className={`checkbox-wrapper ${disabled ? 'disabled' : ''}`}>
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          <span className="checkbox-custom" />
          {label && <span className="checkbox-label">{label}</span>}
        </label>

        {error && (
          <span id={`${inputId}-error`} className="field-error" role="alert" style={{ marginLeft: '32px' }}>
            {error}
          </span>
        )}

        {hint && !error && (
          <span id={`${inputId}-hint`} className="form-hint" style={{ marginLeft: '32px' }}>
            {hint}
          </span>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
