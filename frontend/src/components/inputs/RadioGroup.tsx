import React, { forwardRef, InputHTMLAttributes, useId } from 'react';

export interface RadioOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  hint?: string;
  error?: string;
  direction?: 'horizontal' | 'vertical';
  className?: string;
  disabled?: boolean;
}

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, className = '', id, disabled, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <label htmlFor={inputId} className={`radio-wrapper ${disabled ? 'disabled' : ''} ${className}`}>
        <input ref={ref} type="radio" id={inputId} disabled={disabled} {...props} />
        <span className="radio-custom" />
        {label && <span className="radio-label">{label}</span>}
      </label>
    );
  }
);

Radio.displayName = 'Radio';

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  options,
  value,
  onChange,
  label,
  hint,
  error,
  direction = 'vertical',
  className = '',
  disabled,
}) => {
  const groupId = useId();
  const hasError = !!error;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  return (
    <div className={`form-group ${hasError ? 'has-error' : ''} ${className}`} role="radiogroup" aria-labelledby={`${groupId}-label`}>
      {label && (
        <span id={`${groupId}-label`} className="form-label" style={{ display: 'block', marginBottom: '12px', fontSize: '0.875rem', fontWeight: 500 }}>
          {label}
        </span>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: direction === 'horizontal' ? 'row' : 'column',
          gap: direction === 'horizontal' ? '24px' : '12px',
        }}
      >
        {options.map((option) => (
          <Radio
            key={option.value}
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={handleChange}
            label={option.label}
            disabled={disabled || option.disabled}
          />
        ))}
      </div>

      {error && (
        <span className="field-error" role="alert" style={{ marginTop: '8px' }}>
          {error}
        </span>
      )}

      {hint && !error && (
        <span className="form-hint" style={{ marginTop: '8px' }}>
          {hint}
        </span>
      )}
    </div>
  );
};

export default RadioGroup;
