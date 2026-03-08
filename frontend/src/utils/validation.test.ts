import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateUUID,
  validateAmount,
  validateLoginForm,
  validateSignupForm,
  validatePaymentForm,
  getFieldError,
  formatErrors,
} from './validation';

describe('validateEmail', () => {
  it('returns error for empty', () => expect(validateEmail('')).toBe('Email is required'));
  it('returns error for invalid', () => expect(validateEmail('bad')).toBe('Invalid email address'));
  it('returns null for valid', () => expect(validateEmail('a@b.com')).toBeNull());
  it('returns error for too long', () =>
    expect(validateEmail('a'.repeat(256) + '@b.com')).toBe('Email is too long'));
});

describe('validatePassword', () => {
  it('returns error for empty', () => expect(validatePassword('')).toBe('Password is required'));
  it('returns error for short', () => expect(validatePassword('abc1')).toMatch(/at least 8/));
  it('returns error for no letter', () => expect(validatePassword('12345678')).toMatch(/letter/));
  it('returns error for no number', () => expect(validatePassword('abcdefgh')).toMatch(/number/));
  it('returns null for valid', () => expect(validatePassword('password1')).toBeNull());
});

describe('validateUUID', () => {
  it('returns error for empty', () => expect(validateUUID('')).toBe('ID is required'));
  it('returns error for invalid', () =>
    expect(validateUUID('not-a-uuid')).toBe('Invalid ID format'));
  it('returns null for valid', () =>
    expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBeNull());
});

describe('validateAmount', () => {
  it('returns error for 0', () => expect(validateAmount(0)).toMatch(/positive/));
  it('returns error for negative', () => expect(validateAmount(-1)).toMatch(/positive/));
  it('returns error for non-integer', () => expect(validateAmount(10.5)).toMatch(/whole number/));
  it('returns error for too large', () => expect(validateAmount(100000000)).toMatch(/maximum/));
  it('returns null for valid', () => expect(validateAmount(5000)).toBeNull());
});

describe('validateLoginForm', () => {
  it('validates valid login', () => {
    const result = validateLoginForm({ email: 'a@b.com', password: 'pass' });
    expect(result.success).toBe(true);
  });

  it('rejects empty email', () => {
    const result = validateLoginForm({ email: '', password: 'pass' });
    expect(result.success).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'email' })])
    );
  });

  it('rejects empty password', () => {
    const result = validateLoginForm({ email: 'a@b.com', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('validateSignupForm', () => {
  it('validates valid signup', () => {
    const result = validateSignupForm({
      email: 'a@b.com',
      password: 'password1',
      fullName: 'John',
    });
    expect(result.success).toBe(true);
  });

  it('rejects weak password', () => {
    const result = validateSignupForm({ email: 'a@b.com', password: 'short' });
    expect(result.success).toBe(false);
  });

  it('rejects short name', () => {
    const result = validateSignupForm({ email: 'a@b.com', password: 'password1', fullName: 'J' });
    expect(result.success).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'fullName' })])
    );
  });
});

describe('validatePaymentForm', () => {
  it('validates valid payment', () => {
    const result = validatePaymentForm({ amount: 5000 });
    expect(result.success).toBe(true);
  });

  it('rejects invalid currency', () => {
    const result = validatePaymentForm({ amount: 100, currency: 'US' });
    expect(result.success).toBe(false);
  });
});

describe('getFieldError', () => {
  it('returns error for matching field', () => {
    const errors = [{ field: 'email', message: 'Required' }];
    expect(getFieldError(errors, 'email')).toBe('Required');
  });

  it('returns undefined for non-matching field', () => {
    const errors = [{ field: 'email', message: 'Required' }];
    expect(getFieldError(errors, 'password')).toBeUndefined();
  });

  it('returns undefined for undefined errors', () => {
    expect(getFieldError(undefined, 'email')).toBeUndefined();
  });
});

describe('formatErrors', () => {
  it('formats array to record', () => {
    const errors = [
      { field: 'email', message: 'Required' },
      { field: 'password', message: 'Too short' },
    ];
    expect(formatErrors(errors)).toEqual({ email: 'Required', password: 'Too short' });
  });
});
