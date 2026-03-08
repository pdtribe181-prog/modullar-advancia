import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormValidation, rules } from './useFormValidation';

describe('useFormValidation', () => {
  it('initializes with provided values', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        email: { initialValue: 'test@example.com', rules: [] },
        name: { initialValue: 'John', rules: [] },
      })
    );
    expect(result.current.state.values.email).toBe('test@example.com');
    expect(result.current.state.values.name).toBe('John');
  });

  it('starts as not dirty', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        name: { initialValue: '', rules: [] },
      })
    );
    expect(result.current.state.isDirty).toBe(false);
  });

  it('becomes dirty after setValue', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        name: { initialValue: '', rules: [] },
      })
    );
    act(() => result.current.setValue('name', 'Alice'));
    expect(result.current.state.isDirty).toBe(true);
    expect(result.current.state.values.name).toBe('Alice');
  });

  it('validates required field', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        email: { initialValue: '', rules: [rules.required()] },
      })
    );
    act(() => {
      result.current.validate();
    });
    expect(result.current.state.errors.email).toBe('This field is required');
    expect(result.current.state.isValid).toBe(false);
  });

  it('validates email format', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        email: { initialValue: 'bad', rules: [rules.email()] },
      })
    );
    act(() => {
      result.current.validate();
    });
    expect(result.current.state.errors.email).toBe('Invalid email address');
  });

  it('passes for valid email', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        email: { initialValue: 'a@b.com', rules: [rules.email()] },
      })
    );
    act(() => {
      result.current.validate();
    });
    expect(result.current.state.errors.email).toBeNull();
    expect(result.current.state.isValid).toBe(true);
  });

  it('validates minLength', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        password: { initialValue: 'abc', rules: [rules.minLength(8)] },
      })
    );
    act(() => result.current.validate());
    expect(result.current.state.errors.password).toBe('Must be at least 8 characters');
  });

  it('validates maxLength', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        code: { initialValue: '123456', rules: [rules.maxLength(4)] },
      })
    );
    act(() => result.current.validate());
    expect(result.current.state.errors.code).toBe('Must be at most 4 characters');
  });

  it('resets form to initial values', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        name: { initialValue: '', rules: [rules.required()] },
      })
    );
    act(() => result.current.setValue('name', 'Alice'));
    expect(result.current.state.values.name).toBe('Alice');

    act(() => result.current.reset());
    expect(result.current.state.values.name).toBe('');
    expect(result.current.state.isDirty).toBe(false);
  });

  it('clearErrors removes all errors', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        email: { initialValue: '', rules: [rules.required()] },
      })
    );
    act(() => result.current.validate());
    expect(result.current.state.errors.email).toBeTruthy();

    act(() => result.current.clearErrors());
    expect(result.current.state.errors.email).toBeUndefined();
  });

  it('setError sets a manual error', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        email: { initialValue: 'a@b.com', rules: [] },
      })
    );
    act(() => result.current.setError('email', 'Already taken'));
    expect(result.current.state.errors.email).toBe('Already taken');
    expect(result.current.state.isValid).toBe(false);
  });

  it('setValues updates multiple fields', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        first: { initialValue: '', rules: [] },
        last: { initialValue: '', rules: [] },
      })
    );
    act(() => result.current.setValues({ first: 'John', last: 'Doe' }));
    expect(result.current.state.values.first).toBe('John');
    expect(result.current.state.values.last).toBe('Doe');
  });

  it('getField returns field helpers', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        name: { initialValue: 'test', rules: [] },
      })
    );
    const field = result.current.getField('name');
    expect(field.value).toBe('test');
    expect(field.error).toBeNull();
    expect(field.touched).toBe(false);
    expect(typeof field.onChange).toBe('function');
    expect(typeof field.onBlur).toBe('function');
  });
});

describe('rules', () => {
  it('required rejects empty/whitespace', () => {
    const rule = rules.required();
    expect(rule.validate('', {})).toBe('This field is required');
    expect(rule.validate('   ', {})).toBe('This field is required');
    expect(rule.validate('hello', {})).toBeNull();
  });

  it('email validates format', () => {
    const rule = rules.email();
    expect(rule.validate('', {})).toBeNull(); // empty is ok (use required for that)
    expect(rule.validate('bad', {})).toBe('Invalid email address');
    expect(rule.validate('a@b.com', {})).toBeNull();
  });

  it('pattern validates regex', () => {
    const rule = rules.pattern(/^\d+$/, 'Numbers only');
    expect(rule.validate('123', {})).toBeNull();
    expect(rule.validate('abc', {})).toBe('Numbers only');
  });

  it('matches compares fields', () => {
    const rule = rules.matches('password');
    expect(rule.validate('abc', { password: 'abc' })).toBeNull();
    expect(rule.validate('abc', { password: 'xyz' })).toBe('Fields do not match');
  });

  it('phone validates format', () => {
    const rule = rules.phone();
    expect(rule.validate('+1 234 567 8900', {})).toBeNull();
    expect(rule.validate('123', {})).toBe('Invalid phone number');
  });
});
