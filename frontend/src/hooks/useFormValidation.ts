import { useState, useCallback, useMemo, ChangeEvent, FormEvent } from 'react';

/**
 * Validation rule for a form field
 */
export interface ValidationRule<T> {
  /** Validation function - returns error message or null/undefined if valid */
  validate: (value: T, allValues: Record<string, unknown>) => string | null | undefined;
  /** When to run validation: 'change' | 'blur' | 'submit' (default: 'change') */
  trigger?: 'change' | 'blur' | 'submit';
}

/**
 * Field configuration with validation rules
 */
export interface FieldConfig<T = string> {
  initialValue: T;
  rules?: ValidationRule<T>[];
}

/**
 * Form field state
 */
export interface FieldState<T = string> {
  value: T;
  error: string | null;
  touched: boolean;
  dirty: boolean;
}

/**
 * Form state returned by useFormValidation
 */
export interface FormState<T extends Record<string, unknown>> {
  values: T;
  errors: Partial<Record<keyof T, string | null>>;
  touched: Partial<Record<keyof T, boolean>>;
  isDirty: boolean;
  isValid: boolean;
  isSubmitting: boolean;
}

/**
 * Form field helpers for rendering
 */
export interface FieldHelpers<T = string> {
  value: T;
  error: string | null;
  touched: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onBlur: () => void;
  setValue: (value: T) => void;
  setTouched: (touched: boolean) => void;
  reset: () => void;
}

/**
 * Form helpers returned by useFormValidation
 */
export interface FormHelpers<T extends Record<string, unknown>> {
  /** Current form state */
  state: FormState<T>;
  /** Get helpers for a specific field */
  getField: <K extends keyof T>(name: K) => FieldHelpers<T[K]>;
  /** Set a specific field value */
  setValue: <K extends keyof T>(name: K, value: T[K]) => void;
  /** Set multiple values at once */
  setValues: (values: Partial<T>) => void;
  /** Clear all errors */
  clearErrors: () => void;
  /** Set a specific field error */
  setError: <K extends keyof T>(name: K, error: string | null) => void;
  /** Validate specific fields or all fields */
  validate: (fields?: (keyof T)[]) => boolean;
  /** Reset form to initial values */
  reset: () => void;
  /** Handle form submission */
  handleSubmit: (onSubmit: (values: T) => void | Promise<void>) => (e: FormEvent) => Promise<void>;
}

/**
 * Custom hook for form validation and state management
 * 
 * @example
 * const form = useFormValidation({
 *   email: { initialValue: '', rules: [{ validate: v => !v ? 'Required' : null }] },
 *   password: { initialValue: '', rules: [{ validate: v => v.length < 8 ? 'Min 8 chars' : null }] }
 * });
 * 
 * <input {...form.getField('email')} />
 * {form.state.errors.email && <span>{form.state.errors.email}</span>}
 */
