import React, { forwardRef, InputHTMLAttributes, useState, useId } from 'react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  showPasswordToggle?: boolean;
  inputClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hint,
      error,
      leftIcon,
      rightIcon,
      onRightIconClick,
      size = 'md',
      fullWidth = true,
      showPasswordToggle = false,
      className = '',
      inputClassName = '',
      type = 'text',
      id,
      required,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';

    const sizeClasses = {
      sm: 'input-sm',
      md: '',
      lg: 'input-lg',
    };

    const inputType = isPassword && showPassword ? 'text' : type;

    const hasError = !!error;
    const hasLeftIcon = !!leftIcon;
    const hasRightIcon = !!rightIcon || (isPassword && showPasswordToggle);

    return (
      <div
        className={`form-group ${hasError ? 'has-error' : ''} ${fullWidth ? '' : 'inline-block'} ${className}`}
      >
        {label && (
          <label htmlFor={inputId}>
            {label}
            {required && <span className="required">*</span>}
          </label>
        )}

        <div className={`${hasLeftIcon || hasRightIcon ? 'input-icon-wrapper' : ''}`}>
          {hasLeftIcon && <span className="input-icon">{leftIcon}</span>}

          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={`
              ${sizeClasses[size]}
              ${hasLeftIcon ? 'has-icon-left' : ''}
              ${hasRightIcon ? 'has-icon-right' : ''}
              ${hasError ? 'is-invalid' : ''}
              ${inputClassName}
            `.trim()}
            disabled={disabled}
            required={required}
            aria-invalid={hasError}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />

          {isPassword && showPasswordToggle && (
            <button
              type="button"
              className="input-icon-right"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          )}

          {rightIcon && !isPassword && (
            <span
              className={`input-icon-right ${onRightIconClick ? 'clickable' : ''}`}
              onClick={onRightIconClick}
              role={onRightIconClick ? 'button' : undefined}
              tabIndex={onRightIconClick ? 0 : undefined}
            >
              {rightIcon}
            </span>
          )}
        </div>

        {error && (
          <span id={`${inputId}-error`} className="field-error" role="alert">
            {error}
          </span>
        )}

        {hint && !error && (
          <span id={`${inputId}-hint`} className="form-hint">
            {hint}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
