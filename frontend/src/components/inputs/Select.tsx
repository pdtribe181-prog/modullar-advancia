import { forwardRef, SelectHTMLAttributes, useId } from 'react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  selectClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      hint,
      error,
      options,
      placeholder,
      size = 'md',
      fullWidth = true,
      className = '',
      selectClassName = '',
      id,
      required,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;

    const sizeClasses = {
      sm: 'input-sm',
      md: '',
      lg: 'input-lg',
    };

    const hasError = !!error;

    return (
      <div
        className={`form-group ${hasError ? 'has-error' : ''} ${fullWidth ? '' : 'inline-block'} ${className}`}
      >
        {label && (
          <label htmlFor={selectId}>
            {label}
            {required && <span className="required">*</span>}
          </label>
        )}

        <div className="select-wrapper">
          <select
            ref={ref}
            id={selectId}
            className={`
              ${sizeClasses[size]}
              ${hasError ? 'is-invalid' : ''}
              ${selectClassName}
            `.trim()}
            disabled={disabled}
            required={required}
            aria-invalid={hasError}
            aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <span id={`${selectId}-error`} className="field-error" role="alert">
            {error}
          </span>
        )}

        {hint && !error && (
          <span id={`${selectId}-hint`} className="form-hint">
            {hint}
          </span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