export function useFormValidation<T extends Record<string, unknown>>(
  config: { [K in keyof T]: FieldConfig<T[K]> }
): FormHelpers<T> {
  // Extract initial values from config
  const initialValues = useMemo(() => {
    const values: Partial<T> = {};
    for (const key in config) {
      values[key] = config[key].initialValue as T[typeof key];
    }
    return values as T;
  }, []);

  // Form state
  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string | null>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate a single field
  const validateField = useCallback(
    <K extends keyof T>(name: K, value: T[K], trigger: 'change' | 'blur' | 'submit' = 'change'): string | null => {
      const fieldConfig = config[name];
      if (!fieldConfig.rules) return null;

      for (const rule of fieldConfig.rules) {
        const ruleTrigger = rule.trigger || 'change';
        // Skip rules that don't match the current trigger
        if (trigger === 'change' && ruleTrigger !== 'change') continue;
        if (trigger === 'blur' && ruleTrigger === 'submit') continue;

        const error = rule.validate(value, values as Record<string, unknown>);
        if (error) return error;
      }
      return null;
    },
    [config, values]
  );

  // Validate multiple fields
  const validate = useCallback(
    (fields?: (keyof T)[]): boolean => {
      const fieldsToValidate = fields || (Object.keys(config) as (keyof T)[]);
      const newErrors: Partial<Record<keyof T, string | null>> = {};
      let isValid = true;

      for (const field of fieldsToValidate) {
        const error = validateField(field, values[field], 'submit');
        newErrors[field] = error;
        if (error) isValid = false;
      }

      setErrors((prev) => ({ ...prev, ...newErrors }));
      return isValid;
    },
    [config, values, validateField]
  );

  // Set a single value
  const setValue = useCallback(
    <K extends keyof T>(name: K, value: T[K]) => {
      setValuesState((prev) => ({ ...prev, [name]: value }));
      const error = validateField(name, value, 'change');
      setErrors((prev) => ({ ...prev, [name]: error }));
    },
    [validateField]
  );

  // Set multiple values
  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState((prev) => ({ ...prev, ...newValues }));
  }, []);

  // Set a single error
  const setError = useCallback(<K extends keyof T>(name: K, error: string | null) => {
    setErrors((prev) => ({ ...prev, [name]: error }));
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Reset form
  const reset = useCallback(() => {
    setValuesState(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Get field helpers
  const getField = useCallback(
    <K extends keyof T>(name: K): FieldHelpers<T[K]> => ({
      value: values[name],
      error: errors[name] ?? null,
      touched: touched[name] ?? false,
      onChange: (e) => {
        const newValue = e.target.value as T[K];
        setValue(name, newValue);
        setTouched((prev) => ({ ...prev, [name]: true }));
      },
      onBlur: () => {
        setTouched((prev) => ({ ...prev, [name]: true }));
        const error = validateField(name, values[name], 'blur');
        setErrors((prev) => ({ ...prev, [name]: error }));
      },
      setValue: (value: T[K]) => setValue(name, value),
      setTouched: (isTouched: boolean) => setTouched((prev) => ({ ...prev, [name]: isTouched })),
      reset: () => {
        setValuesState((prev) => ({ ...prev, [name]: config[name].initialValue }));
        setErrors((prev) => ({ ...prev, [name]: null }));
        setTouched((prev) => ({ ...prev, [name]: false }));
      },
    }),
    [values, errors, touched, setValue, validateField, config]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    (onSubmit: (values: T) => void | Promise<void>) =>
      async (e: FormEvent) => {
        e.preventDefault();
        
        // Touch all fields
        const allTouched: Partial<Record<keyof T, boolean>> = {};
        for (const key in config) {
          allTouched[key] = true;
        }
        setTouched(allTouched);

        // Validate all fields
        if (!validate()) return;

        setIsSubmitting(true);
        try {
          await onSubmit(values);
        } finally {
          setIsSubmitting(false);
        }
      },
    [config, validate, values]
  );

  // Compute derived state
  const isDirty = useMemo(() => {
    for (const key in config) {
      if (values[key] !== config[key].initialValue) return true;
    }
    return false;
  }, [config, values]);

  const isValid = useMemo(() => {
    for (const key in errors) {
      if (errors[key]) return false;
    }
    return true;
  }, [errors]);

  // Form state
  const state: FormState<T> = {
    values,
    errors,
    touched,
    isDirty,
    isValid,
    isSubmitting,
  };

  return {
    state,
    getField,
    setValue,
    setValues,
    clearErrors,
    setError,
    validate,
    reset,
    handleSubmit,
  };
}

// ============================================
// Common validation rules
// ============================================

export const rules = {
  required: (message = 'This field is required'): ValidationRule<string> => ({
    validate: (value) => (!value || !value.trim() ? message : null),
  }),

  email: (message = 'Invalid email address'): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return null; // Use required rule for empty check
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value) ? null : message;
    },
  }),

  minLength: (min: number, message?: string): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return null;
      return value.length >= min ? null : message || `Must be at least ${min} characters`;
    },
  }),

  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return null;
      return value.length <= max ? null : message || `Must be at most ${max} characters`;
    },
  }),

  pattern: (regex: RegExp, message: string): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return null;
      return regex.test(value) ? null : message;
    },
  }),

  matches: (
    fieldName: string,
    message = 'Fields do not match'
  ): ValidationRule<string> => ({
    validate: (value, allValues) => {
      if (!value) return null;
      return value === allValues[fieldName] ? null : message;
    },
  }),

  min: (min: number, message?: string): ValidationRule<number> => ({
    validate: (value) => {
      return value >= min ? null : message || `Must be at least ${min}`;
    },
  }),

  max: (max: number, message?: string): ValidationRule<number> => ({
    validate: (value) => {
      return value <= max ? null : message || `Must be at most ${max}`;
    },
  }),

  phone: (message = 'Invalid phone number'): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return null;
      const phoneRegex = /^\+?[\d\s-()]{10,}$/;
      return phoneRegex.test(value) ? null : message;
    },
  }),

  url: (message = 'Invalid URL'): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return null;
      try {
        new URL(value);
        return null;
      } catch {
        return message;
      }
    },
  }),
};
