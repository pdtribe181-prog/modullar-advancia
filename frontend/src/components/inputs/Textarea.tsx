import { forwardRef, TextareaHTMLAttributes, useId, useRef, useEffect, useCallback, ChangeEvent, RefObject } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  autoResize?: boolean;
  maxLength?: number;
  showCharCount?: boolean;
  fullWidth?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      hint,
      error,
      autoResize = false,
      maxLength,
      showCharCount = false,
      fullWidth = true,
      className = '',
      id,
      required,
      disabled,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const textareaId = id || generatedId;
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref as RefObject<HTMLTextAreaElement>) || internalRef;

    const hasError = !!error;
    const currentLength = typeof value === 'string' ? value.length : 0;

    const adjustHeight = useCallback(() => {
      const textarea = textareaRef.current;
      if (textarea && autoResize) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    }, [autoResize, textareaRef]);

    useEffect(() => {
      adjustHeight();
    }, [value, adjustHeight]);

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e);
      if (autoResize) {
        adjustHeight();
      }
    };

    const getCharCountClass = () => {
      if (!maxLength) return '';
      const ratio = currentLength / maxLength;
      if (ratio >= 1) return 'error';
      if (ratio >= 0.9) return 'warning';
      return '';
    };

    return (
      <div
        className={`form-group ${hasError ? 'has-error' : ''} ${fullWidth ? '' : 'inline-block'} ${className}`}
      >
        {label && (
          <label htmlFor={textareaId}>
            {label}
            {required && <span className="required">*</span>}
          </label>
        )}

        <textarea
          ref={textareaRef}
          id={textareaId}
          className={`${autoResize ? 'auto-resize' : ''} ${hasError ? 'is-invalid' : ''}`}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          value={value}
          onChange={handleChange}
          aria-invalid={hasError}
          aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
          {...props}
        />

        <div style={{ display: 'flex', justifyContent: showCharCount && maxLength ? 'space-between' : 'flex-start', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            {error && (
              <span id={`${textareaId}-error`} className="field-error" role="alert">
                {error}
              </span>
            )}

            {hint && !error && (
              <span id={`${textareaId}-hint`} className="form-hint">
                {hint}
              </span>
            )}
          </div>

          {showCharCount && maxLength && (
            <span className={`char-counter ${getCharCountClass()}`}>
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
