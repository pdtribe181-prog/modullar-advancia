/**
 * Frontend form validation utilities
 * Mirrors backend Zod schemas for consistent validation
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult<T = Record<string, unknown>> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

// Email regex pattern
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password requirements
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_LETTER_REGEX = /[A-Za-z]/;
const PASSWORD_NUMBER_REGEX = /[0-9]/;

// UUID v4 pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate email format
 */
export function validateEmail(email: string): string | null {
  if (!email) return 'Email is required';
  if (!EMAIL_REGEX.test(email)) return 'Invalid email address';
  if (email.length > 255) return 'Email is too long';
  return null;
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (password.length > 128) return 'Password is too long';
  if (!PASSWORD_LETTER_REGEX.test(password)) {
    return 'Password must contain at least one letter';
  }
  if (!PASSWORD_NUMBER_REGEX.test(password)) {
    return 'Password must contain at least one number';
  }
  return null;
}

/**
 * Validate UUID format
 */
export function validateUUID(id: string): string | null {
  if (!id) return 'ID is required';
  if (!UUID_REGEX.test(id)) return 'Invalid ID format';
  return null;
}

/**
 * Validate payment amount (in cents)
 */
export function validateAmount(amount: number): string | null {
  if (amount === undefined || amount === null) return 'Amount is required';
  if (!Number.isInteger(amount)) return 'Amount must be a whole number';
  if (amount <= 0) return 'Amount must be positive';
  if (amount > 99999999) return 'Amount exceeds maximum limit';
  return null;
}

/**
 * Validate login form data
 */
export function validateLoginForm(data: { email: string; password: string }): ValidationResult {
  const errors: ValidationError[] = [];
  
  const emailError = validateEmail(data.email);
  if (emailError) errors.push({ field: 'email', message: emailError });
  
  if (!data.password) {
    errors.push({ field: 'password', message: 'Password is required' });
  }
  
  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Validate signup form data
 */
export function validateSignupForm(data: {
  email: string;
  password: string;
  fullName?: string;
}): ValidationResult {
  const errors: ValidationError[] = [];
  
  const emailError = validateEmail(data.email);
  if (emailError) errors.push({ field: 'email', message: emailError });
  
  const passwordError = validatePassword(data.password);
  if (passwordError) errors.push({ field: 'password', message: passwordError });
  
  if (data.fullName !== undefined) {
    if (data.fullName.length < 2) {
      errors.push({ field: 'fullName', message: 'Name must be at least 2 characters' });
    } else if (data.fullName.length > 100) {
      errors.push({ field: 'fullName', message: 'Name is too long' });
    }
  }
  
  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Validate payment form data
 */
export function validatePaymentForm(data: {
  amount: number;
  currency?: string;
  description?: string;
}): ValidationResult {
  const errors: ValidationError[] = [];
  
  const amountError = validateAmount(data.amount);
  if (amountError) errors.push({ field: 'amount', message: amountError });
  
  if (data.currency !== undefined && data.currency.length !== 3) {
    errors.push({ field: 'currency', message: 'Currency must be a 3-letter code' });
  }
  
  if (data.description !== undefined && data.description.length > 500) {
    errors.push({ field: 'description', message: 'Description is too long' });
  }
  
  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Format validation errors for display
 */
export function formatErrors(errors: ValidationError[]): Record<string, string> {
  return errors.reduce((acc, err) => {
    acc[err.field] = err.message;
    return acc;
  }, {} as Record<string, string>);
}

/**
 * Get first error message for a field
 */
export function getFieldError(errors: ValidationError[] | undefined, field: string): string | undefined {
  return errors?.find(e => e.field === field)?.message;
}
