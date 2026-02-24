import React, { forwardRef, InputHTMLAttributes, useId } from 'react';

export interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  hint?: string;
  labelPosition?: 'left' | 'right';
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ label, hint, labelPosition = 'right', className = '', id, disabled, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className={className}>
        <label htmlFor={inputId} className={`toggle-switch ${disabled ? 'disabled' : ''}`}>
          {labelPosition === 'left' && label && <span className="toggle-label">{label}</span>}
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            disabled={disabled}
            aria-describedby={hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          <span className="toggle-track" />
          {labelPosition === 'right' && label && <span className="toggle-label">{label}</span>}
        </label>

        {hint && (
          <span id={`${inputId}-hint`} className="form-hint" style={{ marginLeft: labelPosition === 'right' ? '60px' : '0' }}>
            {hint}
          </span>
        )}
      </div>
    );
  }
);

Toggle.displayName = 'Toggle';

export default Toggle;
